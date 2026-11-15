import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FarmProvider, useFarm } from "./farm-client";

function json(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <FarmProvider>{children}</FarmProvider>
);

describe("Minha Lavoura: sessão privada", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.unstubAllGlobals());

  it("envia o token ao backend, não persiste a sessão e encerra o acesso no logout", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        json({ access_token: "token-A", refresh_token: "refresh-A", expires_in: 3600 }),
      )
      .mockResolvedValueOnce(json({ plots: [], cycles: [], tasks: [], assessments: [] }))
      .mockResolvedValueOnce(json({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);
    const { result } = renderHook(() => useFarm(), { wrapper });
    await act(async () => {
      expect(await result.current.signIn("a@example.org", "secret")).toBe(true);
    });
    expect(result.current.signedIn).toBe(true);
    await act(async () => {
      await result.current.request("");
    });
    expect(fetchMock.mock.calls.at(1)?.[0]).toBe("/api/lavoura");
    expect(new Headers(fetchMock.mock.calls.at(1)?.[1].headers).get("Authorization")).toBe(
      "Bearer token-A",
    );
    expect(JSON.stringify(localStorage)).not.toContain("token-A");
    await act(async () => {
      await result.current.signOut();
    });
    expect(result.current.signedIn).toBe(false);
    await expect(result.current.request("")).rejects.toThrow("Entre na sua conta");
  });

  it("descarta a sessão quando uma rota privada responde 401", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        json({ access_token: "token-B", refresh_token: "refresh-B", expires_in: 3600 }),
      )
      .mockResolvedValueOnce(json({ error: "Sessão inválida." }, 401));
    vi.stubGlobal("fetch", fetchMock);
    const { result } = renderHook(() => useFarm(), { wrapper });
    await act(async () => {
      await result.current.signIn("b@example.org", "secret");
    });
    await act(async () => {
      await expect(result.current.request("")).rejects.toThrow("Sessão inválida.");
    });
    expect(result.current.signedIn).toBe(false);
  });

  it("não entrega resposta atrasada da conta anterior após trocar de usuário", async () => {
    let finishFirst!: (response: Response) => void;
    const firstRequest = new Promise<Response>((resolve) => {
      finishFirst = resolve;
    });
    let loginCount = 0;
    const fetchMock = vi.fn((url: string, options: RequestInit) => {
      if (url === "/api/auth/login") {
        loginCount += 1;
        return Promise.resolve(
          json({
            access_token: `token-${loginCount}`,
            refresh_token: `refresh-${loginCount}`,
            expires_in: 3600,
          }),
        );
      }
      if (url === "/api/auth/logout") return Promise.resolve(json({ ok: true }));
      if (
        url === "/api/lavoura" &&
        new Headers(options.headers).get("Authorization") === "Bearer token-1"
      )
        return firstRequest;
      return Promise.resolve(
        json({ plots: [{ name: "Talhão B" }], cycles: [], tasks: [], assessments: [] }),
      );
    });
    vi.stubGlobal("fetch", fetchMock);
    const { result } = renderHook(() => useFarm(), { wrapper });
    await act(async () => {
      await result.current.signIn("a@example.org", "secret");
    });
    const pending = result.current.request<{ plots: Array<{ name: string }> }>("");
    await act(async () => {
      await result.current.signOut();
      await result.current.signIn("b@example.org", "secret");
    });
    finishFirst(json({ plots: [{ name: "Talhão A" }] }));
    await expect(pending).rejects.toThrow("A sessão terminou");
    const second = await result.current.request<{ plots: Array<{ name: string }> }>("");
    expect(second.plots[0]?.name).toBe("Talhão B");
    expect(new Headers(fetchMock.mock.calls.at(-1)?.[1]?.headers).get("Authorization")).toBe(
      "Bearer token-2",
    );
  });

  it("não reaproveita a renovação pendente da conta anterior", async () => {
    let finishOldRefresh!: (response: Response) => void;
    const oldRefresh = new Promise<Response>((resolve) => {
      finishOldRefresh = resolve;
    });
    let loginCount = 0;
    const fetchMock = vi.fn((url: string, options: RequestInit) => {
      if (url === "/api/auth/login") {
        loginCount += 1;
        return Promise.resolve(
          json({
            access_token: `token-${loginCount}`,
            refresh_token: `refresh-${loginCount}`,
            expires_in: 1,
          }),
        );
      }
      if (url === "/api/auth/refresh") {
        const body = JSON.parse(String(options.body)) as { refresh_token: string };
        return body.refresh_token === "refresh-1"
          ? oldRefresh
          : Promise.resolve(
              json({
                access_token: "token-2-new",
                refresh_token: "refresh-2-new",
                expires_in: 3600,
              }),
            );
      }
      if (url === "/api/auth/logout") return Promise.resolve(json({ ok: true }));
      return Promise.resolve(json({ plots: [{ name: "Talhão B" }] }));
    });
    vi.stubGlobal("fetch", fetchMock);
    const { result } = renderHook(() => useFarm(), { wrapper });
    await act(async () => {
      await result.current.signIn("a@example.org", "secret");
    });
    const oldRequest = result.current.request("");
    await act(async () => {
      await result.current.signOut();
      await result.current.signIn("b@example.org", "secret");
    });
    const fresh = await result.current.request<{ plots: Array<{ name: string }> }>("");
    expect(fresh.plots[0]?.name).toBe("Talhão B");
    const privateCall = fetchMock.mock.calls.find(([url]) => url === "/api/lavoura");
    expect(new Headers(privateCall?.[1]?.headers).get("Authorization")).toBe("Bearer token-2-new");
    finishOldRefresh(
      json({ access_token: "token-1-new", refresh_token: "refresh-1-new", expires_in: 3600 }),
    );
    await expect(oldRequest).rejects.toThrow("A sessão terminou");
  });
});
