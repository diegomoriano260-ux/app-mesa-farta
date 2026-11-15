"use client";
import { startTransition, useActionState, useRef } from "react";
import { sendManual } from "../actions";
import { IconSend } from "@/components/icons";

export function ReplyForm({ contactId }: { contactId: string }) {
  const [state, action, pending] = useActionState(sendManual, undefined);
  const ref = useRef<HTMLFormElement>(null);
  return (
    <form ref={ref} className="space-y-2"
      onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); startTransition(() => action(fd)); ref.current?.reset(); }}>
      <input type="hidden" name="contact_id" value={contactId} />
      <div className="flex items-end gap-2">
        <textarea name="text" rows={2} required className="input resize-none" placeholder="Escreva uma resposta..." />
        <button className="btn-primary h-12 w-12 shrink-0 p-0" disabled={pending} title="Enviar"><IconSend className="h-5 w-5" /></button>
      </div>
      {state?.error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{state.error}</p>}
    </form>
  );
}
