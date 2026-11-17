import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { randomBytes, scrypt as _scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { db } from "./db";
import { env } from "./env";
import { hmacHex, safeEqual } from "./crypto";

const scrypt = promisify(_scrypt) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;
const COOKIE = "rp_session";
const MAX_AGE = 60 * 60 * 24 * 30;

export type User = { id: string; email: string; name: string | null; balance_cents: number; is_admin: boolean };

// Modo vendas (contas, créditos, Mercado Pago) liga sozinho quando existe banco de dados.
// Sem banco = modo pessoal: só o dono entra, com a senha, e usa à vontade.
export const saasMode = () => !!process.env.DATABASE_URL;
const OWNER: User = { id: "dono", email: "admin", name: "Você", balance_cents: 0, is_admin: true };

export async function hashPassword(pw: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(pw, salt, 32);
  return `s1.${salt.toString("base64url")}.${key.toString("base64url")}`;
}

export async function verifyPassword(pw: string, stored: string): Promise<boolean> {
  const [v, salt, key] = stored.split(".");
  if (v !== "s1" || !salt || !key) return false;
  const got = await scrypt(pw, Buffer.from(salt, "base64url"), 32);
  const want = Buffer.from(key, "base64url");
  return got.length === want.length && timingSafeEqual(got, want);
}

function sign(uid: string, exp: number) {
  return `${uid}.${exp}.${hmacHex(env("SESSION_SECRET"), `u:${uid}:${exp}`)}`;
}

export async function startSession(uid: string) {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE;
  (await cookies()).set(COOKIE, sign(uid, exp), {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: MAX_AGE,
  });
}

export async function endSession() {
  (await cookies()).delete(COOKIE);
}

export async function currentUser(): Promise<User | null> {
  const v = (await cookies()).get(COOKIE)?.value;
  if (!v) return null;
  const [uid, expS] = v.split(".");
  const exp = Number(expS);
  if (!uid || !Number.isFinite(exp) || exp < Date.now() / 1000 || !safeEqual(v, sign(uid, exp))) return null;
  if (!saasMode()) return uid === OWNER.id ? OWNER : null;
  const [u] = await db()<User[]>`select id, email, name, balance_cents, is_admin from rp_users where id = ${uid}`;
  return u ?? null;
}

export async function requireUser(): Promise<User> {
  const u = await currentUser();
  if (!u) redirect("/entrar");
  return u;
}

// Login do dono: e-mail "admin" + ADMIN_PASSWORD. Cria a conta de administrador na primeira vez.
export async function adminUser(): Promise<User> {
  if (!saasMode()) return OWNER;
  const sql = db();
  const [u] = await sql<User[]>`
    insert into rp_users (email, name, pass_hash, is_admin) values ('admin', 'Administrador', 'admin-env', true)
    on conflict (email) do update set is_admin = true
    returning id, email, name, balance_cents, is_admin`;
  return u;
}
