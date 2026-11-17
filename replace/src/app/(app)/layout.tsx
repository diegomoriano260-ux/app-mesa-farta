import Link from "next/link";
import { requireSession } from "@/lib/session";
import { logout } from "../login/actions";
import { IconLogout, IconPlus } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireSession();
  return (
    <div className="min-h-screen pb-10">
      <header className="sticky top-0 z-20 border-b border-line bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
          <Link href="/" className="flex flex-1 items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-700 font-black text-white shadow-sm">R</span>
            <span className="font-bold tracking-tight">Replace</span>
          </Link>
          <Link href="/novo" className="btn-primary px-3 py-2"><IconPlus className="h-[18px] w-[18px]" /><span className="hidden sm:inline">Novo vídeo</span></Link>
          <form action={logout}>
            <button className="rounded-xl p-2 text-muted hover:bg-brand-50 hover:text-ink" title="Sair"><IconLogout className="h-5 w-5" /></button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6 md:py-10">{children}</main>
    </div>
  );
}
