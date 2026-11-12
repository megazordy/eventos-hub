// Contatos: filtro da lista, mensagem personalizada e link do WhatsApp (wa.me).
// Funções puras, sem IO. O envio é sempre manual: o link abre a conversa e a pessoa aperta Enviar.

const fold = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

// Telefone → número no formato do wa.me (só dígitos, com DDI). null se não parecer celular válido.
// Sem "+": assume Brasil (DDD + 9 dígitos; aceita celular antigo de 8 dígitos e acrescenta o 9).
export function waNumber(raw) {
  const s = String(raw || '').trim();
  let d = s.replace(/\D/g, '');
  if (s.startsWith('+') && !d.startsWith('55')) return d.length >= 8 && d.length <= 15 ? d : null;
  d = d.replace(/^0+/, '');
  if (d.startsWith('55') && (d.length === 12 || d.length === 13)) d = d.slice(2);
  if (d.length === 10 && /[6-9]/.test(d[2])) d = d.slice(0, 2) + '9' + d.slice(2);
  return /^[1-9]{2}9\d{8}$/.test(d) ? `55${d}` : null;
}

export const formatPhone = (n) => (n || '').replace(/^55(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3') || '';

export const firstName = (p) => (p.nickname || p.name || '').trim().split(/\s+/)[0] || '';

export const PLACEHOLDERS = [
  ['{nome}', 'apelido ou primeiro nome'],
  ['{nome_completo}', 'nome completo'],
  ['{equipe}', 'equipe / startup'],
  ['{funcao}', 'função'],
  ['{evento}', 'nome do evento'],
  ['{link}', 'link informado abaixo'],
];

export function fillMessage(template, person, { link = '', eventName = '' } = {}) {
  const values = {
    nome: firstName(person), nome_completo: person.name || '', equipe: person.team || '',
    funcao: person.role || '', evento: eventName, link,
  };
  return String(template || '').replace(/\{(\w+)\}/g, (m, k) => (k in values ? values[k] : m));
}

// O WhatsApp para Windows troca emojis vindos de link por "�". Opção de removê-los antes de montar o link.
export function stripEmoji(text) {
  return text
    .replace(/[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}\u{FE0F}\u{200D}\u{20E3}]/gu, '')
    .replace(/[ \t]+$/gm, '')
    .replace(/ {2,}/g, ' ');
}

export const waLink = (number, text) => `https://wa.me/${number}?text=${encodeURIComponent(text)}`;

export function distinct(people, key) {
  return [...new Set(people.map((p) => p[key]).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

export function filterPeople(people, { text = '', team = '', role = '', onlyValidPhone = false } = {}) {
  const q = fold(text);
  return people.filter((p) => (!team || p.team === team)
    && (!role || p.role === role)
    && (!onlyValidPhone || waNumber(p.phone))
    && (!q || [p.name, p.nickname, p.email, p.team, p.role].some((v) => fold(v).includes(q))));
}

// Chave para lembrar quem já recebeu, sem guardar o telefone em claro no navegador (FNV-1a).
export function sentKey(number) {
  let h = 0x811c9dc5;
  for (const c of number) { h ^= c.charCodeAt(0); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(36);
}

// Linhas da lista filtrada para exportar (sem CPF/CNPJ: só o necessário para o contato).
export function exportRows(people, opts) {
  return people.map((p) => {
    const number = waNumber(p.phone);
    return {
      Nome: p.name, Apelido: p.nickname, 'E-mail': p.email, Telefone: number ? formatPhone(number) : p.phone,
      Equipe: p.team, 'Função': p.role,
      'Link WhatsApp': number ? waLink(number, buildText(p, opts)) : '',
    };
  });
}

export function buildText(person, { template, link, eventName, noEmoji }) {
  const text = fillMessage(template, person, { link, eventName });
  return noEmoji ? stripEmoji(text) : text;
}
