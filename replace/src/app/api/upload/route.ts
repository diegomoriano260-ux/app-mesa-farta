import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { hasSession } from "@/lib/session";

export const runtime = "nodejs";

// Gera a autorização para o navegador enviar o clipe direto para o armazenamento (Vercel Blob).
export async function POST(req: Request) {
  const body = (await req.json()) as HandleUploadBody;
  try {
    const out = await handleUpload({
      body, request: req,
      onBeforeGenerateToken: async () => {
        if (!(await hasSession())) throw new Error("Faça login de novo.");
        return { allowedContentTypes: ["video/mp4"], maximumSizeInBytes: 1024 * 1024 * 1024, addRandomSuffix: true };
      },
      onUploadCompleted: async () => {},
    });
    return NextResponse.json(out);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 400 });
  }
}
