import { db } from "@/lib/db";
import { disconnect } from "./actions";
import { WhatsappForm } from "./whatsapp-form";

const statusLabel: Record<string, [string, string]> = {
  connected: ["conectado", "bg-green-50 text-green-700"],
  token_expired: ["token expirou: reconecte", "bg-amber-50 text-amber-800"],
  error: ["erro", "bg-red-50 text-red-700"],
};

export default async function Canais({ searchParams }: { searchParams: Promise<{ ok?: string; erro?: string }> }) {
  const sp = await searchParams;
  const channels = await db()<{ id: string; kind: string; display_name: string | null; status: string; token_expires_at: Date | null; last_error: string | null }[]>`
    select id, kind, display_name, status, token_expires_at, last_error from channels
    where status <> 'disconnected' order by kind, created_at`;

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">Canais</h1>
      {sp.ok && <div className="card border-green-200 bg-green-50 text-green-800">Instagram conectado.</div>}
      {sp.erro && <div className="card border-red-200 bg-red-50 text-red-800">Não deu para conectar: {sp.erro}</div>}

      {channels.length > 0 && (
        <div className="space-y-3">
          {channels.map((c) => {
            const [label, cls] = statusLabel[c.status] ?? [c.status, "bg-neutral-100"];
            return (
              <div key={c.id} className="card flex flex-wrap items-center gap-4">
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{c.kind === "instagram" ? "Instagram" : "WhatsApp"}: {c.display_name}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-neutral-500">
                    <span className={`badge ${cls}`}>{label}</span>
                    {c.token_expires_at && <span>token renova sozinho; vence em {c.token_expires_at.toLocaleDateString("pt-BR")}</span>}
                    {c.last_error && <span className="text-red-700">{c.last_error.slice(0, 120)}</span>}
                  </div>
                </div>
                <form action={disconnect}>
                  <input type="hidden" name="id" value={c.id} />
                  <button className="btn-danger">Desconectar</button>
                </form>
              </div>
            );
          })}
        </div>
      )}

      <section className="card space-y-3">
        <h2 className="text-lg font-semibold">Instagram</h2>
        <p className="text-sm text-neutral-600">
          A Aline entra com o Instagram dela e autoriza o app a ler comentários e mandar mensagens.
          A conta precisa ser profissional e estar como testadora no app da Meta.
        </p>
        <a href="/api/auth/instagram/start" className="btn-primary">Conectar Instagram</a>
      </section>

      <section className="card space-y-3">
        <h2 className="text-lg font-semibold">WhatsApp</h2>
        <WhatsappForm />
      </section>
    </div>
  );
}
