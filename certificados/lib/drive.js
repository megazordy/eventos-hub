// Envio do PDF ao Google Drive da organização via Apps Script (certificados/apps-script/Code.gs).
// Config (nunca versionar): variáveis EVENTOS_HUB_DRIVE_URL e EVENTOS_HUB_DRIVE_TOKEN,
// ou o arquivo drive.local.json na raiz: { "url": "...", "token": "..." }.
// IO: lê drive.local.json; faz requisição HTTPS.
import { existsSync, readFileSync } from 'node:fs';

export function loadDriveConfig(rootDir) {
  const file = `${rootDir}/drive.local.json`;
  const fromFile = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {};
  const url = process.env.EVENTOS_HUB_DRIVE_URL || fromFile.url;
  const token = process.env.EVENTOS_HUB_DRIVE_TOKEN || fromFile.token;
  return url && token ? { url, token } : null;
}

export async function uploadCertificate(config, { folderPath, fileName, pdf, control, row }) {
  const res = await fetch(config.url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // evita preflight; o Apps Script lê o corpo cru
    body: JSON.stringify({
      token: config.token,
      folderPath,
      fileName,
      contentBase64: pdf.toString('base64'),
      control,
      row,
    }),
    redirect: 'follow',
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { throw new Error(`Resposta inesperada do Apps Script (HTTP ${res.status}). Confira a implantação.`); }
  if (!json.ok) throw new Error(`Apps Script: ${json.error}`);
  return json; // { ok, fileId, url }
}
