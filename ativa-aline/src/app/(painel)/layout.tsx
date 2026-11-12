import Link from "next/link";
import { requireSession } from "@/lib/session";
import { logout } from "../login/actions";

export const dynamic = "force-dynamic";

const nav = [
  { href: "/", label: "Painel" },
  { href: "/automacoes", label: "Automações" },
  { href: "/contatos", label: "Contatos" },
  { href: "/canais", label: "Canais" },
];

export default async function PainelLayout({ children }: { children: React.ReactNode }) {
  await requireSession();
  return (
    <div className="min-h-screen">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <Link href="/" className="font-semibold text-brand-700">Ativa Aline</Link>
          <nav className="flex flex-1 flex-wrap gap-4 text-sm">
            {nav.map((n) => (
              <Link key={n.href} href={n.href} className="text-neutral-600 hover:text-neutral-900">{n.label}</Link>
            ))}
          </nav>
          <form action={logout}><button className="text-sm text-neutral-500 hover:text-neutral-800">Sair</button></form>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
