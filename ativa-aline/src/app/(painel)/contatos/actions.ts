"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";

export async function toggleBot(form: FormData) {
  await requireSession();
  await db()`update contacts set bot_paused = not bot_paused where id = ${String(form.get("id"))}`;
  revalidatePath("/contatos");
}
