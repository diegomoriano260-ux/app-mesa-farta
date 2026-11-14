import { makeCues, cueAt } from './cues.js';
import { fmt, summaryMarkdown, transcriptText } from './report.js';

const $ = id => document.getElementById(id);
const status = msg => { $('status').textContent = msg; };
const W = 720, H = 1280;

$('mode').addEventListener('change', () => {
  const summary = $('mode').value === 'summary';
  $('countField').hidden = summary;
  $('go').textContent = summary ? 'Gerar resumo' : 'Gerar cortes';
});

async function api(path, payload) {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-access-code': $('code').value },
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `servidor respondeu ${res.status}`);
  return body;
}

function el(tag, props = {}, ...children) {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children);
  return node;
}

function showSummary(s, segments, fileName) {
  const base = fileName.replace(/\.[^.]+$/, '');
  const download = (text, name, label) =>
    el('a', { href: URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' })), download: name, textContent: label });
  const list = items => el('ul', {}, ...items.map(t => el('li', { textContent: t })));
  const section = (title, ...body) => el('section', {}, el('h3', { textContent: title }), ...body);

  $('summary').append(
    el('h2', { textContent: s.title }),
    el('p', { textContent: s.summary }),
    section('Tópicos', ...s.topics.map(t => el('div', { className: 'topic' },
      el('h4', { textContent: `${fmt(t.start)} · ${t.title}` }), list(t.points)))),
    section('Decisões', s.decisions.length ? list(s.decisions) : el('p', { className: 'muted', textContent: 'Nenhuma decisão registrada.' })),
    section('Tarefas', s.action_items.length
      ? list(s.action_items.map(a => [a.task, a.owner && `responsável: ${a.owner}`, a.due && `prazo: ${a.due}`].filter(Boolean).join(' · ')))
      : el('p', { className: 'muted', textContent: 'Nenhuma tarefa registrada.' })),
    el('p', { className: 'downloads' },
      download(summaryMarkdown(s), `${base}-resumo.md`, 'Baixar resumo (.md)'), ' ',
      download(transcriptText(segments), `${base}-transcricao.txt`, 'Baixar transcrição (.txt)')),
    el('details', {}, el('summary', { textContent: 'Transcrição completa' }), el('pre', { textContent: transcriptText(segments) })),
  );
}

$('form').addEventListener('submit', async e => {
  e.preventDefault();
  $('go').disabled = true;
  $('clips').replaceChildren();
  $('summary').replaceChildren();
  try {
    await run($('file').files[0]);
  } catch (err) {
    console.error(err);
    status('Erro: ' + err.message);
  } finally {
    $('go').disabled = false;
  }
});

async function run(file) {
  status('Lendo o áudio do arquivo…');
  const audio = await decodeAudio(file);
  const duration = audio.length / 16000;

  status('Carregando o modelo de transcrição (só na primeira vez, ~150 MB)…');
  const { pipeline } = await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.2');
  const device = navigator.gpu ? 'webgpu' : 'wasm';
  const transcribe = await pipeline('automatic-speech-recognition', 'onnx-community/whisper-base', { device });

  status(`Transcrevendo ${fmt(duration)} de áudio no seu computador… pode levar alguns minutos.`);
  const lang = $('lang').value;
  const out = await transcribe(audio, {
    chunk_length_s: 30, stride_length_s: 5, return_timestamps: true, ...(lang && { language: lang, task: 'transcribe' }),
  });
  const segments = out.chunks.map(c => ({ start: c.timestamp[0], end: c.timestamp[1] ?? duration, text: c.text }));
  if (!segments.length) throw new Error('Nenhuma fala encontrada na gravação.');

  if ($('mode').value === 'summary') {
    status('Resumindo a reunião com o Claude…');
    const summary = await api('/api/summary', { segments, duration });
    showSummary(summary, segments, file.name);
    status('Pronto: resumo da reunião.');
    return;
  }

  status('Escolhendo os melhores momentos com o Claude…');
  const body = await api('/api/highlights', { segments, duration, count: $('count').value });
  if (!body.clips.length) throw new Error('A IA não encontrou trechos bons neste vídeo.');

  const cues = makeCues(out.chunks, duration);
  const renderer = await makeRenderer(file);
  for (const [i, clip] of body.clips.entries()) {
    status(`Gravando corte ${i + 1} de ${body.clips.length} (${fmt(clip.end - clip.start)}). Mantenha esta aba aberta e visível.`);
    const { blob, ext } = await renderer.render(clip, cues);
    addCard(clip, blob, ext, i);
  }
  status(`Pronto: ${body.clips.length} corte(s).`);
}

// Whisper wants 16 kHz mono floats; the browser decodes the video's audio track and resamples for us.
// shortcut: decodes the whole track in memory, so very long videos (>~1.5 h) may run out of memory; stream-decode if that shows up.
async function decodeAudio(file) {
  const ctx = new AudioContext({ sampleRate: 16000 });
  try {
    const buf = await ctx.decodeAudioData(await file.arrayBuffer());
    if (buf.numberOfChannels === 1) return buf.getChannelData(0);
    const [l, r] = [buf.getChannelData(0), buf.getChannelData(1)];
    return l.map((v, i) => (v + r[i]) / 2);
  } catch {
    throw new Error('Não consegui ler o áudio deste vídeo. Tente um MP4 (H.264/AAC).');
  } finally {
    ctx.close();
  }
}

// Plays each clip in real time onto a 9:16 canvas (center crop + captions) and records canvas + audio.
// shortcut: recording runs at 1x speed and browsers throttle hidden tabs; switch to ffmpeg.wasm for faster-than-real-time cuts.
async function makeRenderer(file) {
  const video = Object.assign(document.createElement('video'), { src: URL.createObjectURL(file), playsInline: true });
  await new Promise((ok, fail) => { video.onloadedmetadata = ok; video.onerror = () => fail(new Error('Formato de vídeo não suportado pelo navegador.')); });
  const actx = new AudioContext();
  const dest = actx.createMediaStreamDestination();
  actx.createMediaElementSource(video).connect(dest); // not connected to speakers: records silently
  const canvas = Object.assign(document.createElement('canvas'), { width: W, height: H });
  const g = canvas.getContext('2d');
  const mime = ['video/mp4;codecs=avc1,mp4a', 'video/webm;codecs=vp9,opus', 'video/webm'].find(m => MediaRecorder.isTypeSupported(m));

  function draw(cues) {
    const scale = Math.max(W / video.videoWidth, H / video.videoHeight);
    const dw = video.videoWidth * scale, dh = video.videoHeight * scale;
    g.drawImage(video, (W - dw) / 2, (H - dh) / 2, dw, dh);
    const text = cueAt(cues, video.currentTime).toUpperCase();
    if (!text) return;
    g.font = '900 64px system-ui, sans-serif';
    g.textAlign = 'center';
    g.lineJoin = 'round';
    g.lineWidth = 12;
    g.strokeStyle = '#000';
    g.fillStyle = '#fff';
    wrap(text, W - 80).forEach((line, i, all) => {
      const y = H * 0.72 + (i - (all.length - 1) / 2) * 76;
      g.strokeText(line, W / 2, y);
      g.fillText(line, W / 2, y);
    });
  }
  function wrap(text, max) {
    const lines = [];
    for (const word of text.split(' ')) {
      const last = lines.length - 1;
      if (last >= 0 && g.measureText(lines[last] + ' ' + word).width <= max) lines[last] += ' ' + word;
      else lines.push(word);
    }
    return lines;
  }

  return {
    async render(clip, cues) {
      video.currentTime = clip.start;
      await new Promise(ok => { video.onseeked = ok; });
      await actx.resume();
      draw(cues);
      const stream = new MediaStream([...canvas.captureStream(30).getVideoTracks(), ...dest.stream.getAudioTracks()]);
      const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 5_000_000 });
      const parts = [];
      rec.ondataavailable = ev => ev.data.size && parts.push(ev.data);
      const done = new Promise(ok => { rec.onstop = ok; });
      rec.start(1000);
      await video.play();
      await new Promise(ok => {
        const tick = () => {
          draw(cues);
          if (video.currentTime >= clip.end || video.ended) return ok();
          video.requestVideoFrameCallback(tick);
        };
        video.requestVideoFrameCallback(tick);
      });
      video.pause();
      rec.stop();
      await done;
      return { blob: new Blob(parts, { type: mime }), ext: mime.startsWith('video/mp4') ? 'mp4' : 'webm' };
    },
  };
}

function addCard(clip, blob, ext, i) {
  const url = URL.createObjectURL(blob);
  const card = document.createElement('div');
  card.className = 'clip';
  const v = Object.assign(document.createElement('video'), { src: url, controls: true, playsInline: true });
  const h = Object.assign(document.createElement('h3'), { textContent: clip.title });
  const p = Object.assign(document.createElement('p'), { textContent: `${fmt(clip.start)}–${fmt(clip.end)} · ${clip.reason}` });
  const a = Object.assign(document.createElement('a'), { href: url, download: `corte-${i + 1}.${ext}`, textContent: `Baixar .${ext}` });
  card.append(v, h, p, a);
  $('clips').append(card);
}
