// Códigos de validação e registros cifrados — mesmo esquema de certificados/lib/crypto.js (CLI)
// e de docs/index.html: PBKDF2-SHA256(código) → 32 bytes de chave AES-GCM + 12 bytes de id público.
// Quem não tem o código não lê nem enumera os registros. Sem estado global; sem IO.
const enc = new TextEncoder();
const subtle = () => globalThis.crypto.subtle;
const randomBytes = (n) => globalThis.crypto.getRandomValues(new Uint8Array(n));

// 31 símbolos sem ambiguidade (0/O, 1/I/L); 12 símbolos ≈ 59 bits.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function randomChars(n) {
  let out = '';
  while (out.length < n) {
    const [b] = randomBytes(1);
    if (b < 248) out += ALPHABET[b % 31]; // rejeição evita viés
  }
  return out;
}

export const newCode = (prefix) => `${prefix}-${randomChars(4)}-${randomChars(4)}-${randomChars(4)}`;
export const normalizeCode = (c) => String(c || '').toLowerCase().replace(/[^a-z0-9-]/g, '');
export const newSalt = () => `eh-${randomChars(16).toLowerCase()}`;

const hex = (b) => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
const toB64 = (b) => btoa(String.fromCharCode(...b));
const fromB64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function deriveBits(code, { salt, iterations }) {
  const base = await subtle().importKey('raw', enc.encode(normalizeCode(code)), 'PBKDF2', false, ['deriveBits']);
  return new Uint8Array(await subtle().deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode(salt), iterations }, base, 44 * 8));
}

export async function recordId(code, verification) {
  return hex((await deriveBits(code, verification)).slice(32));
}

export async function encryptRecord(code, payload, verification) {
  const bits = await deriveBits(code, verification);
  const key = await subtle().importKey('raw', bits.slice(0, 32), 'AES-GCM', false, ['encrypt']);
  const iv = randomBytes(12);
  const ct = new Uint8Array(await subtle().encrypt({ name: 'AES-GCM', iv }, key, enc.encode(JSON.stringify(payload))));
  return { id: hex(bits.slice(32)), iv: toB64(iv), ct: toB64(ct) };
}

export async function decryptRecord(code, rec, verification) {
  const bits = await deriveBits(code, verification);
  const key = await subtle().importKey('raw', bits.slice(0, 32), 'AES-GCM', false, ['decrypt']);
  const plain = await subtle().decrypt({ name: 'AES-GCM', iv: fromB64(rec.iv) }, key, fromB64(rec.ct));
  return JSON.parse(new TextDecoder().decode(plain));
}
