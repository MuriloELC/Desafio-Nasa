import { afterEach, describe, expect, it, vi } from "vitest";
import { assessment, calendar, diagnosis, evidence } from "./cereja-api";

afterEach(() => vi.unstubAllGlobals());

describe("cliente das APIs públicas", () => {
  it("usa somente endpoints relativos e preserva cobertura incompleta", async () => {
    const mock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ inside: true, daily: [], static: [] })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ months: [], rules: [] })))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            inside: true,
            candidates: [],
            coverage: [
              { source_id: "IMERG_FINAL", days_available: 20, days_expected: 30, value: null },
            ],
          }),
        ),
      );
    vi.stubGlobal("fetch", mock);
    await diagnosis(-11.44, -61.45);
    await calendar("1100049");
    const result = await assessment({
      lat: -11.44,
      lon: -61.45,
      field: {
        phase: null,
        water: null,
        age_years: null,
        spacing_m: null,
        soil_ph: null,
        nematodes: null,
        can_manage: null,
        soil_assessed: null,
        moisture_checked: null,
      },
    });
    expect(mock.mock.calls.map((call) => call[0])).toEqual([
      "/api/consulta?lat=-11.44&lon=-61.45&raio=20",
      "/api/calendario?municipio=1100049",
      "/api/recomendacoes",
    ]);
    expect(result.coverage?.[0]).toMatchObject({
      days_available: 20,
      days_expected: 30,
      value: null,
    });
  });

  it("separa observação, relato de campo, referência e ausência", () => {
    expect(evidence(4.5, "observado").status).toBe("observado");
    expect(evidence(false, "informado").status).toBe("informado");
    expect(evidence("Regra v1", "referencia").status).toBe("referencia");
    expect(evidence(null, "observado").status).toBe("indisponivel");
  });

  it("expõe falha de conexão sem substituir por dados simulados", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("network failed")));
    await expect(diagnosis(-11.44, -61.45)).rejects.toThrow("API está indisponível");
  });
});
