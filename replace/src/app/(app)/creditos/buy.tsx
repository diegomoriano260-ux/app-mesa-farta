"use client";
import { useState } from "react";

export function BuyButton({ pack, label }: { pack: string; label: string }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  return (
    <div className="space-y-1">
      <button className="btn-primary w-full" disabled={busy} onClick={async () => {
        setBusy(true); setErr("");
        const r = await fetch("/api/pagamento", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pack }) });
        const d = await r.json();
        if (r.ok && d.url) window.location.href = d.url; else { setErr(d.error ?? "Erro"); setBusy(false); }
      }}>{busy ? "Abrindo o pagamento..." : label}</button>
      {err && <p className="text-xs text-red-700">{err}</p>}
    </div>
  );
}
