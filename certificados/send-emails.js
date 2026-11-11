#!/usr/bin/env node
// Envia por e-mail o certificado de cada pessoa (PDF do Drive em anexo), com mensagem por tipo.
//
//   node certificados/send-emails.js --event tsw-itapema-2026 --preview            (gera prévias HTML, não envia)
//   node certificados/send-emails.js --event tsw-itapema-2026 --test voce@ex.com   (1 e-mail de cada tipo para o endereço de teste)
//   node certificados/send-emails.js --event tsw-itapema-2026 --send [--type mentor] [--resend]
//
// Textos: eventos/<evento>/emails.json. Apelido: coluna "apelido" das listas em input/ (senão, primeiro nome).
// IO / estado: lê event.json, emails.json, input/*.csv e output/<evento>/ledger.json; envia via Apps Script;
// no envio real grava emailSentAt no ledger (local, fora do Git) para não reenviar.
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readPeopleCsv } from './lib/csv.js';
import { loadDriveConfig, sendCertificateEmail } from './lib/drive.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = {};
process.argv.slice(2).forEach((a, i, all) => {
  if (!a.startsWith('--')) return;
  const next = all[i + 1];
  args[a.slice(2)] = next && !next.startsWith('--') ? next : true;
});

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fill = (t, v) => t.replace(/\{(\w+)\}/g, (_, k) => v[k] ?? '');

function nicknames() {
  const map = {};
  const dir = join(ROOT, 'input');
  if (!existsSync(dir)) return map;
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.csv') && !x.startsWith('_'))) {
    for (const p of readPeopleCsv(join(dir, f))) if (p.email && p.nickname) map[p.email.toLowerCase()] = p.nickname;
  }
  return map;
}

function buildMessage(event, texts, entry, nick) {
  const verifyLink = `${event.verification.url}#${entry.code}`;
  const intro = fill(texts.intro[entry.type] || '', { team: entry.team || 'sua equipe' });
  const text = [
    `Olá, ${nick}!`, '', intro, '',
    'Seu certificado está em anexo, em PDF.', '',
    `Para verificar a autenticidade: ${verifyLink} (ou leia o QR code impresso no certificado).`,
    `Código de validação: ${entry.code}`, '',
    'Se encontrar algum dado incorreto, é só responder a este e-mail.', '',
    texts.closing,
  ].join('\n');
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#323232;max-width:600px">
<p>Olá, <b>${esc(nick)}</b>!</p>
<p>${esc(intro)}</p>
<p>Seu certificado está em anexo, em PDF.</p>
<p style="background:#EAF8F5;border:1px solid #5AC7B3;border-radius:10px;padding:12px 16px">
<b>Para verificar a autenticidade:</b> <a href="${esc(verifyLink)}" style="color:#1F3862">${esc(verifyLink.replace(/#.*/, ''))}</a> ou leia o QR code impresso no certificado.<br>
<b>Código de validação:</b> ${esc(entry.code)}</p>
<p>Se encontrar algum dado incorreto, é só responder a este e-mail.</p>
<p style="color:#1F3862">${texts.closing.split('\n').map(esc).join('<br>')}</p>
</div>`;
  return { subject: texts.subject, text, html };
}

async function main() {
  if (!args.event) throw new Error('Informe --event.');
  const event = JSON.parse(readFileSync(join(ROOT, 'eventos', args.event, 'event.json'), 'utf8'));
  const texts = JSON.parse(readFileSync(join(ROOT, 'eventos', args.event, 'emails.json'), 'utf8'));
  const ledgerPath = join(ROOT, 'output', event.id, 'ledger.json');
  const ledger = JSON.parse(readFileSync(ledgerPath, 'utf8'));
  const nick = nicknames();

  let entries = Object.values(ledger.entries).filter((e) => e.url && e.email);
  if (args.type) entries = entries.filter((e) => e.type === args.type);
  if (args.test) entries = Object.values(Object.fromEntries(entries.map((e) => [e.type, e]))); // 1 por tipo
  if (args.send && !args.resend) entries = entries.filter((e) => !e.emailSentAt);
  if (!entries.length) { console.log('Nada a enviar.'); return; }

  const build = (e) => buildMessage(event, texts, e, nick[e.email.toLowerCase()] || e.name.split(' ')[0]);

  if (args.preview) {
    const dir = join(ROOT, 'output', event.id, '_emails');
    mkdirSync(dir, { recursive: true });
    for (const e of Object.values(Object.fromEntries(entries.map((x) => [x.type, x])))) {
      const m = build(e);
      writeFileSync(join(dir, `${e.type}.html`), `<!doctype html><meta charset="utf-8"><title>${esc(m.subject)}</title><p><b>Para:</b> ${esc(e.email)}<br><b>Assunto:</b> ${esc(m.subject)}<br><b>Anexo:</b> ${esc(e.fileName)}</p><hr>${m.html}`);
    }
    console.log(`Prévias em ${dir}`);
    return;
  }
  if (!args.test && !args.send) throw new Error('Use --preview, --test <e-mail> ou --send.');

  const drive = loadDriveConfig(ROOT);
  if (!drive) throw new Error('Drive não configurado (drive.local.json).');
  let ok = 0;
  for (const e of entries) {
    const m = build(e);
    const to = args.test || e.email;
    try {
      const res = await sendCertificateEmail(drive, {
        to, subject: args.test ? `[TESTE · ${e.type}] ${m.subject}` : m.subject, text: m.text, html: m.html,
        fileId: e.url.match(/\/d\/([\w-]+)/)[1], senderName: texts.senderName, replyTo: texts.replyTo,
      });
      if (!args.test) { e.emailSentAt = new Date().toISOString(); writeFileSync(ledgerPath, JSON.stringify(ledger, null, 2) + '\n'); }
      ok++;
      console.log(`  enviado: ${e.type} · ${args.test ? 'teste' : e.name} (cota restante hoje: ${res.remaining})`);
    } catch (err) {
      console.error(`  ERRO: ${e.type} · ${e.name}: ${err.message}`);
    }
  }
  console.log(`Concluído: ${ok} de ${entries.length} enviado(s).`);
}

main().catch((err) => { console.error(err.message); process.exit(1); });
