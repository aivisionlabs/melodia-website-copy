import { VertexAI, GenerateContentRequest, HarmCategory, HarmBlockThreshold } from '@google-cloud/vertexai';
import { jsonrepair } from 'jsonrepair';
import { traceable } from 'langsmith/traceable';
import { CredentialsManager } from '../ai/credentials-manager';
import { isDemoModeEnabled } from '@/lib/demo-mode';
import { logger } from '@/lib/logger';

// =============================================================================
// Configuration
// =============================================================================

const VERTEX_AI_TIMEOUT_MS = process.env.VERTEX_AI_TIMEOUT_MS
  ? parseInt(process.env.VERTEX_AI_TIMEOUT_MS, 10)
  : 5 * 60 * 1000; // 5 minutes

export const LLM_CONFIG = {
  modelName: process.env.GOOGLE_VERTEX_MODEL || 'gemini-2.5-flash',
  reviewModelName: process.env.GOOGLE_VERTEX_REVIEW_MODEL || 'gemini-2.5-flash',
  generation: {
    temperature_attempt1: 1.0,
    temperature_attempt2: 0.7,
    maxOutputTokens: 4000,
  },
  refinement: {
    temperature: 1.0,
    maxOutputTokens: 4000,
  },
  contextAnalysis: {
    temperature_attempt1: 1.0,
    temperature_attempt2: 0.7,
    maxOutputTokens: 2000,
  },
  musicStyle: {
    temperature_attempt1: 1.0,
    temperature_attempt2: 0.7,
    maxOutputTokens: 1000,
  },
  transliteration: {
    // flash gives significantly better Indian-script accuracy than flash-lite for name transliteration.
    // Override via GOOGLE_VERTEX_TRANSLITERATION_MODEL if needed.
    modelName: process.env.GOOGLE_VERTEX_TRANSLITERATION_MODEL || 'gemini-2.5-flash',
    temperature_attempt1: 0.7,
    temperature_attempt2: 0.8,
    temperature_attempt3: 1.0,
    // Flash thinking uses far fewer tokens (~500-800) vs Pro (~3800). 8192 comfortably covers
    // thinking + ~1500 tokens of lyrics output for the 2500 char user input ceiling.
    maxOutputTokens: 8192,
  },
  nameToScript: {
    modelName: process.env.GOOGLE_VERTEX_NAME_TO_SCRIPT_MODEL || 'gemini-2.5-flash',
    temperature: 0.7,
    maxOutputTokens: 128,
  },
  templateLyrics: {
    temperature: 0.7,
    maxOutputTokens: 4096,
  },
  /** Tags / listing copy only — cheap model, separate from main lyrics model */
  metadataEnrichment: {
    modelName: process.env.GOOGLE_VERTEX_METADATA_MODEL || 'gemini-2.5-flash',
    temperature: 0.4,
    maxOutputTokens: 1024,
  },
  /** Manual-review RJ narration cleanup before ElevenLabs TTS */
  rjTtsPreprocess: {
    modelName: process.env.GOOGLE_VERTEX_RJ_TTS_PREPROCESS_MODEL || 'gemini-2.5-flash',
  },
};

// =============================================================================
// Vertex AI Initialization
// =============================================================================

export function initializeVertexAI(): VertexAI {
  const project = process.env.GOOGLE_CLOUD_PROJECT_ID;
  const location = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1';

  if (!project) {
    throw new Error('GOOGLE_CLOUD_PROJECT_ID environment variable is required');
  }

  const creds = CredentialsManager.getGCSCredentialsFromEnv();
  const keyFilename = process.env.GOOGLE_APPLICATION_CREDENTIALS;

  const hasInlineCreds = Boolean(creds?.client_email && creds?.private_key);

  let googleAuthOptions: { credentials: { client_email: string; private_key: string } } | { keyFilename: string } | undefined;

  if (hasInlineCreds && creds) {
    googleAuthOptions = {
      credentials: {
        client_email: creds.client_email,
        private_key: creds.private_key.replace(/\\n/g, '\n'),
      },
    };
    logger.debug('Vertex AI using credentials from GCS_CREDENTIALS_JSON');
  } else if (keyFilename) {
    googleAuthOptions = { keyFilename };
    logger.debug('Vertex AI using credentials from GOOGLE_APPLICATION_CREDENTIALS', { keyFilename });
  } else {
    logger.debug(
      'Vertex AI using Application Default Credentials (no GCS_CREDENTIALS_JSON or GOOGLE_APPLICATION_CREDENTIALS)'
    );
  }

  const vertexAI = new VertexAI({
    project,
    location,
    ...(googleAuthOptions && { googleAuthOptions }),
  });
  return vertexAI;
}

