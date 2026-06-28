/** iPhone / iPod / iPad (including iPadOS “desktop” Safari). */
export function shouldUseIosDownloadAssist(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  // iPadOS desktop-class UA includes "Macintosh" with touch points > 1.
  if (ua.includes("Macintosh") && navigator.maxTouchPoints > 1) {
    return true;
  }
  return false;
}

function triggerAnchorDownload(href: string, filename: string): void {
  const link = document.createElement("a");
  link.href = href;
  link.download = filename;
  link.style.display = "none";
  link.target = "_self";
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    if (document.body.contains(link)) {
      document.body.removeChild(link);
    }
  }, 100);
}

/**
 * Downloads a file by proxying through our API endpoint which sets
 * Content-Disposition: attachment headers. This forces the browser to
 * save the file instead of opening it in a new tab / media player.
 *
 * Fast path:
 * - Android / desktop: trigger direct proxy download immediately.
 * - iOS / iPadOS: navigate the current tab to the attachment URL.
 *
 * @param url - The URL of the file to download
 * @param filename - The filename for the downloaded file
 */
export async function downloadFile(url: string, filename: string): Promise<void> {
  const proxyUrl = `/api/download-audio?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename)}`;

  // iOS Safari is more reliable when the current tab navigates to an
  // attachment response. If the browser honors Content-Disposition, the page
  // stays put and the download starts; no extra tab is opened.
  if (shouldUseIosDownloadAssist()) {
    window.location.assign(proxyUrl);
    return;
  }

  // Android / desktop: start stream immediately with proxy URL in same tab.
  triggerAnchorDownload(proxyUrl, filename);
}

/**
 * Downloads raw JSON API response as-is (no processing/wrapping).
 * Used for downloading Suno API timestamped lyrics response directly.
 *
 * @param rawApiResponse - Raw API response data (e.g., alignedWords array from Suno)
 * @param filename - The filename for the downloaded file (without extension)
 */
export function downloadTimestampLyrics(
  rawApiResponse: any,
  filename: string
): void {
  try {
    // Download raw JSON response as-is, no processing or wrapping
    const jsonString = JSON.stringify(rawApiResponse, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const blobUrl = window.URL.createObjectURL(blob);

    // Create a temporary link and trigger download
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = `${filename}.json`;
    link.style.display = "none";

    // Set the download attribute to force download
    link.setAttribute("download", `${filename}.json`);

    // Add link to DOM (required for some browsers)
    document.body.appendChild(link);

    // Trigger download
    link.click();

    // Clean up after a short delay
    setTimeout(() => {
      if (document.body.contains(link)) {
        document.body.removeChild(link);
      }
      window.URL.revokeObjectURL(blobUrl);
    }, 100);
  } catch (error) {
    console.error("Error downloading timestamp lyrics:", error);
    throw error;
  }
}

/**
 * Downloads plain text content as a .txt file.
 *
 * @param text - The text content to download
 * @param filename - The filename for the downloaded file (without extension)
 */
export function downloadTextFile(text: string, filename: string): void {
  try {
    const safeText = typeof text === 'string' ? text : String(text ?? '');
    const blob = new Blob([safeText], { type: 'text/plain;charset=utf-8' });
    const blobUrl = window.URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = `${filename}.txt`;
    link.style.display = 'none';
    link.setAttribute('download', `${filename}.txt`);

    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
      if (document.body.contains(link)) {
        document.body.removeChild(link);
      }
      window.URL.revokeObjectURL(blobUrl);
    }, 100);
  } catch (error) {
    console.error('Error downloading text file:', error);
    throw error;
  }
}

