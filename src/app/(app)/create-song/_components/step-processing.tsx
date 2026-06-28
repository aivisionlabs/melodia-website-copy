"use client";

import SongCreationLoadingScreen from "@/components/SongCreationLoadingScreen";
import { LyricsReviewPanel } from "@/components/lyrics/LyricsReviewPanel";
import { useToast } from "@/hooks/use-toast";
import { queueMySongsNudge } from "@/lib/my-songs-nudge";
import { trackFunnelEvent } from "@/lib/analytics";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AlertCircle, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function buildCreateSongProcessingUrl(requestId: number): string {
  const params = new URLSearchParams({
    step: "processing",
    requestId: String(requestId),
  });
  return `/create-song?${params.toString()}`;
}

type Phase = "lyrics" | "review" | "song" | "error";

interface DraftData {
  id: number;
  customerLyrics: string;
  musicStyle: string | null;
  editsRemaining: number;
}

interface VersionItem {
  id: number;
  version: number;
  customerLyrics: string | null;
  modelReadyLyrics: string | null;
  musicStyle: string | null;
}

function hasLyricsDraft(
  lyricsDraft: { lyrics?: string; displayLyrics?: string } | null | undefined,
): boolean {
  if (!lyricsDraft) return false;
  const text = (
    lyricsDraft.displayLyrics ??
    lyricsDraft.lyrics ??
    ""
  ).trim();
  return text.length > 0;
}

async function loadSongRequestData(requestId: number) {
  const requestRes = await fetch(`/api/song-requests/${requestId}`, {
    cache: "no-store",
  });
  if (!requestRes.ok) {
    throw new Error("Failed to load song request");
  }

  const requestData = await requestRes.json();
  return requestData?.data as
    | {
        songRequest?: { requestSource?: string | null };
        lyricsDraft?: { lyrics?: string; displayLyrics?: string } | null;
      }
    | undefined;
}

async function ensureLyricsGenerated(
  requestId: number,
  requestData: Awaited<ReturnType<typeof loadSongRequestData>>,
): Promise<void> {
  if (hasLyricsDraft(requestData?.lyricsDraft)) {
    return;
  }

  const generateRes = await fetch("/api/generate-lyrics", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ songRequestId: requestId }),
  });

  const generateData = await generateRes.json().catch(() => ({}));
  if (!generateRes.ok) {
    throw new Error(
      generateData.error ||
        generateData.message ||
        "Failed to generate lyrics",
    );
  }
}

async function fetchDraftData(requestId: number): Promise<DraftData> {
  // Retry up to 3 times with 1s gap — the DB write from generate-lyrics may not be
  // visible immediately on the first read after ensureLyricsGenerated returns.
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    const res = await fetch(`/api/lyrics-draft?requestId=${requestId}`, {
      cache: "no-store",
    });
    const data = await res.json();
    if (res.ok && data.success) {
      return data.data as DraftData;
    }
    if (attempt === 2) {
      throw new Error(data.error || "Failed to load lyrics draft");
    }
  }
  throw new Error("Failed to load lyrics draft");
}

