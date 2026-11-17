import { redirect } from "next/navigation";
import { hasSession } from "@/lib/session";
import { LoginForm } from "./form";

export default async function LoginPage() {
  if (await hasSession()) redirect("/");
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 via-canvas to-white px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-brand-400 to-brand-700 text-2xl font-black text-white shadow-lg shadow-brand-200">R</div>
          <h1 className="text-2xl font-bold tracking-tight">Replace</h1>
          <p className="mt-1 text-sm text-muted">Transcrição, resumo e clipes com IA</p>
        </div>
        <div className="card p-6"><LoginForm /></div>
      </div>
    </main>
  );
}
