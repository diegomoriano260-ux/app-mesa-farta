"use client";
// Separa os projetos salvos no navegador por conta (duas pessoas no mesmo aparelho não se misturam).
declare global { interface Window { __RP_UID?: string } }
export function UserScope({ uid }: { uid: string }) {
  if (typeof window !== "undefined") window.__RP_UID = uid;
  return null;
}
