// Leitura de lista CSV (separador "," ou ";", aspas duplas opcionais).
// Colunas aceitas (cabeçalho, sem diferenciar acento/maiúscula): nome, equipe/startup, função, e-mail, cpf,
// cnpj (ou "cnpj/cpf"), cota (patrocinador: Mirante do Encanto, Ponte dos Suspiros ou Meia Praia)
// e observação (texto extra só para aquela pessoa, exibido na frente do certificado).
// Outras colunas são ignoradas.
// IO: lê o arquivo informado. Sem estado global.
import { readFileSync } from 'node:fs';

const normalizeHeader = (h) =>
  h.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

// Correspondência exata: evita que colunas como "Nome do Contato de Emergência" sobrescrevam o nome.
const HEADER_MAP = {
  nome: 'name', 'nome completo': 'name', 'nome no certificado': 'name', name: 'name',
  equipe: 'team', startup: 'team', 'equipe/startup': 'team', 'startup/equipe': 'team', team: 'team',
  funcao: 'role', cargo: 'role', role: 'role',
  email: 'email', 'e-mail': 'email',
  cpf: 'cpf',
  cnpj: 'cnpj',
  'cnpj/cpf': 'document', 'cpf/cnpj': 'document', documento: 'document',
  cota: 'tier', 'tipo de patrocinio': 'tier', 'tipo de patrocinador': 'tier',
  observacao: 'note', observacoes: 'note', detalhes: 'note',
  apelido: 'nickname', 'como chamar': 'nickname',
  logo: 'logo',
};
const mapHeader = (h) => HEADER_MAP[normalizeHeader(h)] || null;

// 12345678901 -> 123.456.789-01 (vazio se não houver dígitos)
const formatCpf = (v) => {
  const d = String(v || '').replace(/\D/g, '');
  return d ? d.padStart(11, '0').replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : '';
};

// 12345678000190 -> 12.345.678/0001-90
const formatCnpj = (v) => {
  const d = String(v || '').replace(/\D/g, '');
  return d ? d.padStart(14, '0').replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5') : '';
};

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
    const person = { name: '', team: '', role: '', email: '', cpf: '', cnpj: '', tier: '', note: '', nickname: '', logo: '', document: '' };
    keys.forEach((k, i) => { if (k && !person[k]) person[k] = cells[i] || ''; });
    // Coluna única "CNPJ/CPF": 11 dígitos = CPF, senão CNPJ.
    const doc = person.document.replace(/\D/g, '');
    if (doc && !person.cpf && !person.cnpj) {
      if (doc.length <= 11) person.cpf = doc; else person.cnpj = doc;
    }
    delete person.document;
    person.cpf = formatCpf(person.cpf);
    person.cnpj = formatCnpj(person.cnpj);
    return person;
  }).filter((p) => p.name);
}
