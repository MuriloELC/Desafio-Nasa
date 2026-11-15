import { createFileRoute } from "@tanstack/react-router";
import { RealDecisionPage } from "@/components/real-decision-page";

export const Route = createFileRoute("/calendario")({
  head: () => ({
    meta: [
      { title: "Calendário técnico · Cerejá" },
      { name: "description", content: "Calendário de referência e contexto regional da lavoura." },
    ],
  }),
  component: RealDecisionPage,
});
