import { describe, expect, it } from "vitest";
import {
  CITIES,
  EMPTY_ANSWERS,
  QUESTIONS,
  calendarProfile,
  updateAnswer,
  validPositiveNumber,
} from "./onboarding";

describe("conversa orientada à decisão", () => {
  it("restringe as sugestões a Rondônia", () => {
    expect(CITIES.every((city) => city.endsWith("· RO"))).toBe(true);
  });

  it("valida o espaçamento positivo com vírgula decimal", () => {
    expect(validPositiveNumber("3,5 m")).toBe(true);
    expect(validPositiveNumber("-1")).toBe(false);
    expect(validPositiveNumber("0")).toBe(false);
  });

  it("edita um campo sem apagar respostas seguintes", () => {
    const filled = { ...EMPTY_ANSWERS, name: "Lucas", city: "Cacoal · RO", coffee: "Conilon" };
    expect(updateAnswer(filled, 0, "Luís")).toMatchObject({
      name: "Luís",
      city: "Cacoal · RO",
      coffee: "Conilon",
    });
  });

  it("pergunta apenas fatores que mudam a avaliação", () => {
    expect(QUESTIONS.join(" ")).toMatch(/irrigação/i);
    expect(QUESTIONS.join(" ")).toMatch(/solo.*descoberto/i);
    expect(QUESTIONS.join(" ")).toMatch(/melhorar/i);
    expect(QUESTIONS.join(" ")).toMatch(/frequência.*manejar/i);
    expect(QUESTIONS.join(" ")).not.toMatch(/quantos pés|hectares/i);
  });

  it("leva contexto de água, manejo e objetivo ao perfil", () => {
    const profile = calendarProfile({
      ...EMPTY_ANSWERS,
      name: "Lucas",
      city: "Cacoal · RO",
      territoryPolygon: [
        { x: 10, y: 20 },
        { x: 50, y: 20 },
        { x: 30, y: 60 },
      ],
      rowSpacing: "3 m",
      irrigation: "Não possui",
      currentManagement: "Vegetação espontânea roçada",
      soilExposure: "Parte da entrelinha",
      goal: "Conservar água",
      managementCapacity: "A cada 2–3 meses",
    });
    expect(profile).toMatchObject({
      interrowSpacingM: 3,
      irrigation: "none",
      currentManagement: "spontaneous",
      soilExposure: "medium",
      goal: "water",
      managementCapacity: "medium",
      location: { polygon: expect.any(Array) },
    });
  });
});
