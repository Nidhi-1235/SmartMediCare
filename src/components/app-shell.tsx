import { Link, useRouterState } from "@tanstack/react-router";
import { CalendarClock, Home, MessageCircleHeart, ScanLine, Settings2 } from "lucide-react";
import type { ReactNode } from "react";
import { SosButton } from "./sos-button";
import { VoiceCommandBar } from "./voice-command-bar";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/home", labelKey: "nav.home", icon: Home },
  { to: "/scan", labelKey: "nav.scan", icon: ScanLine },
  { to: "/schedule", labelKey: "nav.schedule", icon: CalendarClock },
  { to: "/assistant", labelKey: "nav.assistant", icon: MessageCircleHeart },
  { to: "/more", labelKey: "nav.more", icon: Settings2 },
] as const;

export function AppShell({
  title,
  subtitle,
  children,
  action,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { t } = useI18n();

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col bg-background">
      <a
        href="#main"
        className="sr-only-focusable focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:h-auto focus:w-auto focus:rounded-lg focus:bg-primary focus:px-4 focus:py-3 focus:text-primary-foreground"
      >
        Skip to main content
      </a>

      <header className="sticky top-0 z-30 border-b border-border bg-card/95 px-5 py-4 backdrop-blur">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <div className="min-w-0">
            <h1 className="truncate font-display text-2xl font-bold text-foreground">{title}</h1>
            {subtitle ? <p className="truncate text-sm text-muted-foreground">{subtitle}</p> : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      </header>

      <main id="main" className="flex-1 px-5 pb-44 pt-5">
        {children}
      </main>

      <SosButton />

      <nav
        aria-label="Main navigation"
        className="fixed bottom-0 left-1/2 z-30 w-full max-w-2xl -translate-x-1/2 border-t border-border bg-card px-2 pb-[env(safe-area-inset-bottom)] pt-1"
      >
        <ul className="grid grid-cols-5">
          {NAV.map(({ to, label, icon: Icon }) => {
            const active = pathname === to || pathname.startsWith(`${to}/`);
            return (
              <li key={to}>
                <Link
                  to={to}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "tap-target flex flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-xs font-semibold transition-colors",
                    active ? "bg-secondary text-primary" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon aria-hidden="true" className="size-6" strokeWidth={active ? 2.6 : 2} />
                  <span>{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