// =============================================================================
// Safety Settings
// =============================================================================

export function getSafetySettings() {
  return [
    {
      category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_HARASSMENT,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
  ];
}

// =============================================================================
// Content Generation
// =============================================================================

interface VertexAIGenerateParams {
  systemPrompt: string;
  userPrompt: string;
  temperature: number;
  maxOutputTokens: number;
  useJsonMode: boolean;
  modelName: string;
  vertexAI: VertexAI;
  thinkingBudget?: number;
}

/** Internal result carrying both text and token usage for LangSmith. */
interface VertexAIGenerateResult {
  text: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  } | null;
}

const maybeTraceable = <T extends (...args: any[]) => any>(
  fn: T,
  config: Parameters<typeof traceable>[1]
): T => {
  if (isDemoModeEnabled()) {
    return fn;
  }
  return traceable(fn, config) as T;
};

/**
 * Internal traced LLM call. Returns text + token usage so LangSmith can
 * display token counts. The VertexAI client is excluded via processInputs
 * to avoid sending credentials to the tracing backend.
 */
const _tracedVertexAIGenerate = maybeTraceable(
  async function vertexAIGenerate(params: VertexAIGenerateParams): Promise<VertexAIGenerateResult> {
    const { vertexAI, systemPrompt, userPrompt, temperature, maxOutputTokens, useJsonMode, modelName, thinkingBudget } = params;

    const generativeModel = vertexAI.getGenerativeModel(
      {
        model: modelName,
        systemInstruction: systemPrompt,
        safetySettings: getSafetySettings(),
        generationConfig: {
          temperature,
          maxOutputTokens,
          topP: temperature > 0.5 ? 0.95 : 0.9,
          ...(useJsonMode ? { responseMimeType: 'application/json' } : {}),
          ...(thinkingBudget !== undefined ? { thinkingConfig: { thinkingBudget } } : {}),
        },
      },
      { timeout: VERTEX_AI_TIMEOUT_MS }
    );

    const request: GenerateContentRequest = {
      contents: [
        {
          role: 'user',
          parts: [{ text: userPrompt }],
        },
      ],
    };

    const result = await generativeModel.generateContent(request);
    const response = result.response;

    if (!response.candidates || response.candidates.length === 0) {
      throw new Error('No response candidates returned from model');
    }

    const candidate = response.candidates[0];
    if (!candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
      throw new Error('No content parts in response');
    }

    const text = candidate.content.parts[0].text;
    if (!text) {
      throw new Error('No text in response');
    }

    // Extract token usage from Vertex AI response metadata
    const usageMetadata = response.usageMetadata;
    const usage = usageMetadata ? {
      prompt_tokens: usageMetadata.promptTokenCount ?? 0,
      completion_tokens: usageMetadata.candidatesTokenCount ?? 0,
      total_tokens: usageMetadata.totalTokenCount ?? 0,
    } : null;

    return { text, usage };
  },
  {
    name: 'Vertex AI Generate',
    run_type: 'llm',
    metadata: { provider: 'google-vertex-ai' },
    tags: ['vertex-ai', 'gemini'],
    processInputs: (inputs) => {
      // Exclude VertexAI client (contains credentials) from trace data
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { vertexAI: _excluded, ...safeInputs } = inputs as unknown as VertexAIGenerateParams;
      return {
        messages: [
          { role: 'system', content: safeInputs.systemPrompt },
          { role: 'user', content: safeInputs.userPrompt },
        ],
        ls_model_name: safeInputs.modelName,
        invocation_params: {
          model: safeInputs.modelName,
          temperature: safeInputs.temperature,
          maxOutputTokens: safeInputs.maxOutputTokens,
          responseFormat: safeInputs.useJsonMode ? 'json' : 'text',
        },
      };
    },
    processOutputs: (rawOutput) => {
      // Format output in OpenAI-compatible structure so LangSmith renders
      // token counts and the assistant message correctly.
      const output = rawOutput as VertexAIGenerateResult;
      return {
        choices: [{
          message: {
            role: 'assistant',
            content: output.text,
          },
        }],
        ...(output.usage ? {
          usage: output.usage,
          usage_metadata: {
            input_tokens: output.usage.prompt_tokens,
            output_tokens: output.usage.completion_tokens,
            total_tokens: output.usage.total_tokens,
          },
        } : {}),
      };
    },
  }
);

