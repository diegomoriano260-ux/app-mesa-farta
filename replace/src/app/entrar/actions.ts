"use server";
import { redirect } from "next/navigation";
import { adminUser, endSession, hashPassword, saasMode, startSession, verifyPassword } from "@/lib/auth";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { credit } from "@/lib/credits";
import { safeEqual, hmacHex } from "@/lib/crypto";
import { SIGNUP_BONUS } from "@/lib/pricing";

type State = { error?: string } | undefined;
const slow = () => new Promise((r) => setTimeout(r, 400));

export async function entrar(_: State, form: FormData): Promise<State> {
  await slow();
  const email = String(form.get("email") ?? "admin").trim().toLowerCase() || "admin";
  const senha = String(form.get("senha") ?? "");
  if (email === "admin" || !saasMode()) {
    if (!safeEqual(hmacHex("pw", senha), hmacHex("pw", env("ADMIN_PASSWORD")))) return { error: saasMode() ? "E-mail ou senha incorretos." : "Senha incorreta." };
    const u = await adminUser();
    await startSession(u.id);
    redirect("/");
  }
  const [u] = await db()<{ id: string; pass_hash: string }[]>`select id, pass_hash from rp_users where email = ${email}`;
  if (!u || !(await verifyPassword(senha, u.pass_hash))) return { error: "E-mail ou senha incorretos." };
  await startSession(u.id);
  redirect("/");
}

export async function criarConta(_: State, form: FormData): Promise<State> {
  await slow();
  if (!saasMode()) return { error: "O cadastro de clientes ainda não está aberto." };
  const nome = String(form.get("nome") ?? "").trim().slice(0, 80);
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const senha = String(form.get("senha") ?? "");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Digite um e-mail válido." };
  if (senha.length < 8) return { error: "A senha precisa ter pelo menos 8 caracteres." };
  const hash = await hashPassword(senha);
  const [u] = await db()<{ id: string }[]>`
    insert into rp_users (email, name, pass_hash) values (${email}, ${nome || null}, ${hash})
    on conflict (email) do nothing returning id`;
  if (!u) return { error: "Já existe uma conta com esse e-mail. Use Entrar." };
  await credit(u.id, SIGNUP_BONUS, "bonus", "Bônus de boas-vindas");
  await startSession(u.id);
  redirect("/");
}

export async function sair() {
  await endSession();
  redirect("/entrar");
}
