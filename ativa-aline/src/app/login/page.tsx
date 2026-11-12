import { redirect } from "next/navigation";
import { hasSession } from "@/lib/session";
import { LoginForm } from "./form";

export default async function LoginPage() {
  if (await hasSession()) redirect("/");
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="card w-full max-w-sm">
        <h1 className="text-xl font-semibold">Ativa Aline</h1>
        <p className="mb-6 text-sm text-neutral-500">Automação do Instagram e WhatsApp</p>
        <LoginForm />
      </div>
    </main>
  );
}
