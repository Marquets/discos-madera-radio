// Genera los sonidos del buzón de voz en public/buzon/: el pitido que va antes de cada mensaje y
// la voz de contestador que dice cuántos hay ("Tienes tres mensajes"), uno por número hasta
// MAX_SEMANA. Solo en macOS: usa say (voz Mónica) y afconvert.
//   node scripts/buzon-sonidos.mjs
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const OUT = path.join(import.meta.dirname, "..", "public", "buzon");
const MAX = 60; // MAX_SEMANA en lib/buzon-reglas.ts
const RATE = 44100;
const tmp = path.join(tmpdir(), `buzon-${process.pid}`);
mkdirSync(tmp, { recursive: true });
mkdirSync(OUT, { recursive: true });

const UNIDADES = ["", "un", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve"];
const DIECES = ["diez", "once", "doce", "trece", "catorce", "quince", "dieciséis", "diecisiete", "dieciocho", "diecinueve"];
const VEINTES = ["veinte", "veintiún", "veintidós", "veintitrés", "veinticuatro", "veinticinco", "veintiséis", "veintisiete", "veintiocho", "veintinueve"];
const DECENAS = { 3: "treinta", 4: "cuarenta", 5: "cincuenta", 6: "sesenta" };

/** "un", "veintiún", "treinta y un": con apócope, que va delante de "mensajes" */
function numero(n) {
  if (n < 10) return UNIDADES[n];
  if (n < 20) return DIECES[n - 10];
  if (n < 30) return VEINTES[n - 20];
  const d = DECENAS[Math.floor(n / 10)];
  return n % 10 ? `${d} y ${UNIDADES[n % 10]}` : d;
}

/** Muestras de un WAV PCM de 16 bits, mono */
function leerWav(file) {
  const buf = readFileSync(file);
  let i = 12;
  while (buf.toString("ascii", i, i + 4) !== "data") i += 8 + buf.readUInt32LE(i + 4);
  const len = buf.readUInt32LE(i + 4) / 2;
  return Float32Array.from({ length: len }, (_, k) => buf.readInt16LE(i + 8 + k * 2) / 32768);
}

function escribirWav(file, samples) {
  const buf = Buffer.alloc(44 + samples.length * 2);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + samples.length * 2, 4);
  buf.write("WAVEfmt ", 8);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(RATE, 24);
  buf.writeUInt32LE(RATE * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(samples.length * 2, 40);
  samples.forEach((s, k) => buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, s)) * 32767), 44 + k * 2));
  writeFileSync(file, buf);
}

const db = (x) => 10 ** (x / 20);
const silencio = (s) => new Float32Array(Math.round(s * RATE));
const juntar = (...partes) => {
  const out = new Float32Array(partes.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of partes) out.set(p, (o += p.length) - p.length);
  return out;
};

/** A unos -18 dBFS RMS, cerca del volumen de las cortinillas, sin pasar de -1 dBFS de pico */
function nivelar(samples) {
  const rms = Math.sqrt(samples.reduce((a, s) => a + s * s, 0) / samples.length);
  const peak = samples.reduce((a, s) => Math.max(a, Math.abs(s)), 0);
  const gain = Math.min(db(-18) / rms, db(-1) / peak);
  return samples.map((s) => s * gain);
}

function aM4a(samples, name) {
  const wav = path.join(tmp, `${name}.wav`);
  escribirWav(wav, samples);
  execFileSync("afconvert", ["-f", "m4af", "-d", "aac", "-b", "96000", wav, path.join(OUT, `${name}.m4a`)]);
}

// El pitido de contestador: 1 kHz, medio segundo corto, con rampas para que no chasque, y un
// respiro antes y después para que no pise al mensaje
const LARGO = 0.4;
const RAMPA = 0.01;
const tono = Float32Array.from({ length: Math.round(LARGO * RATE) }, (_, k) => {
  const t = k / RATE;
  const env = Math.min(1, t / RAMPA, (LARGO - t) / RAMPA);
  return Math.sin(2 * Math.PI * 1000 * t) * env * db(-20) * Math.SQRT2;
});
aM4a(juntar(silencio(0.3), tono, silencio(0.4)), "pitido");

for (let n = 1; n <= MAX; n++) {
  const texto = `Tienes ${numero(n)} ${n === 1 ? "mensaje" : "mensajes"}.`;
  const aiff = path.join(tmp, `voz-${n}.wav`);
  execFileSync("say", ["-v", "Mónica", "-r", "165", "-o", aiff, "--file-format=WAVE", `--data-format=LEI16@${RATE}`, texto]);
  aM4a(juntar(silencio(0.2), nivelar(leerWav(aiff)), silencio(0.2)), `tienes-${n}`);
}

rmSync(tmp, { recursive: true });
console.log(`Hecho: pitido y tienes-1 … tienes-${MAX} en ${path.relative(process.cwd(), OUT)}`);