/**
 * Generate content using Vertex AI (Gemini). All LLM calls in the app go
 * through this function. Automatically traced by LangSmith when
 * LANGSMITH_TRACING=true.
 */
export async function generateWithVertexAI(
  vertexAI: VertexAI,
  systemPrompt: string,
  userPrompt: string,
  temperature: number,
  maxOutputTokens: number,
  useJsonMode: boolean = true,
  modelNameOverride?: string,
  thinkingBudget?: number,
): Promise<string> {
  const modelName = modelNameOverride || LLM_CONFIG.modelName;

  logger.debug('generateWithVertexAI called', {
    model: modelName,
    temperature,
    maxOutputTokens,
    useJsonMode,
    thinkingBudget,
  });

  const result = await _tracedVertexAIGenerate({
    systemPrompt,
    userPrompt,
    temperature,
    maxOutputTokens,
    useJsonMode,
    modelName,
    vertexAI,
    thinkingBudget,
  });

  // Return only the text to callers; token usage is captured in the trace
  return result.text;
}

// =============================================================================
// JSON Sanitization
// =============================================================================

/**
 * Escape raw newlines and control characters inside JSON string values.
 * Vertex JSON mode can still emit illegal unescaped newlines inside strings.
 */
export function escapeControlCharsInJson(jsonString: string): string {
  let inString = false;
  let escaped = false;
  let out = '';

  for (let i = 0; i < jsonString.length; i++) {
    const ch = jsonString[i];

    if (ch === '\\' && !escaped) {
      escaped = true;
      out += ch;
      continue;
    }

    if (ch === '"' && !escaped) {
      inString = !inString;
      out += ch;
      continue;
    }

    if (inString && !escaped) {
      switch (ch) {
        case '\n':
          out += '\\n';
          break;
        case '\r':
          out += '\\r';
          break;
        case '\t':
          out += '\\t';
          break;
        default: {
          const code = ch.charCodeAt(0);
          if (code < 32) {
            out += `\\u${code.toString(16).padStart(4, '0')}`;
          } else {
            out += ch;
          }
        }
      }
    } else {
      out += ch;
    }

    escaped = false;
  }

  return out;
}

/**
 * Best-effort parse of model output: JSON MIME mode, markdown fences, broken strings, trailing commas.
 * Used for structured LLM responses; throws if nothing parses.
 */
export function parseLlmJsonText(text: string): unknown {
  const raw = text.trim();
  if (!raw) {
    throw new Error('LLM returned empty output');
  }

  const candidates: string[] = [];
  const push = (s: string) => {
    if (s && !candidates.includes(s)) candidates.push(s);
  };

  const sanitized = sanitizeJsonString(raw);
  push(sanitized);
  push(escapeControlCharsInJson(sanitized));
  try {
    push(jsonrepair(sanitized));
  } catch {
    // jsonrepair throws on unrecoverable input; skip
  }
  try {
    push(jsonrepair(escapeControlCharsInJson(sanitized)));
  } catch {
    // ignore
  }
  try {
    push(jsonrepair(raw));
  } catch {
    // ignore
  }

  for (const s of candidates) {
    try {
      return JSON.parse(s);
    } catch {
      // next candidate
    }
  }

  logger.warn('parseLlmJsonText: all parse attempts failed', {
    length: raw.length,
    preview: raw.slice(0, 800),
  });

  throw new Error('LLM returned invalid JSON');
}

export function sanitizeJsonString(jsonString: string): string {
  // Remove any potential BOM or leading/trailing whitespace
  let cleaned = jsonString.trim();

  // Prose + fenced block: extract inner JSON
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(cleaned);
  if (fenced) {
    cleaned = fenced[1].trim();
  } else {
    // If the string is wrapped only in markdown code blocks, remove them
    cleaned = cleaned.replace(/^```json?\s*/i, '').replace(/```\s*$/, '');
  }

  // First try: return as-is if it's already valid JSON
  try {
    JSON.parse(cleaned);
    return cleaned;
  } catch {
    // Continue to sanitization
  }

  // Extract JSON object if embedded in other text
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    cleaned = jsonMatch[0];
  }

  // Second try: after extracting JSON
  try {
    JSON.parse(cleaned);
    return cleaned;
  } catch {
    // Continue to more aggressive sanitization
  }

  return escapeControlCharsInJson(cleaned);
}
