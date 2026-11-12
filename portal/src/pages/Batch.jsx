import React, { useEffect, useMemo, useState } from 'react';
import { Field, Select, fileToDataUrl } from '../components/ui.jsx';
import { FIELDS, readSheet, guessMapping, toPeople, validatePeople } from '../lib/lists.js';
import { generateBatch } from '../lib/generate.js';

// Lote: escolhe o tipo, sobe a lista (CSV/XLSX), confere o mapeamento e gera os certificados.
// A lista é lida só no navegador; nada dela vai para o servidor do portal.
export default function Batch({ store, eventId }) {
  const [ev, setEv] = useState(null);
  const [typeKey, setTypeKey] = useState('');
  const [sheet, setSheet] = useState(null);
  const [mapping, setMapping] = useState({});
  const [logos, setLogos] = useState(new Map());
  const [progress, setProgress] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => { store.getEvent(eventId).then((e) => { setEv(e); setTypeKey(Object.keys(e?.types || {})[0] || ''); }); }, [eventId, store]);

  const type = ev?.types?.[typeKey];
  const people = useMemo(() => (sheet ? toPeople(sheet, mapping) : []), [sheet, mapping]);
  const issues = useMemo(() => validatePeople(people, { tiers: type?.template.front.showTierBadge ? (type.tiers || []).map((t) => t.name) : null }), [people, type]);
  const blocking = issues.some((i) => i.level === 'erro');
  const missingLogos = type?.template.front.sponsorLogo ? people.filter((p) => p.logo && !logos.has(p.logo)).map((p) => p.logo) : [];

  if (!ev) return <p className="muted">Carregando…</p>;

  const onFile = async (file) => {
    setError(''); setResult(null);
    try { const s = await readSheet(file); setSheet(s); setMapping(guessMapping(s.headers)); } catch (e) { setError(e.message); setSheet(null); }
  };
  const onLogos = async (files) => {
    const next = new Map(logos);
    for (const f of files) next.set(f.name, await fileToDataUrl(f, 900));
    setLogos(next);
  };
  const run = async () => {
    setError(''); setResult(null);
    try {
      const res = await generateBatch({ store, event: ev, typeKey, people, files: logos, onProgress: setProgress });
      setResult(res);
    } catch (e) { setError(e.message); } finally { setProgress(null); }
  };
  const downloadZip = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(result.zip);
    a.download = `certificados-${ev.prefix}-${typeKey}.zip`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  };

  return (
    <>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h1>Gerar certificados · {ev.name}</h1>
        <a className="btn secondary" href={`#/events/${ev.id}`}>Voltar ao evento</a>
      </div>

      <div className="card stack">
        <Field label="Tipo de certificado"><Select value={typeKey} onChange={(v) => { setTypeKey(v); setResult(null); }} options={Object.entries(ev.types).map(([k, t]) => [k, t.label])} /></Field>
        <Field label="Lista de pessoas (CSV ou Excel)" hint="Uma linha por pessoa. A lista é lida no seu navegador e não é enviada ao portal.">
          <input type="file" accept=".csv,.xlsx,.xls,.ods,text/csv" onChange={(e) => e.target.files[0] && onFile(e.target.files[0])} />
        </Field>
        {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}
      </div>

      {sheet && (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Colunas</h2>
          <div className="grid">
            {FIELDS.map((f) => (
              <Field key={f.key} label={f.label + (f.required ? ' *' : '')}>
                <Select value={mapping[f.key] ?? ''} onChange={(v) => setMapping({ ...mapping, [f.key]: v === '' ? undefined : Number(v) })}
                  options={[['', '— não usar —'], ...sheet.headers.map((h, i) => [String(i), h || `Coluna ${i + 1}`])]} />
              </Field>
            ))}
          </div>
          <h2>{people.length} pessoa(s)</h2>
          {issues.length > 0 && <ul className="issues">{issues.slice(0, 30).map((i, k) => <li key={k} className={i.level}>Linha {i.line}: {i.text}</li>)}</ul>}
          <table>
            <thead><tr><th>Nome</th><th>E-mail</th><th>Equipe</th><th>CPF</th>{type?.template.front.showTierBadge && <th>Cota</th>}</tr></thead>
            <tbody>{people.slice(0, 10).map((p, i) => <tr key={i}><td>{p.name}</td><td>{p.email}</td><td>{p.team}</td><td>{p.cpf ? '***' + p.cpf.slice(3, -2) + '**' : ''}</td>{type?.template.front.showTierBadge && <td>{p.tier}</td>}</tr>)}</tbody>
          </table>
          {people.length > 10 && <p className="muted">… e mais {people.length - 10}.</p>}
        </div>
      )}

      {sheet && type?.template.front.sponsorLogo && (
        <div className="card stack">
          <h2 style={{ marginTop: 0 }}>Logos</h2>
          <p className="muted">Envie as imagens com o mesmo nome de arquivo informado na coluna "logo" da lista.</p>
          <input type="file" accept="image/*" multiple onChange={(e) => onLogos([...e.target.files])} />
          <div className="row">{[...logos].map(([n, u]) => <img key={n} src={u} alt={n} title={n} className="thumb" />)}</div>
          {missingLogos.length > 0 && <p className="pill warn">Faltam: {missingLogos.join(', ')}</p>}
        </div>
      )}

      {sheet && (
        <div className="card stack">
          <div className="row">
            <button type="button" className="btn" disabled={!people.length || blocking || !!progress || mapping.name == null} onClick={run}>
              Gerar {people.length} certificado(s)
            </button>
            {blocking && <span className="pill warn">Corrija os erros da lista antes de gerar.</span>}
          </div>
          <p className="muted">{store.demo ? 'Modo demonstração: os PDFs serão baixados em um arquivo ZIP.' : 'Os PDFs vão para o seu Google Drive (pasta eventos-hub), com link de leitura; o controle de códigos fica na pasta _Controle. Quem já tem certificado mantém o mesmo código.'}</p>
          {progress && (
            <div>
              <div className="progress"><div style={{ width: `${(progress.done / progress.total) * 100}%` }} /></div>
              <p className="muted">{progress.done} de {progress.total} · {progress.current}</p>
            </div>
          )}
          {result && (
            <div>
              <p><b>{result.done}</b> certificado(s) gerado(s){result.errors.length ? `, ${result.errors.length} com erro` : ''}.</p>
              {result.errors.length > 0 && <ul className="issues">{result.errors.map((e, i) => <li key={i} className="erro">{e}</li>)}</ul>}
              {result.zip && <button type="button" className="btn" onClick={downloadZip}>Baixar ZIP</button>}
            </div>
          )}
        </div>
      )}
    </>
  );
}
