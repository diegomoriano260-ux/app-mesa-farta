"use server";
import { redirect } from "next/navigation";
import { checkPassword, endSession, startSession } from "@/lib/session";

export async function login(_: { error?: string } | undefined, form: FormData) {
  // Pequeno atraso contra tentativa de senha em massa.
  await new Promise((r) => setTimeout(r, 400));
  if (!checkPassword(String(form.get("password") ?? ""))) return { error: "Senha incorreta." };
  await startSession();
  redirect("/");
}

export async function logout() {
  await endSession();
  redirect("/login");
}
