"use client";
import { upload } from "@vercel/blob/client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { brl, upscaleCost } from "@/lib/pricing";
import { CompareSlider } from "./compare";
import { IconDownload, IconSparkles } from "./icons";

export function UpscalePanel({ clip, seconds, name, aspect }: { clip: Blob; seconds: number; name: string; aspect: string }) {
  const [res, setRes] = useState<"1080p" | "4k">("1080p");
  const [step, setStep] = useState<"idle" | "upload" | "ia" | "baixar" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");
  const [needCredit, setNeedCredit] = useState(false);
  const [out, setOut] = useState<{ local: string; remote: string; blob: Blob } | null>(null);
  const [me, setMe] = useState<{ is_admin: boolean; balance_cents: number; saas: boolean } | null>(null);
  const [demoState, setDemoState] = useState<"" | "salvando" | "ok">("");
  const before = useMemo(() => URL.createObjectURL(clip), [clip]);
  const cost = upscaleCost(seconds, res);

  useEffect(() => { fetch("/api/me").then((r) => r.json()).then(setMe).catch(() => {}); }, [step]);

  async function run() {
    setStep("upload"); setMsg(""); setNeedCredit(false);
    try {
      const blob = await upload(`clipes/${name}.mp4`, clip, { access: "public", handleUploadUrl: "/api/upload", contentType: "video/mp4" });
      setStep("ia");
      const start = await fetch("/api/upscale", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ videoUrl: blob.url, resolution: res, seconds, fps: 30 }) });
      const s = await start.json();
      if (!start.ok) { if (s.code === "saldo") setNeedCredit(true); throw new Error(s.error); }
      for (;;) {
        await new Promise((r) => setTimeout(r, 5000));
        const r = await fetch(`/api/upscale?id=${s.id}&blob=${encodeURIComponent(blob.url)}`);
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        if (d.status === "succeeded" && d.output) {
          setStep("baixar");
          const v = await (await fetch(d.output)).blob();
          setOut({ local: URL.createObjectURL(v), remote: d.output, blob: v });
          setStep("done");
          return;
        }
        if (d.status === "failed" || d.status === "canceled") throw new Error((d.error || "A IA não conseguiu processar este vídeo.") + " O valor foi devolvido.");
        setMsg(d.status === "starting" ? "preparando..." : "melhorando quadro a quadro...");
      }
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e)); setStep("error");
    }
  }

  async function saveDemo() {
    if (!out) return;
    setDemoState("salvando");
    try {
      const o = await upload(`demo/original-${res}.mp4`, clip, { access: "public", handleUploadUrl: "/api/upload", contentType: "video/mp4" });
      const i = await upload(`demo/ia-${res}.mp4`, out.blob, { access: "public", handleUploadUrl: "/api/upload", contentType: "video/mp4" });
      const r = await fetch("/api/demo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ res, original: o.url, ia: i.url }) });
      if (!r.ok) throw new Error((await r.json()).error);
      setDemoState("ok");
    } catch (e) { alert(e instanceof Error ? e.message : String(e)); setDemoState(""); }
  }

  const busy = step === "upload" || step === "ia" || step === "baixar";
  return (
    <div className="card space-y-3 border-brand-200 bg-brand-50/50">
      <div className="flex items-center gap-2">
        <IconSparkles className="h-5 w-5 text-brand-600" />
        <h2 className="font-bold">Super-resolução com IA</h2>
      </div>
      <p className="text-sm text-muted">Reconstrói detalhes do rosto, cabelo e roupa, quadro a quadro. Usa o clipe exportado acima, com legenda e tudo.</p>
      {step !== "done" && (
        <>
          <div className="grid grid-cols-2 gap-2">
            {(["1080p", "4k"] as const).map((r) => (
              <button key={r} disabled={busy} onClick={() => setRes(r)}
                className={`rounded-xl p-3 text-left ${res === r ? "bg-brand-600 text-white" : "bg-white ring-1 ring-line"}`}>
                <span className="block font-bold">{r === "4k" ? "4K Ultra HD" : "1080p Full HD"}</span>
                <span className={`text-xs ${res === r ? "text-white/80" : "text-muted"}`}>{brl(upscaleCost(seconds, r))} · {Math.round(seconds)}s</span>
              </button>
            ))}
          </div>
          <p className="text-xs text-muted">
            {me?.saas === false ? <>Custo no Replicate: cerca de <b>{brl(cost / 2)}</b> (cobrado na sua conta de lá).</> : <>Custa <b>{brl(cost)}</b> {me && !me.is_admin && <>· seu saldo: <b>{brl(me.balance_cents)}</b></>}.</>} Leva de 2 a 10 minutos. Se a IA falhar, o valor volta.
          </p>
          <button className="btn-primary" disabled={busy} onClick={run}>
            {step === "upload" ? "Enviando o clipe..." : step === "ia" ? `IA trabalhando... ${msg}` : step === "baixar" ? "Baixando o resultado..." : me?.saas === false || me?.is_admin ? "Melhorar com IA" : `Melhorar com IA por ${brl(cost)}`}
          </button>
          {step === "ia" && <div className="h-1.5 animate-pulse rounded-full bg-brand-200" />}
          {step === "error" && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{msg}</p>}
          {needCredit && <Link href="/creditos" className="btn-secondary">Comprar créditos</Link>}
        </>
      )}
      {step === "done" && out && (
        <div className="space-y-3">
          <CompareSlider before={before} after={out.local} labelAfter={`IA ${res === "4k" ? "4K" : "1080p"}`} aspect={aspect} />
          <div className="flex flex-wrap justify-center gap-2">
            <a className="btn-primary" href={out.local} download={`${name}-${res}-ia.mp4`}><IconDownload className="h-4 w-4" />Baixar versão {res === "4k" ? "4K" : "1080p"}</a>
            {me?.is_admin && me.saas && (
              <button className="btn-secondary" disabled={demoState !== ""} onClick={saveDemo}>
                {demoState === "ok" ? "Demo salva ✓" : demoState === "salvando" ? "Salvando demo..." : `Usar como demo de ${res === "4k" ? "4K" : "1080p"}`}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
