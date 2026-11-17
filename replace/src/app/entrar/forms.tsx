"use client";
import { useActionState, useState } from "react";
import { criarConta, entrar } from "./actions";

export function AuthForms({ bonus }: { bonus: string }) {
  const [tab, setTab] = useState<"entrar" | "criar">("criar");
  const [eState, eAction, ePending] = useActionState(entrar, undefined);
  const [cState, cAction, cPending] = useActionState(criarConta, undefined);
  return (
    <div className="card p-6">
      <div className="mb-5 grid grid-cols-2 rounded-xl bg-brand-50 p-1">
        {([["criar", "Criar conta"], ["entrar", "Entrar"]] as const).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`rounded-lg py-2 text-sm font-semibold ${tab === k ? "bg-white text-brand-700 shadow-sm" : "text-muted"}`}>{l}</button>
        ))}
      </div>
      {tab === "criar" ? (
        <form action={cAction} className="space-y-3">
          <p className="rounded-xl bg-green-50 p-3 text-sm text-green-800">Ganhe <b>{bonus}</b> em créditos para testar.</p>
          <input name="nome" className="input" placeholder="Seu nome" autoComplete="name" />
          <input name="email" type="email" required className="input" placeholder="E-mail" autoComplete="email" />
          <input name="senha" type="password" required minLength={8} className="input" placeholder="Senha (mínimo 8 caracteres)" autoComplete="new-password" />
          {cState?.error && <p className="text-sm text-red-700">{cState.error}</p>}
          <button className="btn-primary w-full py-3 text-base" disabled={cPending}>{cPending ? "Criando..." : "Criar conta grátis"}</button>
        </form>
      ) : (
        <form action={eAction} className="space-y-3">
          <input name="email" required className="input" placeholder="E-mail" autoComplete="username" />
          <input name="senha" type="password" required className="input" placeholder="Senha" autoComplete="current-password" />
          {eState?.error && <p className="text-sm text-red-700">{eState.error}</p>}
          <button className="btn-primary w-full py-3 text-base" disabled={ePending}>{ePending ? "Entrando..." : "Entrar"}</button>
        </form>
      )}
    </div>
  );
}
