import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { env } from "./env";
import { hmacHex, safeEqual } from "./crypto";

const COOKIE = "rp_session";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 dias

function sign(exp: number) {
  return `${exp}.${hmacHex(env("SESSION_SECRET"), `session:${exp}`)}`;
}

export function checkPassword(input: string): boolean {
  return safeEqual(hmacHex("pw", input), hmacHex("pw", env("ADMIN_PASSWORD")));
}

export async function startSession() {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE;
  (await cookies()).set(COOKIE, sign(exp), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function endSession() {
  (await cookies()).delete(COOKIE);
}

export async function hasSession(): Promise<boolean> {
  const v = (await cookies()).get(COOKIE)?.value;
  if (!v) return false;
  const exp = Number(v.split(".")[0]);
  if (!Number.isFinite(exp) || exp < Date.now() / 1000) return false;
  return safeEqual(v, sign(exp));
}

// Use no topo de toda página e de toda server action do painel.
export async function requireSession() {
  if (!(await hasSession())) redirect("/login");
}
