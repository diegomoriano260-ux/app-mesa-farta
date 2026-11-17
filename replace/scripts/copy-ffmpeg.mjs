// Copia o ffmpeg (WebAssembly) para /public: o navegador carrega do próprio site,
// sem passar pelo empacotador do Next (que não lida bem com o worker do ffmpeg).
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
mkdirSync("public/ffmpeg", { recursive: true });
const files = [
  ["node_modules/@ffmpeg/core/dist/umd/ffmpeg-core.js", "ffmpeg-core.js"],
  ["node_modules/@ffmpeg/core/dist/umd/ffmpeg-core.wasm", "ffmpeg-core.wasm"],
  ["node_modules/@ffmpeg/ffmpeg/dist/umd/ffmpeg.js", "ffmpeg.js"],
  ["node_modules/@ffmpeg/ffmpeg/dist/umd/814.ffmpeg.js", "814.ffmpeg.js"],
];
for (const [src, name] of files) if (existsSync(src)) copyFileSync(src, `public/ffmpeg/${name}`);
console.log("ffmpeg copiado para public/ffmpeg");
