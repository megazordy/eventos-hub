// Geração de um lote de certificados no navegador.
// IO: Drive do organizador (PDFs, controle de códigos e CSV de controle), Firestore (dados públicos do
// evento e registros cifrados) ou, no modo demonstração, localStorage + ZIP para download.
import JSZip from 'jszip';
import { newCode, encryptRecord } from './crypto.js';
import { renderPages } from './template.js';
import { pagesToPdf, qrSvg, safeFileName } from './pdf.js';
import { maskCpf } from './lists.js';
import { verifyLink } from './config.js';
import { ensureFolderPath, putFile, shareWithLink, readJsonFile, fileLink } from './gdrive.js';
import { publicEventOf } from './public-event.js';

const ROOT_FOLDER = 'eventos-hub';
const LEDGER_FILE = 'controle-de-codigos.json';
const CONTROL_CSV = 'Controle de certificados.csv';

export const personKey = (type, p) => `${type}|${(p.email || p.name).trim().toLowerCase()}`;

function payloadOf(event, typeKey, entry) {
  const type = event.types[typeKey];
  return {
    name: entry.name,
    type: type.label + (entry.tier ? ` · Cota ${entry.tier}` : ''),
    team: entry.team || '',
    role: entry.role || '',
    pdfUrl: entry.url || '',
    ...(type.hours ? { hours: type.hours } : {}),
    ...(type.dates ? { dates: type.dates } : {}),
  };
}

const csvCell = (v) => { const s = String(v ?? ''); return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
function controlCsv(event, ledger) {
  const rows = Object.values(ledger.entries).map((e) => [e.code, event.types[e.type]?.label || e.type, e.name, e.team, e.role, e.email, e.fileName, e.url, e.generatedAt]);
  return '﻿' + [['Código', 'Tipo', 'Nome', 'Equipe/Startup', 'Função', 'E-mail', 'Arquivo', 'Link do PDF', 'Gerado em'], ...rows].map((r) => r.map(csvCell).join(';')).join('\n');
}

// files: Map nomeDoArquivo → dataURL (logos de patrocinador). onProgress({ done, total, current, errors })
export async function generateBatch({ store, event, typeKey, people, files = new Map(), onProgress = () => {} }) {
  const type = event.types[typeKey];
  if (!type) throw new Error('Tipo de certificado não encontrado.');
  if (!event.prefix || !event.salt) throw new Error('Defina o prefixo do código nas configurações do evento.');

  const verification = { salt: event.salt, iterations: event.iterations };
  await store.publishPublicEvent(publicEventOf(event));

  let token = null; let controlFolder = null; let typeFolder = null; let zip = null;
  if (store.demo) zip = new JSZip();
  else {
    token = await store.driveToken();
    const base = [ROOT_FOLDER, safeFileName(event.name)];
    controlFolder = await ensureFolderPath(token, [...base, '_Controle']);
    typeFolder = await ensureFolderPath(token, [...base, 'Certificados', type.driveFolder || type.label]);
  }
  const ledger = store.demo ? await store.loadLedger(event.id) : ((await readJsonFile(token, controlFolder, LEDGER_FILE)) || { entries: {} });
  const saveLedger = async () => {
    if (store.demo) return store.saveLedger(event.id, ledger);
    const t = await store.driveToken();
    await putFile(t, controlFolder, LEDGER_FILE, new Blob([JSON.stringify(ledger)], { type: 'application/json' }), 'application/json');
    await putFile(t, controlFolder, CONTROL_CSV, new Blob([controlCsv(event, ledger)], { type: 'text/csv' }), 'text/csv');
  };

  const errors = [];
  let done = 0;
  for (const p of people) {
    onProgress({ done, total: people.length, current: p.name, errors });
    const key = personKey(typeKey, p);
    const existing = ledger.entries[key];
    const code = existing?.code || newCode(event.prefix.toUpperCase());
    const fileName = `${safeFileName(p.name)} - ${code}.pdf`;
    try {
      const tier = (type.tiers || []).find((x) => x.name === p.tier);
      const pages = renderPages(type.template, {
        event, type, code,
        person: { ...p, cpf: maskCpf(p.cpf), logoUrl: p.logo ? files.get(p.logo) || '' : '' },
        qrSvg: await qrSvg(verifyLink(code)),
        signatures: event.signatures || [],
        tierIcon: tier?.icon || 'none',
      });
      const pdf = await pagesToPdf(pages, { title: `Certificado - ${p.name}` });
      // Controle sem CPF (minimização, LGPD).
      const entry = { ...existing, name: p.name, team: p.team, role: p.role, email: p.email, tier: p.tier, type: typeKey, code, fileName, generatedAt: new Date().toISOString() };
      if (zip) zip.file(`${type.driveFolder || type.label}/${fileName}`, pdf);
      else {
        const t = await store.driveToken();
        const id = await putFile(t, typeFolder, fileName, new Blob([pdf], { type: 'application/pdf' }), 'application/pdf');
        if (!existing?.url) await shareWithLink(t, id);
        entry.url = fileLink(id);
      }
      const rec = await encryptRecord(code, payloadOf(event, typeKey, entry), verification);
      await store.putRecord(rec.id, { eventId: event.id, iv: rec.iv, ct: rec.ct });
      ledger.entries[key] = entry;
      done++;
      if (done % 10 === 0) await saveLedger(); // não perde códigos se algo falhar no meio
    } catch (err) {
      errors.push(`${p.name}: ${err.message}`);
      if (err.code === 'reauth') break;
    }
  }
  await saveLedger();
  onProgress({ done, total: people.length, current: '', errors });
  return { done, errors, zip: zip ? await zip.generateAsync({ type: 'blob' }) : null };
}
