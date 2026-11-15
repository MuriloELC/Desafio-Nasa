import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { EMPTY_ANSWERS } from "@/lib/onboarding";
import { ANSWERS_STORAGE_KEY } from "@/lib/storage";
import { RealDecisionPage } from "./real-decision-page";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: ReactNode }) => <span>{children}</span>,
}));
vi.mock("@/components/cereja-shell", () => ({
  AppPage: ({ children }: { children: ReactNode }) => <main>{children}</main>,
}));
vi.mock("@/components/territory-map", () => ({
  TerritoryMap: () => <div role="img" aria-label="Mapa de satélite" />,
}));

function json(value: unknown) {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

const diagnosis = {
  latitude: -11.44,
  longitude: -61.45,
  inside: true,
  cell_id: "CAC_S_03_04",
  cell_grid_km: 5,
  municipality: "1100049",
  daily: [],
  static: [],
  missing: [],
  summary: [
    {
      metric: "precip_30d_mm",
      source_id: "POWER",
      unit: "mm",
      start_on: "2026-10-14",
      end_on: "2026-11-12",
      days_available: 30,
      value: 164,
      baseline: 151,
      period_count: 5,
      spread: null,
    },
    {
      metric: "temp_mean_30d_c",
      source_id: "POWER",
      unit: "C",
      start_on: "2026-10-14",
      end_on: "2026-11-12",
      days_available: 30,
      value: 26.1,
      baseline: 25.7,
      period_count: 5,
      spread: null,
    },
    {
      metric: "soil_ph",
      source_id: "SOILGRIDS",
      unit: "pH",
      start_on: null,
      end_on: null,
      days_available: 1,
      value: 4.7,
      baseline: 4.8,
      period_count: 60,
      spread: 0.15,
    },
  ],
};

describe("Minha Terra refinada", () => {
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
        },
        step: 16,
      }),
    );
  });
  afterEach(() => vi.unstubAllGlobals());

  it("mostra mapa e três indicadores territoriais", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(json(diagnosis)));
    render(<RealDecisionPage />);
    expect(await screen.findByRole("img", { name: "Mapa de satélite" })).toBeInTheDocument();
    expect(screen.getByText("164")).toBeInTheDocument();
    expect(screen.getByText("26,1")).toBeInTheDocument();
    expect(screen.getByText("4,7")).toBeInTheDocument();
    expect(screen.getAllByText(/Na média/)).toHaveLength(3);
    expect(screen.queryByText(/Calendário técnico/)).not.toBeInTheDocument();
  });

  it("envia a estratégia e apresenta somente três sugestões", async () => {
    const recommendation = {
      inside: true,
      strategy: "permanente",
      candidates: [
        {
          culture_id: "amendoim",
          name: "Amendoim-forrageiro",
          state: "sem_dados",
          missing: [],
          reasons: ["Revisar em campo."],
          sources: [],
        },
        {
          culture_id: "braquiaria",
          name: "Braquiária-ruziziensis",
          state: "sem_dados",
          missing: [],
          reasons: ["Revisar em campo."],
          sources: [],
        },
        {
          culture_id: "guandu",
          name: "Guandu-anão",
          state: "sem_dados",
          missing: [],
          reasons: ["Revisar em campo."],
          sources: [],
        },
      ],
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json(diagnosis))
      .mockResolvedValueOnce(json(recommendation));
    vi.stubGlobal("fetch", fetchMock);
    render(<RealDecisionPage />);
    await screen.findByText("Cobertura permanente");
    fireEvent.click(screen.getByRole("button", { name: /Cobertura permanente/ }));
    fireEvent.click(screen.getByRole("button", { name: "Ver 3 sugestões" }));
    await screen.findByText("Amendoim-forrageiro");
    expect(screen.getByText("Braquiária-ruziziensis")).toBeInTheDocument();
    expect(screen.getByText("Guandu-anão")).toBeInTheDocument();
    const body = JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body));
    expect(body.field.strategy).toBe("permanente");
  });

  it("não bloqueia as sugestões pelo tipo de café informado", async () => {
    localStorage.setItem(
      ANSWERS_STORAGE_KEY,
      JSON.stringify({
        answers: {
          ...EMPTY_ANSWERS,
          city: "Cacoal · RO",
          coffee: "Arábica",
          latitude: -11.44,
          longitude: -61.45,
        },
        step: 16,
      }),
    );
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(json(diagnosis)));
    render(<RealDecisionPage />);
    await screen.findByText("Cobertura permanente");
    fireEvent.click(screen.getByRole("button", { name: /Cobertura permanente/ }));
    expect(screen.getByRole("button", { name: "Ver 3 sugestões" })).toBeEnabled();
  });

  it("não avalia ponto fora da área piloto", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(json({ ...diagnosis, inside: false, cell_id: null })),
    );
    render(<RealDecisionPage />);
    expect(await screen.findByText(/fora da área piloto/)).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: /sugestões/ })).not.toBeInTheDocument(),
    );
  });
});
