import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, ApiError, clearToken, getToken, setToken as persistToken } from "./api";

export type MobileProfileUser = {
  name: string | null;
  email: string;
  avatarKey: string | null;
  avatarImage: string | null;
  mustChangePassword: boolean;
  roleLabels: string[];
};

type AuthState = {
  isLoading: boolean;
  token: string | null;
  user: MobileProfileUser | null;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [token, setTokenState] = useState<string | null>(null);
  const [user, setUser] = useState<MobileProfileUser | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadUser(currentToken: string) {
    const profile = await api.get<MobileProfileUser>("/api/mobile/perfil", currentToken);
    setUser(profile);
  }

  useEffect(() => {
    (async () => {
      try {
        const stored = await getToken();
        if (stored) {
          await loadUser(stored);
          setTokenState(stored);
        }
      } catch {
        await clearToken();
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const login = async (email: string, password: string) => {
    setError(null);
    try {
      const result = await api.post<{ token: string }>(
        "/api/mobile/auth/login",
        { email, password },
        null
      );
      await persistToken(result.token);
      setTokenState(result.token);
      await loadUser(result.token);
    } catch (e) {
      const message = e instanceof ApiError ? e.message : "Não foi possível iniciar sessão.";
      setError(message);
      throw e;
    }
  };

  const logout = async () => {
    await clearToken();
    setTokenState(null);
    setUser(null);
  };

  const refreshUser = async () => {
    if (!token) return;
    await loadUser(token);
  };

  const value = useMemo(
    () => ({ isLoading, token, user, error, login, logout, refreshUser }),
    [isLoading, token, user, error]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de um AuthProvider.");
  return ctx;
}
