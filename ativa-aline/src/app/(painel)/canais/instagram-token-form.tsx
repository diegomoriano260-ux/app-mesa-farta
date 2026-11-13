"use client";
import { startTransition, useActionState } from "react";
import { connectInstagramToken } from "./actions";

export function InstagramTokenForm() {
  const [state, action, pending] = useActionState(connectInstagramToken, undefined);
  return (
    <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); startTransition(() => action(fd)); }} className="space-y-3">
      <div>
        <label className="label" htmlFor="ig_token">Token de acesso do Instagram</label>
        <textarea id="ig_token" name="token" rows={3} required autoComplete="off" spellCheck={false}
          className="input resize-none font-mono text-xs" placeholder="Cole aqui o token (começa com EAA... ou IG...)" />
        <p className="hint">Meta for Developers → app Ativa Aline → Casos de uso → Instagram → passo 2 “Gerar tokens de acesso”. Fica guardado criptografado.</p>
      </div>
      <div>
        <label className="label" htmlFor="ig_account_id">ID da conta do Instagram</label>
        <input id="ig_account_id" name="ig_account_id" inputMode="numeric" className="input" placeholder="Ex.: 17841409170231636" />
        <p className="hint">O número que aparece embaixo do nome da Aline no painel da Meta. Obrigatório para token que começa com EAA.</p>
      </div>
      {state?.error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{state.error}</p>}
      {state?.ok && <p className="rounded-xl bg-green-50 p-3 text-sm text-green-700">{state.ok}</p>}
      <button className="btn-primary w-full py-3 sm:w-auto" disabled={pending}>{pending ? "Verificando..." : "Conectar com token"}</button>
    </form>
  );
}
