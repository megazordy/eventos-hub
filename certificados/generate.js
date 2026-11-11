#!/usr/bin/env node
// Gera certificados de um lote (um tipo por lote), envia ao Drive e atualiza o índice cifrado de verificação.
//
//   node certificados/generate.js --event tsw-itapema-2026 --type participante --list input/participantes.csv
//   opções: --no-upload (só gera os PDFs locais) · --draft (prévia, aceita assinaturas pendentes, não publica)
//           --only-index (só reconstrói docs/data a partir do controle local)
//           --new-codes (troca o código de todos da lista; use só antes de distribuir os certificados)
//
// IO / estado:
// - lê eventos/<evento>/event.json, modelos e a lista CSV;
// - escreve PDFs em output/<evento>/<Pasta do tipo>/ e o controle local output/<evento>/ledger.json (fora do Git);
// - envia PDFs ao Drive (Apps Script) quando configurado;
// - reescreve docs/events.json e docs/data/<evento>.json (públicos, apenas dados cifrados).
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { readPeopleCsv } from './lib/csv.js';
import { newCode, encryptRecord } from './lib/crypto.js';
import { openBrowser, renderPdf, qrSvg, cssVars } from './lib/render.js';
import { loadDriveConfig, uploadCertificate } from './lib/drive.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const next = argv[i + 1];
    if (next && !next.startsWith('--')) { args[a.slice(2)] = next; i++; } else args[a.slice(2)] = true;
  }
  return args;
}

