/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// In-flight request deduplication map to prevent double-click redundant network requests
const inFlightRequests = new Map<string, Promise<any>>();

// Simple fetch wrapper to hit our Express full-stack API with built-in double-click & deduplication protection
export async function apiCall(endpoint: string, method: "GET" | "POST" | "PUT" | "DELETE" = "GET", body?: any) {
  const isMutating = method !== "GET";
  const cacheKey = `${method}:${endpoint}:${body ? JSON.stringify(body) : ""}`;

  // If the exact same request is already in progress, share the in-flight promise
  // This completely stops double-clicking from triggering multiple server creations
  if (isMutating && inFlightRequests.has(cacheKey)) {
    return inFlightRequests.get(cacheKey)!;
  }

  const execPromise = (async () => {
    const headers: HeadersInit = {
      "Content-Type": "application/json"
    };

    const token = localStorage.getItem("saas_jwt_token");
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    // Include an idempotency key header for mutating calls
    if (isMutating) {
      headers["X-Client-Request-Id"] = `req-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    }

    const options: RequestInit = {
      method,
      headers
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(endpoint, options);
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `Request failed with status ${response.status}`);
    }

    return response.json();
  })();

  if (isMutating) {
    inFlightRequests.set(cacheKey, execPromise);
    execPromise.finally(() => {
      // Retain key briefly for 350ms after completion to discard fast subsequent accidental double clicks
      setTimeout(() => {
        inFlightRequests.delete(cacheKey);
      }, 350);
    });
  }

  return execPromise;
}
