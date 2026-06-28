/**
 * Vendor Product Operation Logger
 *
 * Provides structured, per-operation trace logging for multi-step vendor product
 * pipelines (RJ show, future products). Built on top of createContextLogger.
 *
 * Usage:
 *   const opLogger = new VendorOperationLogger({ vendor_id, order_id, product_type, show_id });
 *   const step = opLogger.startStep('segment.tts.3', { text_length: 320 });
 *   // ... do work ...
 *   step.complete({ audio_bytes: 98000 });
 *   // or: step.fail(error);
 */

import { createContextLogger } from '@/lib/logger';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface OperationStep {
  step_name: string;
  started_at: string;
  completed_at?: string;
  duration_ms?: number;
  status: 'started' | 'completed' | 'failed' | 'skipped';
  input_summary?: Record<string, unknown>;
  output_summary?: Record<string, unknown>;
  error?: { code?: string; message: string; stack?: string };
  external_api?: {
    service: string;
    endpoint?: string;
    status_code?: number;
    response_time_ms?: number;
  };
}

export interface OperationSummary {
  total_duration_ms: number;
  steps_completed: number;
  steps_failed: number;
  external_call_count: number;
  steps: OperationStep[];
}

export interface StepHandle {
  complete(output?: Record<string, unknown>): void;
  fail(error: Error | string, code?: string): void;
  skip(reason?: string): void;
}

export interface VendorOperationLoggerOptions {
  vendor_id: number;
  order_id: number;
  product_type: string;
  show_id?: number;
}

// ─── VendorOperationLogger ────────────────────────────────────────────────────

export class VendorOperationLogger {
  private readonly ctx: VendorOperationLoggerOptions;
  private readonly logger: ReturnType<typeof createContextLogger>;
  private readonly steps: OperationStep[] = [];
  private readonly startedAt: number = Date.now();
  private externalCallCount = 0;

  constructor(options: VendorOperationLoggerOptions) {
    this.ctx = options;
    this.logger = createContextLogger({
      vendor_id: options.vendor_id,
      order_id: options.order_id,
      product_type: options.product_type,
      ...(options.show_id !== undefined ? { show_id: options.show_id } : {}),
    });
  }

  /**
   * Start a named pipeline step. Returns a StepHandle to complete or fail it.
   */
  startStep(name: string, input?: Record<string, unknown>): StepHandle {
    const step: OperationStep = {
      step_name: name,
      started_at: new Date().toISOString(),
      status: 'started',
      input_summary: input,
    };
    this.steps.push(step);

    this.logger.info(`Step started: ${name}`, {
      step_name: name,
      status: 'started',
      input_summary: input,
    });

    const startMs = Date.now();

    return {
      complete: (output?: Record<string, unknown>) => {
        step.completed_at = new Date().toISOString();
        step.duration_ms = Date.now() - startMs;
        step.status = 'completed';
        step.output_summary = output;

        this.logger.info(`Step completed: ${name}`, {
          step_name: name,
          status: 'completed',
          duration_ms: step.duration_ms,
          output_summary: output,
        });
      },

      fail: (error: Error | string, code?: string) => {
        const errObj = error instanceof Error ? error : new Error(String(error));
        step.completed_at = new Date().toISOString();
        step.duration_ms = Date.now() - startMs;
        step.status = 'failed';
        step.error = {
          code,
          message: errObj.message,
          stack: errObj.stack,
        };

        this.logger.error(`Step failed: ${name}`, {
          step_name: name,
          status: 'failed',
          duration_ms: step.duration_ms,
          error: { code, message: errObj.message },
        });
      },

      skip: (reason?: string) => {
        step.completed_at = new Date().toISOString();
        step.duration_ms = Date.now() - startMs;
        step.status = 'skipped';
        step.output_summary = reason ? { reason } : undefined;

        this.logger.info(`Step skipped: ${name}`, {
          step_name: name,
          status: 'skipped',
          reason,
        });
      },
    };
  }

  /**
   * Log an external API call (ElevenLabs, YouTube, R2, Vertex AI, etc.).
   */
  logExternalApiCall(
    service: string,
    endpoint: string,
    statusCode: number,
    responseTimeMs: number,
    details?: Record<string, unknown>,
  ): void {
    this.externalCallCount++;

    this.logger.info(`External API call: ${service}`, {
      service,
      endpoint,
      status_code: statusCode,
      response_time_ms: responseTimeMs,
      ...details,
    });
  }

  /**
   * Log segment-level progress within a show.
   */
  logSegmentProgress(
    segmentId: number,
    segmentOrder: number,
    status: string,
    details?: Record<string, unknown>,
  ): void {
    this.logger.info(`Segment progress: ${segmentOrder} → ${status}`, {
      segment_id: segmentId,
      segment_order: segmentOrder,
      status,
      ...details,
    });
  }

  /**
   * Log a retry event.
   */
  logRetry(step: string, attemptNumber: number, previousError: string): void {
    this.logger.warn(`Retry: ${step} (attempt ${attemptNumber})`, {
      step_name: step,
      attempt: attemptNumber,
      previous_error: previousError,
    });
  }

  /**
   * Return aggregated operation summary.
   * Store this in rj_shows.metadata at pipeline completion.
   */
  summary(): OperationSummary {
    return {
      total_duration_ms: Date.now() - this.startedAt,
      steps_completed: this.steps.filter((s) => s.status === 'completed').length,
      steps_failed: this.steps.filter((s) => s.status === 'failed').length,
      external_call_count: this.externalCallCount,
      steps: this.steps,
    };
  }

  /** Expose the underlying context logger for ad-hoc logging. */
  get log() {
    return this.logger;
  }
}