const readJson = (p, fallback) => (existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : fallback);
const writeJson = (p, v) => { mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, JSON.stringify(v, null, 2) + '\n'); };
const sha = (v) => createHash('sha256').update(JSON.stringify(v)).digest('hex');
const safeFileName = (s) => s.normalize('NFC').replace(/[\\/:*?"<>|]+/g, '').replace(/\s+/g, ' ').trim();
// CPF parcialmente oculto no PDF (padrão usado pelo governo): 123.456.789-01 -> ***.456.789-**
const maskCpf = (cpf) => (cpf ? cpf.replace(/^\d{3}/, '***').replace(/-\d{2}$/, '-**') : '');
const personKey = (type, p) => `${type}|${(p.email || p.name).trim().toLowerCase()}`;

function publicEventInfo(event) {
  const { verification: v } = event;
  return {
    id: event.id,
    prefix: v.codePrefix,
    name: event.name,
    edition: event.edition,
    dates: event.dates.label,
    hours: event.hours,
    city: event.city,
    contact: event.contact,
    salt: v.salt,
    iterations: v.iterations,
    data: `data/${event.id}.json`,
  };
}

async function publishIndex(event, ledger) {
  const records = {};
  for (const entry of Object.values(ledger.entries)) {
    const payload = {
      name: entry.name,
      type: event.types[entry.type]?.label || entry.type,
      team: entry.team || '',
      role: entry.role || '',
      pdfUrl: entry.url || '',
    };
    // Refaz o registro se mudar o dado, o código ou os parâmetros de derivação.
    const hash = sha({ payload, code: entry.code, salt: event.verification.salt, iterations: event.verification.iterations });
    if (!entry.record || entry.recordHash !== hash) {
      entry.record = await encryptRecord(entry.code, payload, event.verification);
      entry.recordHash = hash;
    }
    records[entry.record.id] = { iv: entry.record.iv, ct: entry.record.ct };
  }
  const sorted = Object.fromEntries(Object.entries(records).sort(([a], [b]) => a.localeCompare(b)));
  writeJson(join(ROOT, 'docs', 'data', `${event.id}.json`), { records: sorted });

  const eventsPath = join(ROOT, 'docs', 'events.json');
  const events = readJson(eventsPath, []).filter((e) => e.id !== event.id);
  events.push(publicEventInfo(event));
  writeJson(eventsPath, events.sort((a, b) => a.id.localeCompare(b.id)));
  return Object.keys(sorted).length;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.event) throw new Error('Informe --event <pasta em eventos/>.');
  const eventDir = join(ROOT, 'eventos', args.event);
  const event = readJson(join(eventDir, 'event.json'));
  if (!event) throw new Error(`Evento não encontrado: ${eventDir}`);

  const outDir = join(ROOT, 'output', event.id);
  const ledgerPath = join(outDir, 'ledger.json');
  const ledger = readJson(ledgerPath, { entries: {} });
  const saveLedger = () => writeJson(ledgerPath, ledger);

  if (args['only-index']) {
    const n = await publishIndex(event, ledger);
    saveLedger();
    console.log(`Índice publicado: ${n} certificado(s) em docs/data/${event.id}.json`);
    return;
  }

  const typeConf = event.types[args.type];
  if (!typeConf) throw new Error(`--type deve ser um de: ${Object.keys(event.types).join(', ')}`);
  if (!args.list) throw new Error('Informe --list <arquivo.csv>.');

  const draft = Boolean(args.draft);
  const pending = event.signatures.filter((s) => /^\[.*\]$/.test(s.name));
  if (pending.length && !draft) {
    throw new Error('Assinaturas pendentes em event.json (nome entre colchetes). Preencha ou use --draft para prévia.');
  }

  const drive = draft || args['no-upload'] ? null : loadDriveConfig(ROOT);
  if (!draft && !args['no-upload'] && !drive) {
    throw new Error('Drive não configurado (drive.local.json ou EVENTOS_HUB_DRIVE_URL/TOKEN). Use --no-upload para gerar só local.');
  }

  // Imagens de assinatura ficam em assets/private/ (fora do Git). Faltando o arquivo, sai só o nome.
  const signatures = event.signatures.map((s) => {
    if (s.image && !existsSync(join(eventDir, s.image))) {
      console.warn(`Aviso: assinatura não encontrada (${s.image}); o certificado sai só com o nome.`);
      return { ...s, image: '' };
    }
    return s;
  });

  const people = readPeopleCsv(args.list);
  const verifyHost = event.verification.url.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const pdfDir = join(outDir, draft ? '_draft' : typeConf.driveFolder);
  const tmpDir = join(outDir, '.tmp');
  mkdirSync(pdfDir, { recursive: true });

  console.log(`${people.length} pessoa(s) · tipo ${args.type}${draft ? ' · PRÉVIA' : ''}${drive ? ' · com envio ao Drive' : ''}`);
  const browser = await openBrowser();
  let ok = 0;
  const failures = [];
  try {
    for (const person of people) {
      const key = personKey(args.type, person);
      const existing = ledger.entries[key];
      const code = draft
        ? `${event.verification.codePrefix}-PREV-IA00-0000`
        : (!args['new-codes'] && existing?.code) || newCode(event.verification.codePrefix);
      const verifyUrl = `${event.verification.url}#${code}`;
      const fileName = `${safeFileName(person.name)} - ${code}.pdf`;
      try {
        if (typeConf.tiers && !typeConf.tiers.includes(person.tier)) {
          throw new Error(`cota "${person.tier}" inválida; use: ${typeConf.tiers.join(', ')}`);
        }
        const pdf = await renderPdf(browser, {
          eventDir,
          templates: typeConf.templates,
          tmpDir,
          data: {
            event, person: { ...person, cpf: maskCpf(person.cpf) }, code, verifyHost,
            qrSvg: await qrSvg(verifyUrl),
            cssVars: cssVars(event.colors),
            sig1: signatures[0] || {},
            sig2: signatures[1] || {},
          },
        });
        writeFileSync(join(pdfDir, fileName), pdf);
        if (draft) { ok++; console.log(`  prévia: ${fileName}`); continue; }

        // Controle local sem CPF (minimização, LGPD): o código e o e-mail bastam para reemitir.
        const { cpf: _cpf, ...personWithoutCpf } = person;
        const entry = { ...existing, ...personWithoutCpf, type: args.type, code, fileName, generatedAt: new Date().toISOString() };
        delete entry.cpf;
        if (drive) {
          const res = await uploadCertificate(drive, {
            folderPath: [...event.drive.path, typeConf.driveFolder],
            fileName,
            pdf,
            control: { folderPath: [...event.drive.path, event.drive.controlFolder], sheetName: event.drive.controlSheet },
            row: { code, type: typeConf.label, name: person.name, team: person.team, role: person.role, email: person.email, fileName },
          });
          entry.url = res.url;
        }
        ledger.entries[key] = entry;
        saveLedger(); // salva a cada pessoa: um erro no meio não perde códigos já emitidos
        ok++;
        console.log(`  ok: ${person.name} · ${code}${entry.url ? ' · Drive' : ''}`);
      } catch (err) {
        failures.push(`${person.name}: ${err.message}`);
        console.error(`  ERRO: ${person.name}: ${err.message}`);
      }
    }
  } finally {
    await browser.close();
    rmSync(tmpDir, { recursive: true, force: true });
  }

  if (!draft) {
    const n = await publishIndex(event, ledger);
    saveLedger();
    console.log(`Índice de verificação atualizado: ${n} certificado(s). Faça commit de docs/ para publicar.`);
  }
  console.log(`Concluído: ${ok} gerado(s), ${failures.length} falha(s). PDFs em ${pdfDir}`);
  if (failures.length) process.exitCode = 1;
}

main().catch((err) => { console.error(err.message); process.exit(1); });
