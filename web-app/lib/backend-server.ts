import { headers } from "next/headers";

const backendUrl = process.env.BACKEND_URL ?? "http://localhost:4000";

export async function backendServerFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const requestHeaders = await headers();
  const response = await fetch(`${backendUrl}/api/v1${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      cookie: requestHeaders.get("cookie") ?? "",
      ...init?.headers,
    },
    cache: "no-store",
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error ?? `Backend request failed (${response.status})`);
  }
  return response.json() as Promise<T>;
}
