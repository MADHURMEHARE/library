/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Simple fetch wrapper to hit our Express full-stack API
export async function apiCall(endpoint: string, method: "GET" | "POST" | "PUT" | "DELETE" = "GET", body?: any) {
  const headers: HeadersInit = {
    "Content-Type": "application/json"
  };

  const token = localStorage.getItem("saas_jwt_token");
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
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
}
