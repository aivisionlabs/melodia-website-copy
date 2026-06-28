"use client";

import { useEffect, useRef, useState } from "react";
import { getSunoRecordInfoAction } from "@/lib/actions/suno.actions";
import { coerceRecordInfoSunoDataToArray } from "@/lib/utils/variant-utils";

export interface SunoVariant {
  id: string;
  title?: string;
  audioUrl?: string;
  sourceAudioUrl?: string;
  streamAudioUrl?: string;
  duration?: number | string;
  prompt?: string;
}

export interface UseSunoTaskProgressOptions {
  /** Called when status becomes SUCCESS with the variants (e.g. for library auto-store). */
  onSuccess?: (variants: SunoVariant[]) => void;
}

export function useSunoTaskProgress(
  taskId: string | null,
  options: UseSunoTaskProgressOptions = {}
) {
  const { onSuccess } = options;
  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;

  const [status, setStatus] = useState<string>("PENDING");
  const [variants, setVariants] = useState<SunoVariant[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!taskId) return;

    let interval: NodeJS.Timeout | null = null;

    const pollStatus = async () => {
      try {
        const response = await getSunoRecordInfoAction(taskId);

        if (response.code === 200) {
          const currentStatus = response.data?.status;
          const rawSuno = response.data?.response?.sunoData;
          const currentVariants = coerceRecordInfoSunoDataToArray(rawSuno) as SunoVariant[];

          setStatus(currentStatus);
          setVariants(currentVariants);

          const statusKey =
            typeof currentStatus === "string"
              ? currentStatus.toUpperCase()
              : "";
          switch (statusKey) {
            case "PENDING":
            case "QUEUED":
              setProgress(10);
              break;
            case "TEXT_SUCCESS":
              setProgress(30);
              break;
            case "FIRST_SUCCESS":
              setProgress(60);
              break;
            case "SUCCESS":
            case "COMPLETED":
              setProgress(100);
              if (currentVariants.length > 0 && onSuccessRef.current) {
                onSuccessRef.current(currentVariants);
              }
              if (interval) {
                clearInterval(interval);
                interval = null;
              }
              return;
            case "FAILED":
            case "CREATE_TASK_FAILED":
            case "GENERATE_AUDIO_FAILED":
            case "CALLBACK_EXCEPTION":
            case "SENSITIVE_WORD_ERROR":
              setError(`Generation failed: ${statusKey || "UNKNOWN"}`);
              setProgress(0);
              if (interval) {
                clearInterval(interval);
                interval = null;
              }
              return;
            default:
              break;
          }
        } else {
          console.warn("Suno API returned error:", response.msg);
        }
      } catch (err) {
        console.error("Error polling status:", err);
      }
    };

    pollStatus();
    interval = setInterval(pollStatus, 20000);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [taskId]);

  const statusMessage = (() => {
    const statusKey = typeof status === "string" ? status.toUpperCase() : "";
    switch (statusKey) {
      case "PENDING":
      case "QUEUED":
        return "Initializing song generation...";
      case "TEXT_SUCCESS":
        return "Lyrics processed successfully, generating music...";
      case "FIRST_SUCCESS":
        return "First variant ready, generating second variant...";
      case "SUCCESS":
      case "COMPLETED":
        return "Both variants generated successfully! Select your preferred variant below.";
      case "FAILED":
        return "Song generation failed. Please retry.";
      default:
        return "Processing...";
    }
  })();

  return { status, variants, error, progress, statusMessage };
}
