const backendBaseUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? "/api/backend";

export async function backendFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${backendBaseUrl}${path}`, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error ?? `Backend request failed (${response.status})`);
  }
  return response.json() as Promise<T>;
}

export type BackendSession = {
  session: {
    user: { id: string; name: string; email: string; role?: string; isActive?: boolean };
    session: { id: string; expiresAt: string };
  } | null;
};

export function getBackendSession() {
  return backendFetch<BackendSession>("/session");
}

export function getBackendHealth() {
  return backendFetch<{ status: string; service: string }>("/health");
}

export function backendMutation<T = { ok: true }>(path: string, input: unknown) {
  return backendFetch<T>(path, { method: "POST", body: JSON.stringify(input) });
}
