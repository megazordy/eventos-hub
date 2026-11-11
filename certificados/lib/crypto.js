// Códigos de validação e registros cifrados para a página pública de verificação.
// O código é a única chave: PBKDF2(código) gera o id público (12 bytes) e a chave AES-GCM (32 bytes).
// Quem não tem o código não consegue ler nem enumerar os registros.
// Mesmo esquema usado em docs/index.html — mudar um exige mudar o outro.
const { subtle } = globalThis.crypto;
const getRandomValues = (arr) => globalThis.crypto.getRandomValues(arr);
const enc = new TextEncoder();

// Sem caracteres ambíguos (0/O, 1/I/L). 31 símbolos ^ 12 ≈ 59 bits por código: com PBKDF2 lento,
// adivinhar um código por força bruta fica inviável (o índice público é cifrado com esse código).
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function randomChars(n) {
  let out = '';
  while (out.length < n) {
    const [b] = getRandomValues(new Uint8Array(1));
    if (b < 248) out += ALPHABET[b % 31]; // rejeição evita viés
  }
  return out;
}

export const newCode = (prefix) => `${prefix}-${randomChars(4)}-${randomChars(4)}-${randomChars(4)}`;

export const normalizeCode = (c) => String(c || '').toLowerCase().replace(/[^a-z0-9-]/g, '');

const hex = (b) => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
const b64 = (b) => Buffer.from(b).toString('base64');

async function deriveBits(code, { salt, iterations }) {
  const base = await subtle.importKey('raw', enc.encode(normalizeCode(code)), 'PBKDF2', false, ['deriveBits']);
  return new Uint8Array(await subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode(salt), iterations }, base, 44 * 8));
}

export async function encryptRecord(code, payload, verification) {
  const bits = await deriveBits(code, verification);
  const key = await subtle.importKey('raw', bits.slice(0, 32), 'AES-GCM', false, ['encrypt']);
  const iv = getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(JSON.stringify(payload))));
  return { id: hex(bits.slice(32)), iv: b64(iv), ct: b64(ct) };
}

export async function decryptRecord(code, rec, verification) {
  const bits = await deriveBits(code, verification);
  const key = await subtle.importKey('raw', bits.slice(0, 32), 'AES-GCM', false, ['decrypt']);
  const plain = await subtle.decrypt(
    { name: 'AES-GCM', iv: Buffer.from(rec.iv, 'base64') }, key, Buffer.from(rec.ct, 'base64'));
  return JSON.parse(new TextDecoder().decode(plain));
}
