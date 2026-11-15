import { Link, useLocation } from "@tanstack/react-router";
import { BookOpen, Home, Map, MessageCircle } from "lucide-react";
import cherry from "@/assets/cereja-logo-v2.png";

const nav = [
  { to: "/minha-terra", label: "Minha Terra", icon: Map },
  { to: "/aprender", label: "Aprender", icon: BookOpen },
] as const;

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" aria-label="Cerejá — página inicial" className="inline-flex items-center gap-2.5">
      <img src={cherry} alt="" width={40} height={40} className="size-10 object-contain" />
      <span className={`brand ${compact ? "text-xl" : "text-2xl"}`}>Cerejá</span>
    </Link>
  );
}

export function AppNavigation() {
  const pathname = useLocation({ select: (location) => location.pathname });
  return (
    <>
      <aside className="sticky top-0 hidden h-svh w-64 shrink-0 flex-col border-r border-border bg-paper px-5 py-6 lg:flex">
        <Brand />
        <nav className="mt-10 space-y-1" aria-label="Navegação principal">
          {nav.map(({ to, label, icon: Icon }) => {
            const active = pathname === to;
            return (
              <Link
                key={to}
                to={to}
                aria-current={active ? "page" : undefined}
                className={`nav-link ${active ? "nav-link-active" : ""}`}
              >
                <Icon />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto space-y-3">
          <Link to="/chat" className="nav-link">
            <MessageCircle />
            Editar perfil
          </Link>
          <Link to="/" className="nav-link">
            <Home />
            Início
          </Link>
        </div>
      </aside>
      <nav
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-2 border-t border-border bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
        aria-label="Navegação principal"
      >
        {nav.map(({ to, label, icon: Icon }) => {
          const active = pathname === to;
          return (
            <Link
              key={to}
              to={to}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-semibold ${active ? "text-cherry" : "text-muted-foreground"}`}
            >
              <Icon className="size-5" />
              {label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}

export function AppPage({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh">
      <AppNavigation />
      <main className="min-w-0 flex-1 px-4 pb-24 pt-4 sm:px-6 lg:px-10 lg:pb-12 lg:pt-8">
        <div className="mx-auto max-w-[1180px]">
          <div className="mb-6 flex items-center justify-between lg:hidden">
            <Brand compact />
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
