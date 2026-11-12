import React, { useEffect, useState } from 'react';
import { Field, Text, ImageInput, Select } from '../components/ui.jsx';
import { defaultTypes, tswEvent, baseTemplate } from '../lib/presets.js';
import { newSalt } from '../lib/crypto.js';
import { PBKDF2_ITERATIONS } from '../lib/config.js';
import { publicEventOf } from '../lib/generate.js';
import { TIER_ICONS } from '../lib/icons.js';
import { go } from '../lib/nav.js';

const EMPTY = {
  name: '', edition: '', dates: '', datesShort: '', issuedAt: '', hours: '', city: '', venue: '', contact: '', prefix: '',
  signatures: [{ name: '', role: 'Organizador(a)', image: '' }],
};

const slugKey = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

export default function EventForm({ store, org, eventId }) {
  const [ev, setEv] = useState(null);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [newType, setNewType] = useState('');

  useEffect(() => {
    if (!eventId) { setEv(null); return; }
    store.getEvent(eventId).then((e) => setEv(e || { notFound: true }));
  }, [eventId, store]);

  if (!eventId && !ev) {
    const start = (base) => setEv({ ...base, orgId: org.id, salt: newSalt(), iterations: PBKDF2_ITERATIONS, prefix: '' });
    return (
      <>
        <h1>Novo evento</h1>
        <div className="grid">
          <div className="card"><b>Começar do zero</b><p className="muted">Modelos simples de 1 folha para participante, mentor e organização. Você personaliza tudo depois.</p><button type="button" className="btn" onClick={() => start({ ...EMPTY, types: defaultTypes() })}>Usar modelo simples</button></div>
          <div className="card"><b>Startup Weekend (modelo Itapema 2026)</b><p className="muted">Frente e verso, com participante, mentor, organização, staff, facilitação, jurado, patrocinador e apoiador.</p><button type="button" className="btn" onClick={() => start(tswEvent())}>Usar modelo Startup Weekend</button></div>
        </div>
      </>
    );
  }
  if (!ev) return <p className="muted">Carregando…</p>;
  if (ev.notFound) return <div className="card">Evento não encontrado.</div>;

  const set = (k) => (v) => setEv({ ...ev, [k]: v });
  const setSig = (i, k, v) => setEv({ ...ev, signatures: ev.signatures.map((s, j) => (j === i ? { ...s, [k]: v } : s)) });
  const setType = (key, patch) => setEv({ ...ev, types: { ...ev.types, [key]: { ...ev.types[key], ...patch } } });

  const save = async () => {
    setMsg('');
    if (!ev.name.trim()) return setMsg('Informe o nome do evento.');
    const prefix = (ev.prefix || '').toUpperCase();
    if (!/^[A-Z0-9]{3,10}$/.test(prefix)) return setMsg('O prefixo do código deve ter de 3 a 10 letras ou números, sem espaços (ex.: TSWI26).');
    setBusy(true);
    try {
      if (await store.prefixTaken(prefix, ev.id)) throw new Error(`O prefixo ${prefix} já é usado por outro evento.`);
      const saved = await store.saveEvent({ ...ev, prefix, orgId: org.id });
      await store.publishPublicEvent(publicEventOf(saved));
      setEv(saved);
      setMsg('Evento salvo.');
      if (!eventId) go(`/events/${saved.id}`);
    } catch (e) { setMsg(e.message); } finally { setBusy(false); }
  };

  const addType = () => {
    const label = newType.trim();
    const key = slugKey(label);
    if (!key || ev.types[key]) return;
    setEv({ ...ev, types: { ...ev.types, [key]: { label, driveFolder: label, template: baseTemplate({ label, badge: `de ${label.toLowerCase()}` }) } } });
    setNewType('');
  };

  return (
    <>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h1>{ev.id ? ev.name : 'Novo evento'}</h1>
        <div className="row">
          {ev.id && <a className="btn secondary" href={`#/events/${ev.id}/batch`}>Gerar certificados</a>}
          <button type="button" className="btn" disabled={busy} onClick={save}>Salvar evento</button>
        </div>
      </div>
      {msg && <div className="card">{msg}</div>}

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Dados do evento</h2>
        <div className="grid">
          <Field label="Nome do evento"><Text value={ev.name} onChange={set('name')} /></Field>
          <Field label="Edição" hint="Ex.: 4ª edição"><Text value={ev.edition} onChange={set('edition')} /></Field>
          <Field label="Datas (por extenso)" hint="Ex.: 6 a 8 de novembro de 2026"><Text value={ev.dates} onChange={set('dates')} /></Field>
          <Field label="Datas (curtas)" hint="Ex.: 6 a 8/11/2026"><Text value={ev.datesShort} onChange={set('datesShort')} /></Field>
          <Field label="Data de emissão" hint="Ex.: 8 de novembro de 2026"><Text value={ev.issuedAt} onChange={set('issuedAt')} /></Field>
          <Field label="Carga horária (horas)"><Text value={ev.hours} onChange={set('hours')} inputMode="numeric" /></Field>
          <Field label="Cidade/UF"><Text value={ev.city} onChange={set('city')} /></Field>
          <Field label="Local"><Text value={ev.venue} onChange={set('venue')} /></Field>
          <Field label="Contato público"><Text value={ev.contact} onChange={set('contact')} /></Field>
          <Field label="Prefixo do código" hint="Início do código de validação, único no portal (ex.: TSWI26)."><Text value={ev.prefix} onChange={(v) => set('prefix')(v.toUpperCase())} maxLength={10} /></Field>
        </div>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Assinaturas</h2>
        <p className="muted">A imagem da assinatura fica salva no evento e aparece só no PDF.</p>
        {ev.signatures.map((s, i) => (
          <div className="grid" key={i} style={{ marginBottom: 12, alignItems: 'end' }}>
            <Field label={`Nome ${i + 1}`}><Text value={s.name} onChange={(v) => setSig(i, 'name', v)} /></Field>
            <Field label="Cargo"><Text value={s.role} onChange={(v) => setSig(i, 'role', v)} /></Field>
            <Field label="Imagem da assinatura"><ImageInput value={s.image} onChange={(v) => setSig(i, 'image', v)} /></Field>
            <div><button type="button" className="btn secondary" onClick={() => setEv({ ...ev, signatures: ev.signatures.filter((_, j) => j !== i) })}>Remover assinatura</button></div>
          </div>
        ))}
        {ev.signatures.length < 3 && <button type="button" className="btn secondary" onClick={() => setEv({ ...ev, signatures: [...ev.signatures, { name: '', role: '', image: '' }] })}>+ Adicionar assinatura</button>}
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Tipos de certificado</h2>
        <table>
          <thead><tr><th>Tipo</th><th>Folhas</th><th>Carga horária própria</th><th>Data própria</th><th /></tr></thead>
          <tbody>
            {Object.entries(ev.types).map(([key, t]) => (
              <tr key={key}>
                <td><Text value={t.label} onChange={(v) => setType(key, { label: v })} /></td>
                <td>{t.template.pages}</td>
                <td><Text value={t.hours || ''} onChange={(v) => setType(key, { hours: v })} placeholder={`${ev.hours || '—'} (do evento)`} /></td>
                <td><Text value={t.dates || ''} onChange={(v) => setType(key, { dates: v })} placeholder="(do evento)" /></td>
                <td className="row">
                  {ev.id ? <a className="btn secondary" href={`#/events/${ev.id}/types/${key}`}>Editar modelo</a> : <span className="muted">Salve para editar</span>}
                  <button type="button" className="btn secondary" aria-label={`Remover ${t.label}`} onClick={() => { const { [key]: _, ...rest } = ev.types; setEv({ ...ev, types: rest }); }}>×</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="row" style={{ marginTop: 12 }}>
          <input placeholder="Novo tipo (ex.: Palestrante)" value={newType} onChange={(e) => setNewType(e.target.value)} style={{ maxWidth: 280 }} />
          <button type="button" className="btn secondary" onClick={addType}>+ Adicionar tipo</button>
        </div>
        {Object.entries(ev.types).filter(([, t]) => t.template.front.showTierBadge).map(([key, t]) => (
          <div key={key} style={{ marginTop: 16 }}>
            <b>Cotas de {t.label}</b>
            {(t.tiers || []).map((tier, i) => (
              <div className="row" key={i} style={{ marginTop: 6 }}>
                <input value={tier.name} onChange={(e) => setType(key, { tiers: t.tiers.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })} style={{ maxWidth: 260 }} />
                <Select value={tier.icon} onChange={(v) => setType(key, { tiers: t.tiers.map((x, j) => (j === i ? { ...x, icon: v } : x)) })} options={Object.entries(TIER_ICONS).map(([k, x]) => [k, x.label])} />
                <button type="button" className="btn secondary" onClick={() => setType(key, { tiers: t.tiers.filter((_, j) => j !== i) })}>×</button>
              </div>
            ))}
            <button type="button" className="btn secondary" style={{ marginTop: 6 }} onClick={() => setType(key, { tiers: [...(t.tiers || []), { name: '', icon: 'none' }] })}>+ Cota</button>
          </div>
        ))}
      </div>
    </>
  );
}
