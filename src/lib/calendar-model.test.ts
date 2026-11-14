import { describe, expect, it } from "vitest";
import { CALENDAR_WINDOWS, FIXED_METRICS, STRATEGY_METRICS } from "@/demo/cereja-demo";
import {
  annualSegments,
  calendarWindows,
  monthWindows,
  SAMPLE_PROFILE,
  season,
} from "./calendar-model";
describe("calendário anual comparável", () => {
  it("normaliza faixa que cruza dezembro", () => {
    expect(annualSegments({ startMonth: 10, endMonth: 15 })).toEqual([
      [10, 12],
      [0, 3],
    ]);
  });
  it("mantém café em todas as estratégias", () => {
    for (const strategy of ["conventional", "cover", "intercrop"] as const)
      expect(calendarWindows(strategy, SAMPLE_PROFILE).some((item) => item.role === "coffee")).toBe(
        true,
      );
  });
  it("mostra uma única faixa do café e somente para plantio", () => {
    const coffee = CALENDAR_WINDOWS.filter((item) => item.role === "coffee");
    expect(coffee).toHaveLength(1);
    expect(coffee[0]?.id).toBe("coffee-planting");
    expect(coffee[0]?.activity).toBe("Plantio recomendado");
  });
  it("filtra apenas faixas opcionais", () => {
    expect(
      calendarWindows("conventional", SAMPLE_PROFILE).every((item) => item.role === "coffee"),
    ).toBe(true);
    expect(calendarWindows("cover", SAMPLE_PROFILE).some((item) => item.role === "cover")).toBe(
      true,
    );
    expect(
      calendarWindows("intercrop", SAMPLE_PROFILE).some((item) => item.role === "intercrop"),
    ).toBe(true);
  });
  it("mostra café primeiro e três possibilidades no cenário entrelinhas", () => {
    const windows = calendarWindows("intercrop", SAMPLE_PROFILE);
    expect(windows[0]?.role).toBe("coffee");
    expect(
      new Set(windows.filter((item) => item.role === "intercrop").map((item) => item.culture)),
    ).toEqual(new Set(["Feijão", "Arroz", "Abacaxi"]));
  });
  it("usa a mesma normalização na leitura mensal", () => {
    const crossingWindow = {
      ...CALENDAR_WINDOWS[0]!,
      id: "crossing",
      startMonth: 10,
      endMonth: 15,
    };
    expect(monthWindows([crossingWindow], 1).map((window) => window.id)).toEqual(["crossing"]);
  });
  it("mantém exatamente três métricas fixas e três dinâmicas", () => {
    expect(FIXED_METRICS).toHaveLength(3);
    for (const metrics of Object.values(STRATEGY_METRICS)) expect(metrics).toHaveLength(3);
  });
  it("distingue seco e chuvoso", () => {
    expect(season(10)).toBe("Chuvoso");
    expect(season(6)).toBe("Seco");
  });
});
