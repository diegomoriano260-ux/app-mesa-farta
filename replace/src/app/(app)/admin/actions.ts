"use server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { credit } from "@/lib/credits";

export async function darCreditos(form: FormData) {
  const me = await requireUser();
  if (!me.is_admin) return;
  const id = String(form.get("id"));
  const reais = Number(String(form.get("valor")).replace(",", "."));
  if (!/^[0-9a-f-]{36}$/i.test(id) || !Number.isFinite(reais) || reais === 0 || Math.abs(reais) > 10000) return;
  await credit(id, Math.round(reais * 100), "ajuste", reais > 0 ? "Créditos dados pelo suporte" : "Ajuste do suporte");
  revalidatePath("/admin");
}
