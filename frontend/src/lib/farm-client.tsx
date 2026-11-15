import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { api, ApiError, type Assessment, type FieldInput } from "@/lib/cereja-api";

type Session = { access_token: string; refresh_token: string; expires_at: number };
type TokenResponse = {
  access_token: string | null;
  refresh_token: string | null;
  expires_in: number | null;
};
export type Plot = { id: string; name: string; lat: number; lon: number };
export type Cycle = {
  id: string;
  plot_id: string;
  culture_id: string;
  kind: string;
  parent_id: string | null;
  planted_on: string;
  ended_on: string | null;
};
export type FarmTask = {
  id: string;
  plot_id: string;
  cycle_id: string | null;
  title: string;
  planned_on: string;
  done_on: string | null;
  state: "planejada" | "realizada" | "cancelada";
};
export type SavedAssessment = {
  id: string;
  plot_id: string;
  reference_date: string;
  method_version: string;
  created_at: string;
};
export type FarmSnapshot = {
  plots: Plot[];
  cycles: Cycle[];
  tasks: FarmTask[];
  assessments: SavedAssessment[];
};
export type FarmPayload =
  | { name: string; lat: number; lon: number }
  | { plot_id: string; culture_id: string; parent_id?: string; planted_on: string }
  | { plot_id: string; cycle_id?: string; title: string; planned_on: string }
  | { plot_id: string; field: FieldInput; reference_date?: string };

type FarmContextValue = {
  signedIn: boolean;
  sessionVersion: number;
  signIn: (email: string, password: string, signup?: boolean) => Promise<boolean>;
  signOut: () => Promise<void>;
  request: <T>(path: string, method?: "GET" | "POST" | "PATCH", body?: object) => Promise<T>;
};

const FarmContext = createContext<FarmContextValue | null>(null);

function readSession(value: TokenResponse): Session | null {
  if (!value.access_token || !value.refresh_token || !value.expires_in) return null;
  return {
    access_token: value.access_token,
    refresh_token: value.refresh_token,
    expires_at: Date.now() + value.expires_in * 1000,
  };
}

export function FarmProvider({ children }: { children: ReactNode }) {
  const [signedIn, setSignedIn] = useState(false);
  const [sessionVersion, setSessionVersion] = useState(0);
  const session = useRef<Session | null>(null);
  const generation = useRef(0);
  const pendingRefresh = useRef<{ generation: number; promise: Promise<void> } | null>(null);

  const clear = useCallback(() => {
    generation.current += 1;
    setSessionVersion(generation.current);
    session.current = null;
    pendingRefresh.current = null;
    setSignedIn(false);
  }, []);

  const signIn = useCallback(
    async (email: string, password: string, signup = false) => {
      const value = await api<TokenResponse>(`/api/auth/${signup ? "signup" : "login"}`, {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      clear();
      session.current = readSession(value);
      setSignedIn(Boolean(session.current));
      return Boolean(session.current);
    },
    [clear],
  );

  const signOut = useCallback(async () => {
    const token = session.current?.access_token;
    clear();
    if (token) {
      await api<{ ok: boolean }>("/api/auth/logout", {
        method: "POST",
        body: "{}",
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => undefined);
    }
  }, [clear]);

  const request = useCallback(
    async <T,>(
      path: string,
      method: "GET" | "POST" | "PATCH" = "GET",
      body?: object,
    ): Promise<T> => {
      const current = session.current;
      if (!current) throw new ApiError("Entre na sua conta para acessar Minha Lavoura.", 401);
      const started = generation.current;
      if (Date.now() >= current.expires_at - 30_000) {
        if (pendingRefresh.current?.generation !== started) {
          const promise = api<TokenResponse>("/api/auth/refresh", {
            method: "POST",
            body: JSON.stringify({ refresh_token: current.refresh_token }),
          }).then((value) => {
            if (generation.current === started && session.current === current) {
              session.current = readSession(value);
              if (!session.current) clear();
            }
          });
          pendingRefresh.current = { generation: started, promise };
          const release = () => {
            if (pendingRefresh.current?.promise === promise) pendingRefresh.current = null;
          };
          void promise.then(release, release);
        }
        try {
          await pendingRefresh.current.promise;
        } catch (error) {
          if (generation.current === started && error instanceof ApiError && error.status === 401)
            clear();
          throw error;
        }
      }
      if (generation.current !== started || !session.current)
        throw new ApiError("A sessão terminou. Entre novamente.", 401);
      try {
        const data = await api<T>(`/api/lavoura${path}`, {
          method,
          ...(body ? { body: JSON.stringify(body) } : {}),
          headers: { Authorization: `Bearer ${session.current.access_token}` },
        });
        if (generation.current !== started)
          throw new ApiError("A sessão terminou. Entre novamente.", 401);
        return data;
      } catch (error) {
        if (generation.current === started && error instanceof ApiError && error.status === 401)
          clear();
        throw error;
      }
    },
    [clear],
  );

  return (
    <FarmContext.Provider value={{ signedIn, sessionVersion, signIn, signOut, request }}>
      {children}
    </FarmContext.Provider>
  );
}

export function useFarm() {
  const value = useContext(FarmContext);
  if (!value) throw new Error("FarmProvider ausente.");
  return value;
}

export async function farmConfig(): Promise<{ minha_lavoura: boolean }> {
  return api("/api/config");
}

export async function savedAssessment(request: FarmContextValue["request"], id: string) {
  return request<Assessment>(`/avaliacoes/${encodeURIComponent(id)}`);
}
