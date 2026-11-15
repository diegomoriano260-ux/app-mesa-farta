"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconComment, IconHome, IconPlug, IconUsers, IconZap } from "./icons";

const items = [
  { href: "/", label: "Início", Icon: IconHome },
  { href: "/automacoes", label: "Automações", Icon: IconZap },
  { href: "/conversas", label: "Conversas", Icon: IconComment },
  { href: "/contatos", label: "Contatos", Icon: IconUsers },
  { href: "/canais", label: "Canais", Icon: IconPlug },
];

const isActive = (path: string, href: string) => (href === "/" ? path === "/" : path.startsWith(href));

export function TopNav() {
  const path = usePathname();
  return (
    <nav className="hidden items-center gap-1 md:flex">
      {items.map(({ href, label, Icon }) => (
        <Link key={href} href={href}
          className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition ${isActive(path, href) ? "bg-brand-50 text-brand-700" : "text-muted hover:bg-brand-50/60 hover:text-ink"}`}>
          <Icon className="h-[18px] w-[18px]" />{label}
        </Link>
      ))}
    </nav>
  );
}

// Barra de abas fixa embaixo, só no celular.
export function BottomNav() {
  const path = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      <div className="mx-auto grid max-w-lg grid-cols-5">
        {items.map(({ href, label, Icon }) => {
          const on = isActive(path, href);
          return (
            <Link key={href} href={href} className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium ${on ? "text-brand-600" : "text-muted"}`}>
              <span className={`rounded-full px-3 py-1 transition ${on ? "bg-brand-50" : ""}`}><Icon className="h-[22px] w-[22px]" /></span>
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
