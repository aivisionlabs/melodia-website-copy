/**
 * API utility functions for making HTTP requests
 * Provides consistent request handling with proper headers and credentials
 */

/**
 * Makes a POST request to the specified API endpoint
 * @param url - The API endpoint URL (e.g., "/api/auth/forgot-password")
 * @param data - The data to send in the request body
 * @returns Promise<Response> - The fetch Response object
 */
export async function apiPost(
  url: string,
  data: Record<string, unknown>
): Promise<Response> {
  return fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include", // Include cookies for authentication
    body: JSON.stringify(data),
  });
}

/**
 * Makes a PATCH request to the specified API endpoint
 * @param url - The API endpoint URL (e.g., "/api/users/me")
 * @param data - The data to send in the request body
 * @returns Promise<Response> - The fetch Response object
 */
export async function apiPatch(
  url: string,
  data: Record<string, unknown>
): Promise<Response> {
  return fetch(url, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include", // Include cookies for authentication
    body: JSON.stringify(data),
  });
}

