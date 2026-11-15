import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

describe("contratos do Cerejá para o hackathon", () => {
  it("explica público, decisão e papel consequente da NASA na landing", () => {
    const landing = source("../routes/index.tsx");
    expect(landing).toContain("Para café Canéfora de Rondônia");
    expect(landing).toContain("NASA só entra quando muda a decisão");
    expect(landing).toContain("Cobrir o solo ajuda");
    expect(landing).not.toMatch(/calendário anual|Montar calendário/i);
  });

  it("coleta coordenadas reais do talhão na conversa", () => {
    const chat = source("../routes/chat.tsx");
    expect(chat).toContain("TerritoryPicker");
    expect(chat).toContain("Confirmar ponto");
    expect(chat).toContain("Latitude");
    expect(chat).toContain("Longitude");
  });

  it("explica o processamento antes do resultado", () => {
    const analysing = source("../routes/analisando.tsx");
    expect(analysing).toContain("Consultando observações regionais");
    expect(analysing).toContain("diagnosis(saved.latitude, saved.longitude");
    expect(analysing).toContain('navigate({ to: "/minha-terra" })');
  });

  it("usa as APIs e mostra dados incompletos no resultado principal", () => {
    const land = source("../components/real-decision-page.tsx");
    expect(land).toContain("diagnosis(saved.latitude, saved.longitude");
    expect(land).toContain("assessment({ lat: answers.latitude");
    expect(land).toContain("days_available");
    expect(land).toContain("fora da avaliação");
  });

  it("mantém apenas Minha Terra e Aprender na navegação principal", () => {
    const shell = source("../components/cereja-shell.tsx");
    expect(shell).toContain('to: "/minha-terra"');
    expect(shell).toContain('label: "Minha Terra"');
    expect(shell).toContain('label: "Aprender"');
    expect(shell).not.toContain('label: "Análise"');
  });
});
