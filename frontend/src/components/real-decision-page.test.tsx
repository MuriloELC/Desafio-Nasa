import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { EMPTY_ANSWERS } from "@/lib/onboarding";
import { ANSWERS_STORAGE_KEY } from "@/lib/storage";
import { RealDecisionPage } from "./real-decision-page";

const fixturePaths = Object.fromEntries(
  ["diagnosis", "calendar", "recommendation"].map((name) => [
    name,
    resolve(process.cwd(), `../tests/fixtures/api_real/${name}.json`),
  ]),
);
const realFixturesReady = Object.values(fixturePaths).every((path) => existsSync(path));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: ReactNode }) => <span>{children}</span>,
}));
vi.mock("@/components/cereja-shell", () => ({
  AppPage: ({ children }: { children: ReactNode }) => <main>{children}</main>,
}));

function json(value: unknown) {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

describe("jornada pública com respostas da API", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(
      ANSWERS_STORAGE_KEY,
      JSON.stringify({
        answers: {
          ...EMPTY_ANSWERS,
          city: "Cacoal · RO",
          coffee: "Robusta/Conilon",
          latitude: -11.44,
          longitude: -61.45,
          phase: "Formação",
          age: "2",
          rowSpacing: "3 m",
          irrigation: "Não possui",
          soilPh: "Não tenho análise",
        },
        step: 16,
      }),
    );
  });
  afterEach(() => vi.unstubAllGlobals());

  it("mostra solo regional sem adotá-lo como pH local e marca IMERG incompleto", async () => {
    const source = {
      source_id: "SOILGRIDS",
      product: "SoilGrids 2.0",
      native_resolution: "250 m",
      url: "https://docs.isric.org/globaldata/soilgrids/wcs.html",
      quality: "estimated",
      depth_top_cm: 0,
      depth_bottom_cm: 5,
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        json({
          latitude: -11.44,
          longitude: -61.45,
          inside: true,
          cell_id: "CAC_S_03_04",
          cell_grid_km: 5,
          municipality: "1100049",
          daily: [],
          static: [{ ...source, metric: "soil_ph", value: 4.5, unit: "pH" }],
          missing: [],
        }),
      )
      .mockResolvedValueOnce(
        json({
          year: 2026,
          months: [10],
          today_month: 11,
          cultures: [{ culture_id: "milheto", name: "Milheto", kind: "entrelinha" }],
          rules: [],
        }),
      )
      .mockResolvedValueOnce(
        json({
          inside: true,
          method_version: "cereja-regras-1",
          reference_date: "2026-11-15",
          candidates: [
            {
              culture_id: "milheto",
              name: "Milheto",
              state: "sem_dados",
              missing: ["pH medido em análise de solo"],
              reasons: ["Falta análise local."],
              sources: [],
            },
          ],
          coverage: [
            {
              source_id: "IMERG_FINAL",
              metric: "precip_mm",
              product: "IMERG",
              native_resolution: "0.1°",
              url: "https://gpm.nasa.gov",
              start_on: "2025-10-01",
              end_on: "2025-10-30",
              days_available: 20,
              days_expected: 30,
              value: null,
            },
          ],
        }),
      );
    vi.stubGlobal("fetch", fetchMock);
    render(<RealDecisionPage />);
    await screen.findByText(/pH regional do solo/);
    expect(
      screen.getByText(/Estimativa regional; não substitui análise do talhão/),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Comparar candidatas" }));
    await screen.findByText(/Antes de agir, verificar/);
    expect(screen.getAllByText(/Falta análise local/)).toHaveLength(2);
    const assessmentCall = fetchMock.mock.calls.find(([url]) => url === "/api/recomendacoes");
    expect(assessmentCall).toBeDefined();
    expect(JSON.parse(assessmentCall![1].body).field).toMatchObject({
      soil_ph: null,
      phase: "formacao",
      age_years: 2,
      spacing_m: 3,
    });
    fireEvent.click(screen.getByText("Cobertura dos períodos climáticos"));
    await waitFor(() =>
      expect(screen.getByText(/20\/30 dias.*incompleto, fora da avaliação/)).toBeInTheDocument(),
    );
    fireEvent.change(screen.getByRole("spinbutton", { name: /pH da análise local/ }), {
      target: { value: "5.2" },
    });
    expect(screen.queryByText("Candidatas para estudar")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Comparar candidatas" })).toBeEnabled();
  });

  it("impede a avaliação quando o ponto está fora do círculo piloto", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      json({
        latitude: -11.44,
        longitude: -61.45,
        inside: false,
        cell_id: null,
        cell_grid_km: 5,
        municipality: null,
        daily: [],
        static: [],
        missing: ["observações climáticas"],
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    render(<RealDecisionPage />);
    expect(
      await screen.findByText(/Diagnóstico indisponível fora da área piloto/),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Comparar candidatas" })).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("descarta uma avaliação pendente quando o produtor muda o campo", async () => {
    let finish!: (response: Response) => void;
    const pending = new Promise<Response>((resolve) => {
      finish = resolve;
    });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        json({
          latitude: -11.44,
          longitude: -61.45,
          inside: true,
          cell_id: "CAC_S_03_04",
          cell_grid_km: 5,
          municipality: "1100049",
          daily: [],
          static: [],
          missing: [],
        }),
      )
      .mockResolvedValueOnce(json({ year: 2026, months: [10], rules: [], cultures: [] }))
      .mockImplementationOnce(() => pending);
    vi.stubGlobal("fetch", fetchMock);
    render(<RealDecisionPage />);
    await screen.findByRole("button", { name: "Comparar candidatas" });
    fireEvent.click(screen.getByRole("button", { name: "Comparar candidatas" }));
    await screen.findByRole("button", { name: "Avaliando…" });
    fireEvent.change(screen.getByRole("spinbutton", { name: /pH da análise local/ }), {
      target: { value: "5.2" },
    });
    finish(
      json({
        inside: true,
        candidates: [
          {
            culture_id: "milheto",
            name: "Milheto",
            state: "favoravel",
            reasons: ["Resultado antigo."],
            missing: [],
            sources: [],
          },
        ],
      }),
    );
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Comparar candidatas" })).toBeEnabled(),
    );
    expect(screen.queryByText("Candidatas para estudar")).not.toBeInTheDocument();
    expect(screen.queryByText("Resultado antigo.")).not.toBeInTheDocument();
  });

  it("informa falha da API sem apresentar observações demonstrativas", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("network failure")));
    render(<RealDecisionPage />);
    expect(await screen.findByRole("alert")).toHaveTextContent("A API está indisponível");
    expect(screen.queryByText("O que foi observado")).not.toBeInTheDocument();
  });

  it.skipIf(!realFixturesReady)("consome as três respostas capturadas do gateway", async () => {
    const fixtures = Object.fromEntries(
      Object.entries(fixturePaths).map(([name, path]) => [
        name,
        JSON.parse(readFileSync(path, "utf8")) as unknown,
      ]),
    );
    const fetchMock = vi.fn((url: string, _options?: RequestInit) => {
      const name = url.startsWith("/api/consulta")
        ? "diagnosis"
        : url.startsWith("/api/calendario")
          ? "calendar"
          : "recommendation";
      return Promise.resolve(json(fixtures[name]));
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<RealDecisionPage />);
    await screen.findByText(/pH regional do solo/);
    fireEvent.click(screen.getByRole("button", { name: "Comparar candidatas" }));
    await screen.findByText("Candidatas para estudar");
    const call = fetchMock.mock.calls.find(([url]) => url === "/api/recomendacoes");
    expect(call).toBeDefined();
    expect(JSON.parse(String(call?.[1]?.body)).field.soil_ph).toBeNull();
  });
});
