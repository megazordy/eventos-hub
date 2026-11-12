import React, { useEffect, useMemo, useState } from 'react';
import { Field, Text, Area, Select } from '../components/ui.jsx';
import { FIELDS, readSheet, guessMapping, toPeople } from '../lib/lists.js';
import { waNumber, formatPhone, filterPeople, distinct, waLink, buildText, sentKey, exportRows, PLACEHOLDERS } from '../lib/contacts.js';

// Contatos: filtra a lista (CSV/XLSX) e monta um link de WhatsApp por pessoa com a mensagem pronta.
// A lista é lida só no navegador. No localStorage ficam apenas a mensagem e as marcas de "enviado"
// (por hash do número, sem telefone em claro). Exportar gera um arquivo no computador do organizador.
const CONTACT_FIELDS = FIELDS.filter((f) => ['name', 'nickname', 'email', 'phone', 'team', 'role'].includes(f.key));

const DEFAULT_MSG = {
  template: 'Oi, {nome}! Aqui é da organização do *{evento}*. Obrigado por participar!\n\nQueremos muito saber como foi a sua experiência: leva só 3 minutinhos.\n\nResponda aqui: {link}\n\nValeu demais!',
  link: '',
  noEmoji: true,
};

const storage = {
  get(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } },
  set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* sem armazenamento: segue sem lembrar */ } },
};

