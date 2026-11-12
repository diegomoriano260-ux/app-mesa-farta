import { db } from "@/lib/db";
import { disconnect } from "./actions";
import { WhatsappForm } from "./whatsapp-form";
import { Notice, PageHeader } from "@/components/ui";
import { ConfirmButton } from "@/components/confirm-button";
import { IconCheck, IconInstagram, IconWhatsapp } from "@/components/icons";

const statusLabel: Record<string, [string, string]> = {
  connected: ["conectado", "bg-green-50 text-green-700"],
  token_expired: ["reconecte", "bg-amber-50 text-amber-800"],
  error: ["com erro", "bg-red-50 text-red-700"],
};

export default async function Canais({ searchParams }: { searchParams: Promise<{ ok?: string; erro?: string }> }) {
  const sp = await searchParams;
  const channels = await db()<{ id: string; kind: string; display_name: string | null; status: string; token_expires_at: Date | null; last_error: string | null }[]>`
    select id, kind, display_name, status, token_expires_at, last_error from channels
    where status <> 'disconnected' order by kind, created_at`;
  const hasIg = channels.some((c) => c.kind === "instagram");
  const hasWa = channels.some((c) => c.kind === "whatsapp");

  return (
    <div className="space-y-5">
      <PageHeader title="Canais" subtitle="As contas que o Ativa Aline usa para responder." />
      {sp.ok && <Notice tone="ok">Instagram conectado! Agora é só criar uma automação.</Notice>}
      {sp.erro && <Notice tone="error">Não deu para conectar: {sp.erro}</Notice>}

      {channels.map((c) => {
        const [label, cls] = statusLabel[c.status] ?? [c.status, "bg-neutral-100"];
        const ig = c.kind === "instagram";
        return (
          <div key={c.id} className="card flex flex-wrap items-center gap-4">
            <div className={`flex h-12 w-12 items-center justify-center rounded-2xl text-white ${ig ? "bg-gradient-to-br from-[#f58529] via-[#dd2a7b] to-[#8134af]" : "bg-[#25d366]"}`}>
              {ig ? <IconInstagram className="h-6 w-6" /> : <IconWhatsapp className="h-6 w-6" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{c.display_name}</p>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                <span className={`badge ${cls}`}>{c.status === "connected" && <IconCheck className="h-3 w-3" />}{label}</span>
                {c.token_expires_at && c.status === "connected" && <span>renova sozinho</span>}
                {c.last_error && c.status !== "connected" && <span className="text-red-700">{c.last_error.slice(0, 100)}</span>}
              </div>
            </div>
            <div className="flex gap-2">
              {ig && c.status !== "connected" && <a href="/api/auth/instagram/start" className="btn-primary">Reconectar</a>}
              <form action={disconnect}>
                <input type="hidden" name="id" value={c.id} />
                <ConfirmButton message="Desconectar este canal? As automações dele param de responder." className="btn-secondary">Desconectar</ConfirmButton>
              </form>
            </div>
          </div>
        );
      })}

      {!hasIg && (
        <section className="card overflow-hidden p-0">
          <div className="bg-gradient-to-br from-[#f58529] via-[#dd2a7b] to-[#8134af] p-5 text-white">
            <IconInstagram className="h-8 w-8" />
            <h2 className="mt-3 text-lg font-bold">Instagram</h2>
            <p className="text-sm text-white/85">Responda comentários e mensagens do Direct automaticamente.</p>
          </div>
          <div className="space-y-4 p-5">
            <ul className="space-y-2 text-sm text-muted">
              <li className="flex gap-2"><IconCheck className="h-5 w-5 shrink-0 text-green-600" />A conta precisa ser profissional (Criador ou Empresa).</li>
              <li className="flex gap-2"><IconCheck className="h-5 w-5 shrink-0 text-green-600" />A Aline entra com o Instagram dela. Ninguém vê a senha.</li>
            </ul>
            <a href="/api/auth/instagram/start" className="btn-primary w-full py-3 sm:w-auto">Conectar Instagram</a>
          </div>
        </section>
      )}

      {!hasWa && (
        <details className="card group">
          <summary className="flex cursor-pointer list-none items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#25d366] text-white"><IconWhatsapp className="h-6 w-6" /></div>
            <div className="flex-1">
              <p className="font-semibold">WhatsApp</p>
              <p className="text-sm text-muted">Opcional. Precisa da API oficial do WhatsApp na Meta.</p>
            </div>
            <span className="text-sm font-semibold text-brand-600 group-open:hidden">Configurar</span>
          </summary>
          <div className="mt-5 border-t border-line pt-5"><WhatsappForm /></div>
        </details>
      )}
    </div>
  );
}
