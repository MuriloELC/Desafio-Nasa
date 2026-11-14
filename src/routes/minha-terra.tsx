import { createFileRoute } from "@tanstack/react-router";
import { LandDecisionPage } from "./calendario";

export const Route = createFileRoute("/minha-terra")({
  head: () => ({
    meta: [
      { title: "Minha Terra · Cerejá" },
      {
        name: "description",
        content: "Compare estratégias de cobertura da entrelinha e entenda cada trade-off.",
      },
    ],
  }),
  component: LandDecisionPage,
});