export default function Contacts({ store, eventId }) {
  const [ev, setEv] = useState(null);
  const [sheet, setSheet] = useState(null);
  const [mapping, setMapping] = useState({});
  const [filters, setFilters] = useState({ text: '', team: '', role: '', onlyValidPhone: false, hideSent: false });
  const [msg, setMsg] = useState(() => storage.get(`eh.msg.${eventId}`, DEFAULT_MSG));
  const [sent, setSent] = useState(() => storage.get(`eh.sent.${eventId}`, {}));
  const [error, setError] = useState('');

  useEffect(() => { store.getEvent(eventId).then(setEv); }, [eventId, store]);
  useEffect(() => storage.set(`eh.msg.${eventId}`, msg), [eventId, msg]);
  useEffect(() => storage.set(`eh.sent.${eventId}`, sent), [eventId, sent]);

  const people = useMemo(() => (sheet ? toPeople(sheet, mapping) : []), [sheet, mapping]);
  const opts = { ...msg, eventName: ev?.name || '' };
  const isSent = (p) => { const n = waNumber(p.phone); return !!(n && sent[sentKey(n)]); };
  const shown = useMemo(
    () => filterPeople(people, filters).filter((p) => !filters.hideSent || !isSent(p)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [people, filters, sent],
  );

  if (!ev) return <p className="muted">Carregando…</p>;

  const onFile = async (file) => {
    setError('');
    try { const s = await readSheet(file); setSheet(s); setMapping(guessMapping(s.headers)); } catch (e) { setError(e.message); setSheet(null); }
  };
  const setFilter = (k) => (v) => setFilters({ ...filters, [k]: v });
  const mark = (number, value) => setSent((s) => ({ ...s, [sentKey(number)]: value }));
  const withPhone = shown.filter((p) => waNumber(p.phone));
  const sentCount = withPhone.filter(isSent).length;

  const exportList = async () => {
    const XLSX = await import('xlsx');
    const ws = XLSX.utils.json_to_sheet(exportRows(shown, opts));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Contatos');
    XLSX.writeFile(wb, `contatos-${ev.prefix || 'evento'}.xlsx`);
  };
  const preview = shown[0] ? buildText(shown[0], opts) : '';

  return (
    <>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h1>Contatos e WhatsApp · {ev.name}</h1>
        <a className="btn secondary" href={`#/events/${ev.id}`}>Voltar ao evento</a>
      </div>

      <div className="card stack">
        <Field label="Lista de pessoas (CSV ou Excel)" hint="Precisa de uma coluna de telefone. A lista é lida no seu navegador e não é enviada ao portal.">
          <input type="file" accept=".csv,.xlsx,.xls,.ods,text/csv" onChange={(e) => e.target.files[0] && onFile(e.target.files[0])} />
        </Field>
        {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}
      </div>

      {sheet && (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Colunas</h2>
          <div className="grid">
            {CONTACT_FIELDS.map((f) => (
              <Field key={f.key} label={f.label + (f.required ? ' *' : '')}>
                <Select value={mapping[f.key] ?? ''} onChange={(v) => setMapping({ ...mapping, [f.key]: v === '' ? undefined : Number(v) })}
                  options={[['', '— não usar —'], ...sheet.headers.map((h, i) => [String(i), h || `Coluna ${i + 1}`])]} />
              </Field>
            ))}
          </div>
          {mapping.phone == null && <p className="pill warn">Escolha a coluna de telefone para montar os links.</p>}
        </div>
      )}

      {sheet && (
        <div className="card stack">
          <h2 style={{ marginTop: 0 }}>Mensagem</h2>
          <Field label="Texto" hint={`Campos: ${PLACEHOLDERS.map(([k, d]) => `${k} (${d})`).join(', ')}. Use *texto* para negrito.`}>
            <Area value={msg.template} onChange={(v) => setMsg({ ...msg, template: v })} rows={8} />
          </Field>
          <Field label="Link (formulário, grupo, etc.)" hint="Entra no lugar de {link}.">
            <Text value={msg.link} onChange={(v) => setMsg({ ...msg, link: v.trim() })} placeholder="https://forms.gle/..." inputMode="url" />
          </Field>
          <label className="row"><input type="checkbox" checked={msg.noEmoji} onChange={(e) => setMsg({ ...msg, noEmoji: e.target.checked })} /> Remover emojis (o WhatsApp para Windows troca emojis vindos de link por "�")</label>
          {preview && <div><b>Prévia ({shown[0].name})</b><pre className="msg-preview">{preview}</pre></div>}
        </div>
      )}

      {sheet && (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Lista filtrada</h2>
          <div className="grid">
            <Field label="Buscar"><Text value={filters.text} onChange={setFilter('text')} placeholder="Nome, e-mail, equipe…" /></Field>
            <Field label="Equipe"><Select value={filters.team} onChange={setFilter('team')} options={[['', 'Todas'], ...distinct(people, 'team').map((t) => [t, t])]} /></Field>
            <Field label="Função"><Select value={filters.role} onChange={setFilter('role')} options={[['', 'Todas'], ...distinct(people, 'role').map((t) => [t, t])]} /></Field>
          </div>
          <div className="row" style={{ margin: '12px 0' }}>
            <label className="row"><input type="checkbox" checked={filters.onlyValidPhone} onChange={(e) => setFilter('onlyValidPhone')(e.target.checked)} /> Só com telefone válido</label>
            <label className="row"><input type="checkbox" checked={filters.hideSent} onChange={(e) => setFilter('hideSent')(e.target.checked)} /> Esconder já enviados</label>
            <span className="pill">{shown.length} pessoa(s) · enviados {sentCount} de {withPhone.length}</span>
            <button type="button" className="btn secondary" disabled={!shown.length} onClick={exportList}>Baixar lista filtrada (Excel)</button>
          </div>
          <p className="muted">Envie com calma, alguns segundos entre cada conversa, para o WhatsApp não bloquear o número. A planilha exportada tem dados pessoais: guarde só no seu computador ou Drive.</p>
          <table>
            <thead><tr><th>Enviado</th><th>Nome</th><th>Equipe</th><th>Telefone</th><th /></tr></thead>
            <tbody>
              {shown.map((p, i) => {
                const n = waNumber(p.phone);
                const done = isSent(p);
                return (
                  <tr key={i} className={done ? 'sent' : ''}>
                    <td><input type="checkbox" aria-label={`Marcar ${p.name} como enviado`} disabled={!n} checked={done} onChange={(e) => mark(n, e.target.checked)} /></td>
                    <td>{p.name}{p.role && <small className="muted"> · {p.role}</small>}</td>
                    <td>{p.team}</td>
                    <td>{n ? formatPhone(n) : <span className="pill warn">{p.phone ? `inválido: ${p.phone}` : 'sem telefone'}</span>}</td>
                    <td>{n && <a className="btn whatsapp" href={waLink(n, buildText(p, opts))} target="_blank" rel="noopener noreferrer" onClick={() => mark(n, true)}>Abrir no WhatsApp</a>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
