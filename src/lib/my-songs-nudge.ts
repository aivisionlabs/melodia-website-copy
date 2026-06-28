export type MySongsNudgeType = "request_captured" | "song_generated";

type PendingMySongsNudge = {
  requestId: number;
  type: MySongsNudgeType;
  createdAt: number;
};

const PENDING_NUDGE_KEY = "melodia:my_songs_nudge:pending";
const SEEN_PREFIX = "melodia:my_songs_nudge:seen";

function getSeenKey(requestId: number, type: MySongsNudgeType): string {
  return `${SEEN_PREFIX}:${requestId}:${type}`;
}

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function safeParsePendingNudge(raw: string | null): PendingMySongsNudge | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<PendingMySongsNudge>;
    if (
      typeof parsed.requestId === "number" &&
      Number.isFinite(parsed.requestId) &&
      parsed.requestId > 0 &&
      (parsed.type === "request_captured" || parsed.type === "song_generated")
    ) {
      return {
        requestId: parsed.requestId,
        type: parsed.type,
        createdAt:
          typeof parsed.createdAt === "number"
            ? parsed.createdAt
            : Date.now(),
      };
    }
  } catch {
    // Ignore malformed payload and fail silently.
  }
  return null;
}

export function queueMySongsNudge(
  requestId: number,
  type: MySongsNudgeType,
): void {
  if (!isBrowser() || !Number.isFinite(requestId) || requestId <= 0) return;
  try {
    const payload: PendingMySongsNudge = {
      requestId,
      type,
      createdAt: Date.now(),
    };
    window.sessionStorage.setItem(PENDING_NUDGE_KEY, JSON.stringify(payload));
  } catch {
    // Some in-app browsers can block storage access.
  }
}

export function consumePendingMySongsNudge(): PendingMySongsNudge | null {
  if (!isBrowser()) return null;
  try {
    const pending = safeParsePendingNudge(
      window.sessionStorage.getItem(PENDING_NUDGE_KEY),
    );
    window.sessionStorage.removeItem(PENDING_NUDGE_KEY);
    return pending;
  } catch {
    return null;
  }
}

export function hasSeenMySongsNudge(
  requestId: number,
  type: MySongsNudgeType,
): boolean {
  if (!isBrowser()) return false;
  try {
    return window.localStorage.getItem(getSeenKey(requestId, type)) === "1";
  } catch {
    return false;
  }
}

export function markMySongsNudgeSeen(
  requestId: number,
  type: MySongsNudgeType,
): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(getSeenKey(requestId, type), "1");
  } catch {
    // Ignore storage failures.
  }
}

export function getMySongsNudgeMessage(type: MySongsNudgeType): string {
  return type === "song_generated"
    ? "Your generated songs are in My Songs."
    : "You can track your song requests from My Songs.";
}
