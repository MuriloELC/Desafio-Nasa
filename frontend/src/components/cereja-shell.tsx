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
  return (
    <header className="app-top">
      <div className="app-top-inner">
        <Brand />
        <div className="app-top-actions">
          <Link to="/chat" className="ui-btn">
            <MessageCircle className="size-4" /> Editar propriedade
          </Link>
          <Link to="/" className="ui-btn green">
            <Home className="size-4" /> Página inicial
          </Link>
        </div>
      </div>
    </header>
  );
}

export function AppPage({ children }: { children: React.ReactNode }) {
  const pathname = useLocation({ select: (location) => location.pathname });
  return (
    <div className="app-page-shell">
      <AppNavigation />
      <div className="app-container app-grid">
        <aside className="app-aside">
          <h2>Seu território</h2>
          <nav className="app-nav" aria-label="Navegação principal">
            {nav.map(({ to, label, icon: Icon }) => {
              const active = pathname === to;
              return (
                <Link key={to} to={to} aria-current={active ? "page" : undefined} className="app-tab">
                  <Icon className="size-4" /> {label === "Minha Terra" ? "Visão geral" : label}
                </Link>
              );
            })}
            <a href="#estrategias" className="app-tab"><span className="emoji">🌱</span> Estratégias</a>
            <a href="#impacto" className="app-tab"><span className="emoji">↗</span> Impacto</a>
            <a href="#plano" className="app-tab"><span className="emoji">▣</span> Meu plano</a>
          </nav>
        </aside>
        <main className="app-main">
          <div className="app-view">{children}</div>
        </main>
      </div>
    </div>
  );
}
