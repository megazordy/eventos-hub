// Leitura de listas (CSV ou XLSX) no navegador. Os dados nunca saem do computador do organizador,
// exceto para o Drive dele. Sem estado global.
import * as XLSX from 'xlsx';

export const FIELDS = [
  { key: 'name', label: 'Nome no certificado', required: true },
  { key: 'email', label: 'E-mail' },
  { key: 'team', label: 'Equipe / startup' },
  { key: 'role', label: 'Função' },
  { key: 'cpf', label: 'CPF' },
  { key: 'cnpj', label: 'CNPJ' },
  { key: 'tier', label: 'Cota (patrocinador)' },
  { key: 'logo', label: 'Logo (nome do arquivo)' },
  { key: 'nickname', label: 'Apelido' },
  { key: 'note', label: 'Observação' },
];

const norm = (h) => String(h || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

// Sugestão automática de mapeamento (correspondência exata, para não confundir
// "Nome do contato de emergência" com o nome da pessoa).
const GUESS = {
  name: ['nome', 'nome completo', 'nome no certificado', 'name', 'qual seu nome completo?'],
  email: ['email', 'e-mail', 'qual seu e-mail?'],
  team: ['equipe', 'startup', 'equipe/startup', 'startup/equipe', 'team'],
  role: ['funcao', 'cargo', 'role'],
  cpf: ['cpf', 'digite seu cpf'],
  cnpj: ['cnpj'],
  tier: ['cota', 'tipo de patrocinio'],
  logo: ['logo'],
  nickname: ['apelido', 'como chamar', 'como gostaria que divulguemos seu nome?'],
  note: ['observacao', 'observacoes', 'detalhes'],
};

export function guessMapping(headers) {
  const map = {};
  for (const [field, names] of Object.entries(GUESS)) {
    const i = headers.findIndex((h) => names.includes(norm(h)));
    if (i >= 0) map[field] = i;
  }
  return map;
}

export async function readSheet(file) {
  // CSV é lido como texto UTF-8 (acentos); planilhas (xlsx/ods) como binário.
  const isCsv = /\.csv$/i.test(file.name) || file.type === 'text/csv';
  const wb = isCsv
    ? XLSX.read((await file.text()).replace(/^﻿/, ''), { type: 'string', raw: true })
    : XLSX.read(await file.arrayBuffer(), { type: 'array' });
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: '', raw: false });
  const nonEmpty = rows.filter((r) => r.some((c) => String(c).trim()));
  if (nonEmpty.length < 2) throw new Error('A lista precisa de um cabeçalho e ao menos uma linha.');
  return { headers: nonEmpty[0].map(String), rows: nonEmpty.slice(1).map((r) => r.map((c) => String(c).trim())) };
}

const digits = (v) => String(v || '').replace(/\D/g, '');
export const formatCpf = (v) => { const d = digits(v); return d ? d.padStart(11, '0').replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : ''; };
export const formatCnpj = (v) => { const d = digits(v); return d ? d.padStart(14, '0').replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5') : ''; };
export const maskCpf = (cpf) => (cpf ? cpf.replace(/^\d{3}/, '***').replace(/-\d{2}$/, '-**') : '');

// Dígitos verificadores do CPF (só avisa; não bloqueia).
export function isValidCpf(v) {
  const d = digits(v);
  if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false;
  const calc = (n) => { let s = 0; for (let i = 0; i < n; i++) s += +d[i] * (n + 1 - i); const r = (s * 10) % 11; return r === 10 ? 0 : r; };
  return calc(9) === +d[9] && calc(10) === +d[10];
}

export function toPeople(sheet, mapping) {
  return sheet.rows.map((r) => {
    const p = {};
    for (const f of FIELDS) p[f.key] = mapping[f.key] != null ? (r[mapping[f.key]] || '').trim() : '';
    p.cpf = formatCpf(p.cpf);
    p.cnpj = formatCnpj(p.cnpj);
    return p;
  }).filter((p) => p.name);
}

export function validatePeople(people, { tiers } = {}) {
  const issues = [];
  const seen = new Map();
  people.forEach((p, i) => {
    const line = i + 2;
    const key = (p.email || p.name).toLowerCase();
    if (seen.has(key)) issues.push({ line, level: 'erro', text: `${p.name}: repetido (linha ${seen.get(key)})` });
    seen.set(key, line);
    if (p.cpf && !isValidCpf(p.cpf)) issues.push({ line, level: 'aviso', text: `${p.name}: CPF ${p.cpf} parece inválido` });
    if (p.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(p.email)) issues.push({ line, level: 'aviso', text: `${p.name}: e-mail "${p.email}" parece inválido` });
    if (tiers?.length && !tiers.includes(p.tier)) issues.push({ line, level: 'erro', text: `${p.name}: cota "${p.tier}" inválida (use ${tiers.join(', ')})` });
  });
  return issues;
}
