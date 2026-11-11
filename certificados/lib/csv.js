// Leitura de lista CSV (separador "," ou ";", aspas duplas opcionais).
// Colunas aceitas (cabeçalho, sem diferenciar acento/maiúscula): nome, equipe/startup, função, e-mail.
// IO: lê o arquivo informado. Sem estado global.
import { readFileSync } from 'node:fs';

const normalizeHeader = (h) =>
  h.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

function mapHeader(h) {
  const k = normalizeHeader(h);
  if (k.startsWith('nome') || k === 'name') return 'name';
  if (k.includes('equipe') || k.includes('startup') || k === 'team') return 'team';
  if (k.startsWith('funcao') || k === 'role' || k === 'cargo') return 'role';
  if (k.replace(/[^a-z]/g, '') === 'email') return 'email';
  return null;
}

function splitLine(line, sep) {
  const out = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quoted) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') quoted = false;
      else cur += c;
    } else if (c === '"') quoted = true;
    else if (c === sep) { out.push(cur); cur = ''; }
    else cur += c;
  }
  out.push(cur);
  return out.map((v) => v.trim());
}

export function readPeopleCsv(path) {
  const text = readFileSync(path, 'utf8').replace(/^﻿/, '');
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) throw new Error(`Lista vazia: ${path}`);
  const sep = (lines[0].match(/;/g) || []).length > (lines[0].match(/,/g) || []).length ? ';' : ',';
  const keys = splitLine(lines[0], sep).map(mapHeader);
  if (!keys.includes('name')) throw new Error('A lista precisa de uma coluna "nome".');
  return lines.slice(1).map((line) => {
    const cells = splitLine(line, sep);
    const person = { name: '', team: '', role: '', email: '' };
    keys.forEach((k, i) => { if (k) person[k] = cells[i] || ''; });
    return person;
  }).filter((p) => p.name);
}
