/**
 * Declarative rules for the bottom tab "Start Creating" CTA href.
 * First matching rule wins; if none match, {@link DEFAULT_START_CREATING_HREF} is used.
 */

/** Inputs available when resolving — add fields (e.g. searchParams) without breaking callers */
export type StartCreatingHrefContext = {
  pathname: string;
};

/** Serializable path conditions */
export type PathMatch =
  | { type: "exact"; path: string }
  | { type: "prefix"; prefix: string };

export function pathMatches(pathname: string, match: PathMatch): boolean {
  switch (match.type) {
    case "exact":
      return pathname === match.path;
    case "prefix": {
      const p = match.prefix.endsWith("/")
        ? match.prefix.slice(0, -1)
        : match.prefix;
      return pathname === p || pathname.startsWith(`${p}/`);
    }
    default: {
      const _exhaustive: never = match;
      return _exhaustive;
    }
  }
}

function matchesWhen(
  pathname: string,
  when: PathMatch | PathMatch[],
): boolean {
  const clauses = Array.isArray(when) ? when : [when];
  return clauses.some((m) => pathMatches(pathname, m));
}

/** Static href or /create with optional query */
export type StartCreatingDestination =
  | string
  | {
    path: "/create" | "/pricing";
    query?: Record<string, string>;
  };

export function buildStartCreatingDestination(
  dest: StartCreatingDestination,
): string {
  if (typeof dest === "string") return dest;
  const q = dest.query;
  if (!q || Object.keys(q).length === 0) return dest.path;
  return `${dest.path}?${new URLSearchParams(q).toString()}`;
}

export type StartCreatingRule = {
  /** Stable id for logs / tests */
  id: string;
  /** Single condition, or any-of (OR) */
  when: PathMatch | PathMatch[];
  destination: StartCreatingDestination;
};

export const DEFAULT_START_CREATING_HREF = "/pricing";

/**
 * Ordered rule list: add occasion-specific deep links here.
 * Example: Mother's Day → /create with ₹599 tier (package_2) + occasion prefill.
 */
export const START_CREATING_HREF_RULES: readonly StartCreatingRule[] = [
  {
    id: "occasions-mothers-day",
    when: { type: "prefix", prefix: "/occasions/mothers-day" },
    destination: {
      path: "/create",
      query: {
        plan: "package_2",
        occasion: "mothers-day",
      },
    },
  },
  {
    id: "occasions-fathers-day",
    when: { type: "prefix", prefix: "/occasions/fathers-day" },
    destination: "/create-song/fathers-day",
  },
];

export function resolveStartCreatingHref(
  ctx: StartCreatingHrefContext,
): string {
  for (const rule of START_CREATING_HREF_RULES) {
    if (matchesWhen(ctx.pathname, rule.when)) {
      return buildStartCreatingDestination(rule.destination);
    }
  }
  return DEFAULT_START_CREATING_HREF;
}
