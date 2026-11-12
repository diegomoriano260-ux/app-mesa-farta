"use client";
import { startTransition, useActionState } from "react";
import { connectWhatsapp } from "./actions";

export function WhatsappForm() {
  const [state, action, pending] = useActionState(connectWhatsapp, undefined);
  return (
    <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); startTransition(() => action(fd)); }} className="space-y-3">
      <div>
        <label className="label" htmlFor="phone_number_id">ID do número de telefone</label>
        <input id="phone_number_id" name="phone_number_id" className="input" inputMode="numeric" required />
        <p className="hint">Meta for Developers → seu app → WhatsApp → Configuração da API.</p>
      </div>
      <div>
        <label className="label" htmlFor="waba_id">ID da conta do WhatsApp Business (opcional)</label>
        <input id="waba_id" name="waba_id" className="input" inputMode="numeric" />
        <p className="hint">Se preencher, o app assina os webhooks dessa conta.</p>
      </div>
      <div>
        <label className="label" htmlFor="token">Token permanente (usuário do sistema)</label>
        <input id="token" name="token" type="password" className="input" required autoComplete="off" />
        <p className="hint">Fica guardado criptografado. Nunca aparece de novo na tela.</p>
      </div>
      {state?.error && <p className="text-sm text-red-700">{state.error}</p>}
      {state?.ok && <p className="text-sm text-green-700">{state.ok}</p>}
      <button className="btn-primary" disabled={pending}>{pending ? "Verificando..." : "Conectar WhatsApp"}</button>
    </form>
  );
}
