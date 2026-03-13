import { ApiResponse } from "@/types/api";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

async function request<T>(
  endpoint: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  const url = `${BASE_URL}/api${endpoint}`;

  try {
    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
      ...options,
    });

    const data = await response.json();

    if (!response.ok) {
      return { data: null as T, error: data.error || "Request failed" };
    }

    return { data, error: null };
  } catch {
    return { data: null as T, error: "Network error" };
  }
}

export const api = {
  get: <T>(endpoint: string) => request<T>(endpoint),

  post: <T>(endpoint: string, body: unknown) =>
    request<T>(endpoint, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  put: <T>(endpoint: string, body: unknown) =>
    request<T>(endpoint, {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  delete: <T>(endpoint: string) =>
    request<T>(endpoint, { method: "DELETE" }),
};
