"use client";
// Projetos ficam salvos no próprio navegador (IndexedDB): sem banco, sem custo, privado.
import type { Analysis } from "./analysis";
import type { Segment } from "./time";
import type { EditSettings } from "./edit";

export type Project = {
  id: string;
  title: string;
  fileName: string;
  fileSize: number;
  duration: number;
  createdAt: number;
  language: string | null;
  segments: Segment[];
  analysis: Analysis | null;
  chat?: { role: "user" | "assistant"; content: string }[];
  outputs?: Record<string, string>;            // textos gerados pelos modelos prontos
  translations?: Record<string, Segment[]>;    // legendas traduzidas por idioma
  edits?: Record<number, EditSettings>;        // edição salva de cada clipe
};

const DB = "replace";
const STORE = "projects";

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: "id" });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const r = fn(db.transaction(STORE, mode).objectStore(STORE));
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

export const saveProject = (p: Project) => tx("readwrite", (s) => s.put(p));
export const getProject = (id: string) => tx<Project | undefined>("readonly", (s) => s.get(id));
export const deleteProject = (id: string) => tx("readwrite", (s) => s.delete(id));
export async function listProjects(): Promise<Project[]> {
  const all = await tx<Project[]>("readonly", (s) => s.getAll());
  return all.sort((a, b) => b.createdAt - a.createdAt);
}

// O arquivo de vídeo original fica só na memória da aba (é grande demais para guardar).
const files = new Map<string, File>();
export const rememberFile = (id: string, f: File) => files.set(id, f);
export const recallFile = (id: string) => files.get(id);
