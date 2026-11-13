import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";

// Backend por omissão (usado quando ainda não foi guardado nenhum domínio de
// empresa no dispositivo — mantém a app a funcionar sem fricção para quem já
// a usa hoje, antes de existir mais do que um cliente/ambiente).
const DEFAULT_API_BASE_URL: string =
  (Constants.expoConfig?.extra?.apiBaseUrl as string | undefined) ?? "https://sgrh.people4people.pt";

const TOKEN_KEY = "people4people_mobile_token";
const DOMAIN_KEY = "people4people_mobile_domain";

// Cada cliente corre no seu próprio ambiente/base de dados (não há
// multi-tenant partilhado) — o "domínio da empresa" indicado no login é
// literalmente o anfitrião desse ambiente (ex.: "sgrh.people4people.pt" ou,
// no futuro, o domínio próprio de outro cliente). Guardado em cache em
// memória para não ter de ler o SecureStore em cada pedido.
let cachedBaseUrl: string | null = null;

function normalizeDomain(input: string): string {
  const trimmed = input.trim().replace(/\/+$/, "");
  if (!trimmed) return DEFAULT_API_BASE_URL;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export async function getApiDomain(): Promise<string> {
  if (cachedBaseUrl) return cachedBaseUrl;
  const stored = await SecureStore.getItemAsync(DOMAIN_KEY);
  cachedBaseUrl = stored ? normalizeDomain(stored) : DEFAULT_API_BASE_URL;
  return cachedBaseUrl;
}

// Devolve o valor tal como foi guardado (para pré-preencher o campo no
// ecrã de login), sem o normalizar para URL completo.
export async function getStoredCompanyDomain(): Promise<string | null> {
  return SecureStore.getItemAsync(DOMAIN_KEY);
}

export async function setApiDomain(input: string): Promise<void> {
  const trimmed = input.trim();
  if (!trimmed) return;
  await SecureStore.setItemAsync(DOMAIN_KEY, trimmed);
  cachedBaseUrl = normalizeDomain(trimmed);
}

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
  const baseUrl = await getApiDomain();

  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${baseUrl}${path}`, {
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
    const baseUrl = await getApiDomain();
    const headers: Record<string, string> = {};
    if (t) headers["Authorization"] = `Bearer ${t}`;
    const res = await fetch(`${baseUrl}${path}`, { headers });
    if (!res.ok) throw new ApiError(res.status, `Erro ${res.status}`);
    return res;
  },
};
