import Link from "next/link";
import { requireUser, saasMode } from "@/lib/auth";
import { brl } from "@/lib/pricing";
import { sair } from "../entrar/actions";
import { IconLogout, IconPlus } from "@/components/icons";
import { UserScope } from "@/components/user-scope";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const u = await requireUser();
  const saas = saasMode();
  return (
    <div className="min-h-screen pb-10">
      <UserScope uid={u.id} />
      <header className="sticky top-0 z-20 border-b border-line bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-2 px-4 py-3">
          <Link href="/" className="flex flex-1 items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-700 font-black text-white shadow-sm">R</span>
            <span className="font-bold tracking-tight">Replace</span>
          </Link>
          {saas && u.is_admin && <Link href="/admin" className="rounded-xl px-2 py-2 text-sm font-medium text-muted hover:bg-brand-50">Admin</Link>}
          {saas && (
            <Link href="/creditos" className="rounded-xl bg-brand-50 px-3 py-2 text-sm font-semibold text-brand-700" title="Seus créditos">
              {u.is_admin ? "∞" : brl(u.balance_cents)}
            </Link>
          )}
          <Link href="/novo" className="btn-primary px-3 py-2"><IconPlus className="h-[18px] w-[18px]" /><span className="hidden sm:inline">Novo vídeo</span></Link>
          <form action={sair}>
            <button className="rounded-xl p-2 text-muted hover:bg-brand-50 hover:text-ink" title="Sair"><IconLogout className="h-5 w-5" /></button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6 md:py-10">{children}</main>
    </div>
  );
}
