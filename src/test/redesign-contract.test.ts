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

  it("permite delimitar o talhão por polígono na conversa", () => {
    const chat = source("../routes/chat.tsx");
    expect(chat).toContain("TerritoryPicker");
    expect(chat).toContain("Confirmar área");
    expect(chat).toContain("Delimite o talhão");
  });

  it("explica o processamento antes do resultado", () => {
    const analysing = source("../routes/analisando.tsx");
    expect(analysing).toContain("Lendo chuva e umidade regional");
    expect(analysing).toContain("Comparando coberturas e ressalvas");
    expect(analysing).toContain('navigate({ to: "/minha-terra" })');
  });

  it("entrega três estratégias, trade-offs, tempo e evidências", () => {
    const land = source("../routes/calendario.tsx");
    expect(land).toContain("Não existe uma cobertura universal");
    expect(land).toContain("O que muda se eu escolher esta cobertura?");
    expect(land).toContain("Trade-off dominante");
    expect(land).toContain("Por que o Cerejá chegou aqui");
    expect(land).not.toMatch(/Compatibilidade.*%|score/i);
  });

  it("mantém apenas Minha Terra e Aprender na navegação principal", () => {
    const shell = source("../components/cereja-shell.tsx");
    expect(shell).toContain('to: "/minha-terra"');
    expect(shell).toContain('label: "Minha Terra"');
    expect(shell).toContain('label: "Aprender"');
    expect(shell).not.toContain('label: "Análise"');
  });

  it("documenta auditoria e redefinição antes da implementação", () => {
    expect(source("../../docs/AUDIT_CURRENT_PRODUCT.md")).toContain("KEEP");
    expect(source("../../docs/PRODUCT_REDEFINITION.md")).toContain("Feature assinatura");
  });
});
