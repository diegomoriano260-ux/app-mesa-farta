"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { listProjects, type Project } from "@/lib/store";
import { fmtClock } from "@/lib/time";
import { IconDoc, IconPlus, IconScissors, IconVideo } from "@/components/icons";

export default function Home() {
  const [items, setItems] = useState<Project[] | null>(null);
  useEffect(() => { listProjects().then(setItems).catch(() => setItems([])); }, []);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-[26px] font-bold tracking-tight">Seus vídeos</h1>
        <p className="mt-1 text-[15px] text-muted">Transcreva, resuma e corte clipes verticais com legenda.</p>
      </div>
      {items === null ? (
        <p className="text-sm text-muted">Carregando...</p>
      ) : items.length === 0 ? (
        <div className="card flex flex-col items-center px-6 py-12 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600"><IconVideo className="h-7 w-7" /></div>
          <p className="text-lg font-semibold">Nenhum vídeo ainda</p>
          <p className="mt-1 max-w-sm text-sm text-muted">Escolha um vídeo longo (live, aula, podcast). A IA transcreve, resume e sugere os melhores trechos para Reels.</p>
          <Link href="/novo" className="btn-primary mt-5"><IconPlus className="h-[18px] w-[18px]" />Enviar o primeiro vídeo</Link>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {items.map((p) => (
            <li key={p.id}>
              <Link href={`/v/${p.id}`} className="card flex items-center gap-4 p-4 transition hover:border-brand-200">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-600"><IconVideo /></div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{p.title}</p>
                  <p className="mt-0.5 text-xs text-muted">{fmtClock(p.duration)} · {new Date(p.createdAt).toLocaleDateString("pt-BR")}</p>
                  <div className="mt-2 flex gap-1.5">
                    <span className="chip"><IconDoc className="mr-1 h-3.5 w-3.5" />transcrição</span>
                    {p.analysis && <span className="chip"><IconScissors className="mr-1 h-3.5 w-3.5" />{p.analysis.clipes.length} clipes</span>}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-8 text-center text-xs text-muted">Os projetos ficam salvos neste navegador.</p>
    </div>
  );
}
