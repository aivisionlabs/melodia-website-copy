/**
 * Paths where GA4 (gtag / sendGAEvent) should not run — internal admin surfaces.
 */
export function isGaExcludedPathname(pathname: string | null): boolean {
  if (!pathname) return false;
  if (pathname.startsWith("/admin-login")) return true;
  if (pathname === "/song-admin-portal" || pathname.startsWith("/song-admin-portal/"))
    return true;
  return false;
}
