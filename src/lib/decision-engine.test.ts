import { describe, expect, it } from "vitest";
import { DEMO_FARMS } from "@/demo/decision-demo";
import { evaluateStrategies } from "./decision-engine";

describe("motor explicável de estratégias", () => {
  it("produz prioridades diferentes para contextos diferentes", () => {
    const rainfed = evaluateStrategies(DEMO_FARMS[0]!);
    const irrigated = evaluateStrategies(DEMO_FARMS[1]!);
    expect(rainfed[0]?.id).toBe("managed");
    expect(irrigated[0]?.id).toBe("permanent");
  });

  it("liga a ressalva hídrica a uma evidência NASA", () => {
    const result = evaluateStrategies(DEMO_FARMS[0]!).find((item) => item.id === "permanent");
    expect(result?.why.join(" ")).toMatch(/seca regional/i);
    expect(result?.evidence.some((item) => item.source.includes("SMAP"))).toBe(true);
  });

  it("não expõe score numérico na saída", () => {
    expect(evaluateStrategies(DEMO_FARMS[0]!)[0]).not.toHaveProperty("score");
  });
});
