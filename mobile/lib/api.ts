import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";

const API_BASE_URL: string =
  (Constants.expoConfig?.extra?.apiBaseUrl as string | undefined) ?? "https://sgrh.people4people.pt";

const TOKEN_KEY = "people4people_mobile_token";

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function setToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(
  path: string,
  options: { method?: string; body?: unknown; token?: string | null; raw?: boolean } = {}
): Promise<T> {
  const { method = "GET", body, raw = false } = options;
  const token = options.token !== undefined ? options.token : await getToken();

  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    let message = `Erro ${res.status}`;
    try {
      const data = await res.json();
      if (typeof data?.error === "string") message = data.error;
    } catch {
      // resposta sem corpo JSON (ex.: erro de rede do servidor) — mantém a mensagem genérica
    }
    throw new ApiError(res.status, message);
  }

  if (raw) return res as unknown as T;
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  get: <T>(path: string, token?: string | null) => request<T>(path, { token }),
  post: <T>(path: string, body?: unknown, token?: string | null) =>
    request<T>(path, { method: "POST", body: body ?? {}, token }),
  patch: <T>(path: string, body?: unknown, token?: string | null) =>
    request<T>(path, { method: "PATCH", body: body ?? {}, token }),
  getBlob: async (path: string, token?: string | null): Promise<Response> => {
    const t = token !== undefined ? token : await getToken();
    const headers: Record<string, string> = {};
    if (t) headers["Authorization"] = `Bearer ${t}`;
    const res = await fetch(`${API_BASE_URL}${path}`, { headers });
    if (!res.ok) throw new ApiError(res.status, `Erro ${res.status}`);
    return res;
  },
};

export { API_BASE_URL };
