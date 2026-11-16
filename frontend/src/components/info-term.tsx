import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function InfoTerm({
  label = "Entenda",
  children,
}: {
  label?: string;
  children: React.ReactNode;
}) {
  return (
    <TooltipProvider delayDuration={180}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="info-trigger"
            aria-label={label ? `${label}: abrir explicação` : "Abrir explicação"}
          >
            <Info className="size-4" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          className="max-w-72 rounded-xl bg-foreground p-3 text-sm leading-relaxed text-paper shadow-xl"
        >
          {children}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
