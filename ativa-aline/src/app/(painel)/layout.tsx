import Link from "next/link";
import { requireSession } from "@/lib/session";
import { logout } from "../login/actions";
import { BottomNav, TopNav } from "@/components/nav";
import { IconLogout } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function PainelLayout({ children }: { children: React.ReactNode }) {
  await requireSession();
  return (
    <div className="min-h-screen pb-24 md:pb-10">
      <header className="sticky top-0 z-20 border-b border-line bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-6 px-4 py-3">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-700 text-sm font-bold text-white shadow-sm">AA</span>
            <span className="font-bold tracking-tight">Ativa Aline</span>
          </Link>
          <div className="flex-1"><TopNav /></div>
          <form action={logout}>
            <button className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm text-muted hover:bg-brand-50 hover:text-ink" title="Sair">
              <IconLogout className="h-[18px] w-[18px]" /><span className="hidden sm:inline">Sair</span>
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6 md:py-10">{children}</main>
      <BottomNav />
    </div>
  );
}
