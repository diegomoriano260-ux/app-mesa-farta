"use client";
import { upload } from "@vercel/blob/client";
import { useState } from "react";
import { IconDownload, IconSparkles } from "./icons";

// Preço do Topaz no Replicate (entrada 720p, 30 fps), em dólares por 5 segundos.
const PRICE = { "1080p": 0.093, "4k": 0.373 } as const;

export function UpscalePanel({ clip, seconds, name }: { clip: Blob; seconds: number; name: string }) {
  const [res, setRes] = useState<"1080p" | "4k">("1080p");
  const [step, setStep] = useState<"idle" | "upload" | "ia" | "baixar" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");
  const [out, setOut] = useState<string | null>(null);
  const cost = (Math.ceil(seconds / 5) * PRICE[res]).toFixed(2);

  async function run() {
    setStep("upload"); setMsg("");
    try {
      const blob = await upload(`clipes/${name}.mp4`, clip, { access: "public", handleUploadUrl: "/api/upload", contentType: "video/mp4" });
      setStep("ia");
      const start = await fetch("/api/upscale", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ videoUrl: blob.url, resolution: res, fps: 30 }) });
      const s = await start.json();
      if (!start.ok) throw new Error(s.error);
      for (;;) {
        await new Promise((r) => setTimeout(r, 5000));
        const r = await fetch(`/api/upscale?id=${s.id}&blob=${encodeURIComponent(blob.url)}`);
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        if (d.status === "succeeded" && d.output) {
          setStep("baixar");
          const v = await fetch(d.output);
          setOut(URL.createObjectURL(await v.blob()));
          setStep("done");
          return;
        }
        if (d.status === "failed" || d.status === "canceled") throw new Error(d.error || "A IA não conseguiu processar este vídeo.");
        setMsg(d.status === "starting" ? "preparando a IA..." : "melhorando quadro a quadro...");
      }
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e)); setStep("error");
    }
  }

  return (
    <div className="card space-y-3 border-brand-200 bg-brand-50/50">
      <div className="flex items-center gap-2">
        <IconSparkles className="h-5 w-5 text-brand-600" />
        <h2 className="font-bold">Super-resolução com IA (Topaz)</h2>
      </div>
      <p className="text-sm text-muted">Reconstrói detalhes do rosto, cabelo e roupa. Usa o clipe exportado acima, com legenda e tudo.</p>
      {step !== "done" && (
        <>
          <div className="flex flex-wrap gap-1.5">
            {(["1080p", "4k"] as const).map((r) => (
              <button key={r} disabled={step !== "idle" && step !== "error"} onClick={() => setRes(r)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium ${res === r ? "bg-brand-600 text-white" : "bg-white text-muted ring-1 ring-line"}`}>
                {r === "4k" ? "4K Ultra HD" : "1080p Full HD"}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted">Custo estimado: <b>US$ {cost}</b> para {Math.round(seconds)}s (cobrado na sua conta do Replicate). Leva de 2 a 10 minutos.</p>
          <button className="btn-primary" disabled={step === "upload" || step === "ia" || step === "baixar"} onClick={run}>
            {step === "upload" ? "Enviando o clipe..." : step === "ia" ? `IA trabalhando... ${msg}` : step === "baixar" ? "Baixando o resultado..." : "Melhorar com IA"}
          </button>
          {step === "ia" && <div className="h-1.5 animate-pulse rounded-full bg-brand-200" />}
          {step === "error" && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{msg}</p>}
        </>
      )}
      {step === "done" && out && (
        <div className="space-y-3">
          <video src={out} controls playsInline className="mx-auto max-h-96 rounded-xl bg-black" />
          <a className="btn-primary" href={out} download={`${name}-${res}-ia.mp4`}><IconDownload className="h-4 w-4" />Baixar versão {res === "4k" ? "4K" : "1080p"} com IA</a>
        </div>
      )}
    </div>
  );
}
