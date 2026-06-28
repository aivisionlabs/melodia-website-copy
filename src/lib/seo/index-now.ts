/**
 * IndexNow integration — instantly notifies participating search engines
 * (Microsoft Bing, Yandex, Seznam, Naver, …) that a URL has been created or
 * updated, so they crawl/index it within minutes instead of waiting for a
 * natural crawl.
 *
 * Google does NOT participate in IndexNow. New blog URLs reach Google via the
 * existing dynamic sitemap (`/sitemap.xml`), which Google discovers and crawls
 * automatically. (Google removed its sitemap-ping endpoint in 2023, so there is
 * no officially supported instant-notify path for Google blog content.)
 *
 * Setup: the key below must be served as a plain-text file at
 *   https://www.melodia-songs.com/<key>.txt
 * containing exactly the key. That file lives at
 *   public/76274c0cab82cddd0ab550ed17f2d944.txt
 * To rotate the key, set INDEXNOW_KEY and add a matching public/<key>.txt file.
 */

/** Canonical production host — must match the sitemap and the public key file. */
const SITE_ORIGIN =
  process.env.INDEXNOW_SITE_ORIGIN || 'https://www.melodia-songs.com';

/** Default key (also committed as public/<key>.txt). Override with INDEXNOW_KEY. */
const DEFAULT_KEY = '76274c0cab82cddd0ab550ed17f2d944';
const INDEXNOW_KEY = process.env.INDEXNOW_KEY || DEFAULT_KEY;

/** Generic IndexNow endpoint — fans out to all participating engines. */
const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow';

type Logger = {
  info: (msg: string, meta?: unknown) => void;
  warn: (msg: string, meta?: unknown) => void;
  error: (msg: string, err?: unknown) => void;
};

/** Build the canonical public URL for a blog slug. */
export function blogUrl(slug: string): string {
  return `${SITE_ORIGIN}/blog/${slug}`;
}

/**
 * Submit one or more URLs to IndexNow. Never throws — failures are logged and
 * swallowed so they cannot break the calling request (blog create/update).
 *
 * Skipped entirely outside production so local/preview saves don't ping live
 * search engines with non-indexable hosts.
 */
export async function submitToIndexNow(
  urls: string[],
  logger?: Logger
): Promise<void> {
  const log = logger ?? console;

  const urlList = urls.filter(Boolean);
  if (urlList.length === 0) return;

  if (process.env.NODE_ENV !== 'production') {
    log.info?.('IndexNow skipped (non-production)', { urlList });
    return;
  }

  const host = new URL(SITE_ORIGIN).host;

  try {
    const res = await fetch(INDEXNOW_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify({
        host,
        key: INDEXNOW_KEY,
        keyLocation: `${SITE_ORIGIN}/${INDEXNOW_KEY}.txt`,
        urlList,
      }),
    });

    // IndexNow returns 200 (received) or 202 (accepted/validating) on success.
    if (res.ok || res.status === 202) {
      log.info?.('IndexNow submission accepted', { status: res.status, urlList });
    } else {
      const text = await res.text().catch(() => '');
      log.warn?.('IndexNow submission rejected', {
        status: res.status,
        body: text.slice(0, 500),
        urlList,
      });
    }
  } catch (err) {
    log.error?.('IndexNow submission failed', err);
  }
}

/**
 * Fire-and-forget notify for a freshly published blog post. Safe to call
 * without awaiting — it owns its own error handling.
 */
export function notifyBlogPublished(slug: string, logger?: Logger): void {
  void submitToIndexNow([blogUrl(slug)], logger);
}