async function fetchVersions(requestId: number): Promise<VersionItem[]> {
  try {
    const res = await fetch(`/api/lyrics-versions/${requestId}`, {
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.versions || []) as VersionItem[];
  } catch {
    return [];
  }
}

export function StepProcessing({ requestId: requestIdParam }: { requestId?: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const startedRef = useRef(false);
  const paymentIdRef = useRef<number | null>(null);
  const [phase, setPhase] = useState<Phase>("lyrics");
  const [draftData, setDraftData] = useState<DraftData | null>(null);
  const [versions, setVersions] = useState<VersionItem[]>([]);
  const [selectedVersionId, setSelectedVersionId] = useState<number | null>(
    null,
  );
  const [isApproving, setIsApproving] = useState(false);
  const [isRevising, setIsRevising] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    trackFunnelEvent.formStepView(4, "create_song_processing");
  }, []);

  useEffect(() => {
    const requestId = parseInt(requestIdParam || "", 10);
    if (!requestIdParam || Number.isNaN(requestId) || requestId <= 0) {
      router.replace("/create-song");
      return;
    }

    if (startedRef.current) return;
    startedRef.current = true;

    const orchestrate = async () => {
      try {
        const requestData = await loadSongRequestData(requestId);
        const autoProcessSources = ["create_song_wizard", "fathers_day_wizard"];
        if (!autoProcessSources.includes(requestData?.songRequest?.requestSource ?? "")) {
          router.replace(`/payment?requestId=${requestId}`);
          return;
        }

        const statusRes = await fetch(
          `/api/payments/check-status?requestId=${requestId}`,
          { cache: "no-store" },
        );

        if (!statusRes.ok) {
          throw new Error("Failed to check payment status");
        }

        const statusData = await statusRes.json();
        if (!statusData.success || !statusData.data) {
          throw new Error("Invalid payment status response");
        }

        const { payment, song } = statusData.data;

        if (!payment || payment.status !== "completed") {
          toast({
            variant: "snackbar",
            description: "Complete payment to continue.",
          });
          router.replace("/create-song");
          return;
        }

        if (song?.id && (song.status === "completed" || song.status === "processing")) {
          queueMySongsNudge(requestId, "song_generated");
          trackFunnelEvent.formStepComplete(4, "create_song_processing_song_ready");
          window.location.replace(`/song-options/${song.id}`);
          return;
        }

        paymentIdRef.current = payment.id;

        trackFunnelEvent.lyricsGenerationStart(requestId);
        await ensureLyricsGenerated(requestId, requestData);
        trackFunnelEvent.lyricsGenerationComplete(requestId, 1);

        const draft = await fetchDraftData(requestId);
        setDraftData(draft);
        const vs = await fetchVersions(requestId);
        setVersions(vs);
        setSelectedVersionId(draft.id);
        setPhase("review");
      } catch (error) {
        trackFunnelEvent.formStepComplete(4, "create_song_processing_error");
        toast({
          variant: "snackbar",
          description:
            error instanceof Error
              ? error.message
              : "Something went wrong. Please try again.",
        });
        router.replace("/create-song");
      }
    };

    void orchestrate();
  }, [requestIdParam, router, toast]);

  const requestId = parseInt(requestIdParam || "", 10);

  const handleApprove = async (draftId: number, editedLyrics: string | null) => {
    setIsApproving(true);
    try {
      if (editedLyrics !== null) {
        const updateRes = await fetch("/api/update-lyrics", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lyricsDraftId: draftId, editedLyrics }),
        });
        const updateData = await updateRes.json();
        if (!updateRes.ok || !updateData.success) {
          throw new Error(updateData.error || "Failed to save lyrics edits");
        }
      }

      setPhase("song");

      const successRes = await fetch("/api/payments/success", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentId: paymentIdRef.current,
          requestId,
          // Approve & generate the revision the user is currently viewing,
          // not just the latest draft.
          selectedLyricsDraftId: draftId,
        }),
      });

      const successData = await successRes.json();
      if (!successRes.ok || !successData.success) {
        throw new Error(successData.message || "Failed to start song creation");
      }

      queueMySongsNudge(requestId, "song_generated");
      trackFunnelEvent.formStepComplete(4, "create_song_processing_complete");

      window.location.replace(
        successData.redirectUrl || `/song-options/${successData.songId}`,
      );
    } catch (error) {
      trackFunnelEvent.formStepComplete(4, "create_song_processing_error");
      const msg =
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again.";
      setErrorMessage(msg);
      setPhase("error");
    } finally {
      setIsApproving(false);
    }
  };

  const handleRevision = async (refineText: string) => {
    const baseDraftId = selectedVersionId ?? draftData?.id;
    if (!baseDraftId) return;
    setIsRevising(true);
    try {
      const res = await fetch("/api/refine-lyrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lyricsDraftId: baseDraftId,
          editPrompt: refineText,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "AI revision failed");
      }
      setDraftData((prev) =>
        prev
          ? {
              ...prev,
              id: data.draft.id,
              customerLyrics: data.draft.lyrics,
              editsRemaining: Math.max(0, prev.editsRemaining - 1),
            }
          : prev,
      );
      // Refresh the version list so the new revision appears as a tab, then
      // switch the user over to it.
      if (!Number.isNaN(requestId)) {
        const vs = await fetchVersions(requestId);
        setVersions(vs);
      }
      setSelectedVersionId(data.draft.id);
    } catch (error) {
      toast({
        variant: "snackbar",
        description:
          error instanceof Error ? error.message : "AI revision failed.",
      });
    } finally {
      setIsRevising(false);
    }
  };

  if (phase === "error") {
    return (
      <div className="flex flex-col min-h-screen bg-secondary-cream text-text-teal">
        <main className="flex-grow flex flex-col items-center justify-center px-6 text-center">
          <div className="w-full max-w-sm space-y-6">
            <div className="flex justify-center">
              <div className="w-20 h-20 bg-accent-coral/10 rounded-full flex items-center justify-center">
                <AlertCircle className="w-10 h-10 text-accent-coral" />
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-heading font-bold text-text-teal">
                Something went wrong
              </h2>
              <p className="text-sm font-body text-text-teal/70 leading-relaxed">
                {errorMessage || "We couldn't start your song generation. Your payment was captured — please reach out and we'll sort it out right away."}
              </p>
            </div>
            <div className="space-y-3 pt-2">
              <Button
                asChild
                size="lg"
                className="w-full h-14 bg-accent-coral hover:bg-accent-coral/90 text-white font-heading font-bold text-base rounded-full"
              >
                <a
                  href="mailto:support@melodia.in?subject=Song%20generation%20failed%20after%20payment&body=Hi%2C%20my%20song%20generation%20failed%20after%20payment.%20Please%20help."
                  className="flex items-center justify-center gap-2"
                >
                  <MessageCircle className="w-5 h-5" />
                  Contact Support
                </a>
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="w-full h-12 border-text-teal/20 text-text-teal font-body rounded-full"
                onClick={() => router.push("/my-songs")}
              >
                Go to My Songs
              </Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (phase === "review" && draftData) {
    const selectedVersion =
      versions.find((v) => v.id === selectedVersionId) ?? null;
    const displayDraftId = selectedVersionId ?? draftData.id;
    const displayLyrics = selectedVersion
      ? selectedVersion.customerLyrics ?? selectedVersion.modelReadyLyrics ?? ""
      : draftData.customerLyrics;
    const displayMusicStyle =
      selectedVersion?.musicStyle ?? draftData.musicStyle;

    return (
      <LyricsReviewPanel
        fullPage
        steps={[
          { num: "1", label: "Share Details", completed: true },
          { num: "2", label: "Pay", completed: true },
          { num: "3", label: "Review Lyrics", active: true },
        ]}
        lyricsDraftId={displayDraftId}
        customerLyrics={displayLyrics}
        musicStyle={displayMusicStyle}
        editsRemaining={draftData.editsRemaining}
        versions={versions.map((v) => ({ id: v.id, version: v.version }))}
        selectedVersionId={selectedVersionId}
        onSelectVersion={setSelectedVersionId}
        isApproving={isApproving}
        isRevising={isRevising}
        approveLabel="Approve & Generate Song"
        onApprove={handleApprove}
        onRequestRevision={handleRevision}
      />
    );
  }

  return (
    <SongCreationLoadingScreen
      stage={phase === "song" ? "song" : "lyrics"}
      title={
        phase === "song"
          ? "Creating your song..."
          : "Writing your lyrics..."
      }
      message={
        phase === "song"
          ? "We're producing your song — this usually takes a minute."
          : "We're turning your story into custom lyrics."
      }
    />
  );
}
