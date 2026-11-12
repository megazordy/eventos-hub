import React, { useEffect, useState } from 'react';
import { Field, Text, Area, Select, ListEditor, ImageInput, Preview } from '../components/ui.jsx';
import { CORNER_ICONS } from '../lib/icons.js';
import { TEXT_VARS } from '../lib/template.js';

const COLORS = [['teal', 'Turquesa'], ['peach', 'Pêssego'], ['navy', 'Azul-marinho']];
const COLOR_LABELS = { navy: 'Principal (títulos)', teal: 'Destaque', tealDark: 'Destaque escuro', peach: 'Secundária', text: 'Texto', line: 'Linhas', panel: 'Faixa lateral' };

// Editor de modelo por formulário, com prévia ao vivo idêntica ao PDF. 1 ou 2 folhas.
export default function TemplateEditor({ store, eventId, typeKey }) {
  const [ev, setEv] = useState(null);
  const [t, setT] = useState(null);
  const [sample, setSample] = useState({ name: 'Maria Exemplo da Silva', team: 'Startup Exemplo', cpf: '***.456.789-**', cnpj: '', tier: '', note: '' });
  const [msg, setMsg] = useState('');

  useEffect(() => {
    store.getEvent(eventId).then((e) => {
      setEv(e);
      const type = e?.types?.[typeKey];
      if (type) {
        setT(structuredClone(type.template));
        if (type.tiers?.length) setSample((s) => ({ ...s, tier: type.tiers[0].name }));
      }
    });
  }, [eventId, typeKey, store]);

  if (!ev) return <p className="muted">Carregando…</p>;
  if (!t) return <div className="card">Tipo de certificado não encontrado.</div>;
  const type = ev.types[typeKey];

  const up = (path, value) => setT((prev) => {
    const next = structuredClone(prev);
    const keys = path.split('.');
    let o = next;
    keys.slice(0, -1).forEach((k) => { o = o[k]; });
    o[keys.at(-1)] = value;
    return next;
  });
  const f = t.front;
  const b = t.back;

  const save = async () => {
    setMsg('');
    try {
      const saved = await store.saveEvent({ ...ev, types: { ...ev.types, [typeKey]: { ...type, template: t } } });
      setEv(saved);
      setMsg('Modelo salvo.');
    } catch (e) { setMsg(e.message); }
  };

  return (
    <>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h1>Modelo · {type.label}</h1>
        <div className="row">
          <a className="btn secondary" href={`#/events/${eventId}`}>Voltar ao evento</a>
          <button type="button" className="btn" onClick={save}>Salvar modelo</button>
        </div>
      </div>
      {msg && <div className="card">{msg}</div>}
      <div className="editor">
        <div className="form">
          <details className="section" open>
            <summary>Geral</summary>
            <div className="stack">
              <Field label="Folhas"><Select value={String(t.pages)} onChange={(v) => up('pages', Number(v))} options={[['1', '1 folha (só frente)'], ['2', '2 folhas (frente e verso)']]} /></Field>
              <Field label="Marca na faixa lateral" hint="Uma linha por item; marque as que ficam na cor de destaque.">
                {t.brand.map((l, i) => (
                  <div className="row" key={i}>
                    <input value={l.text} onChange={(e) => up('brand', t.brand.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))} style={{ flex: 1 }} />
                    <label className="muted"><input type="checkbox" checked={!!l.accent} onChange={(e) => up('brand', t.brand.map((x, j) => (j === i ? { ...x, accent: e.target.checked } : x)))} style={{ width: 'auto' }} /> destaque</label>
                    <button type="button" className="btn secondary" onClick={() => up('brand', t.brand.filter((_, j) => j !== i))}>×</button>
                  </div>
                ))}
                <button type="button" className="btn secondary" onClick={() => up('brand', [...t.brand, { text: '', accent: false }])}>+ Linha</button>
              </Field>
              <Field label="Imagem da faixa lateral" hint="Logo em branco, centralizada na faixa."><ImageInput value={t.panelImage} onChange={(v) => up('panelImage', v)} /></Field>
              <Field label="Marca d'água (canto inferior direito)"><ImageInput value={t.watermark} onChange={(v) => up('watermark', v)} /></Field>
              <div className="grid">
                {Object.keys(t.colors).map((k) => (
                  <Field key={k} label={COLOR_LABELS[k] || k}><input type="color" value={t.colors[k]} onChange={(e) => up(`colors.${k}`, e.target.value)} style={{ height: 40, padding: 2 }} /></Field>
                ))}
              </div>
            </div>
          </details>

          <details className="section" open>
            <summary>Frente</summary>
            <div className="stack">
              <Field label="Faixa: linha de data"><Text value={f.panelDate} onChange={(v) => up('front.panelDate', v)} /></Field>
              <Field label="Faixa: título"><Text value={f.panelLabel} onChange={(v) => up('front.panelLabel', v)} /></Field>
              <Field label="Ícone do canto"><Select value={f.cornerIcon} onChange={(v) => up('front.cornerIcon', v)} options={Object.entries(CORNER_ICONS).map(([k, x]) => [k, x.label])} /></Field>
              <Field label="Ou imagem no canto" hint="Substitui o ícone."><ImageInput value={f.cornerImage} onChange={(v) => up('front.cornerImage', v)} /></Field>
              <Field label="Título"><Text value={f.title} onChange={(v) => up('front.title', v)} /></Field>
              <Field label="Selos">
                {f.badges.map((bd, i) => (
                  <div className="row" key={i}>
                    <input value={bd.text} onChange={(e) => up('front.badges', f.badges.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))} style={{ flex: 1 }} />
                    <Select value={bd.bg} onChange={(v) => up('front.badges', f.badges.map((x, j) => (j === i ? { ...x, bg: v } : x)))} options={COLORS} />
                    <button type="button" className="btn secondary" onClick={() => up('front.badges', f.badges.filter((_, j) => j !== i))}>×</button>
                  </div>
                ))}
                <button type="button" className="btn secondary" onClick={() => up('front.badges', [...f.badges, { text: '', bg: 'teal' }])}>+ Selo</button>
              </Field>
              <label className="muted"><input type="checkbox" checked={f.showTierBadge} onChange={(e) => up('front.showTierBadge', e.target.checked)} style={{ width: 'auto' }} /> Selo de cota (patrocínio)</label>
              <label className="muted"><input type="checkbox" checked={f.sponsorLogo} onChange={(e) => up('front.sponsorLogo', e.target.checked)} style={{ width: 'auto' }} /> Quadro com a logo da empresa (coluna "logo" da lista)</label>
              <Field label="Abertura"><Text value={f.lead} onChange={(v) => up('front.lead', v)} /></Field>
              <label className="muted"><input type="checkbox" checked={f.showCpf} onChange={(e) => up('front.showCpf', e.target.checked)} style={{ width: 'auto' }} /> Mostrar CPF (sai mascarado)</label>
              <label className="muted"><input type="checkbox" checked={f.showCnpj} onChange={(e) => up('front.showCnpj', e.target.checked)} style={{ width: 'auto' }} /> Mostrar CNPJ</label>
              <Field label="Linha da equipe" hint="Vazio para não mostrar. Ex.: integrante da startup {team}"><Text value={f.teamText} onChange={(v) => up('front.teamText', v)} /></Field>
              <Field label="Texto principal" hint="Use **negrito** e as variáveis abaixo."><Area value={f.body} onChange={(v) => up('front.body', v)} rows={6} /></Field>
              <label className="muted"><input type="checkbox" checked={f.facts} onChange={(e) => up('front.facts', e.target.checked)} style={{ width: 'auto' }} /> Linha com carga horária, data e local</label>
              <label className="muted"><input type="checkbox" checked={f.showNote} onChange={(e) => up('front.showNote', e.target.checked)} style={{ width: 'auto' }} /> Mostrar a observação individual (coluna "observação")</label>
              <Field label="Mensagem de agradecimento" hint="Vazio para não mostrar."><Area value={f.thanks.text} onChange={(v) => up('front.thanks.text', v)} rows={3} /></Field>
              <Field label="Assinatura do agradecimento"><Text value={f.thanks.signer} onChange={(v) => up('front.thanks.signer', v)} /></Field>
              <Field label="Rodapé"><Text value={f.footer} onChange={(v) => up('front.footer', v)} /></Field>
            </div>
          </details>

          {t.pages === 2 && (
            <details className="section" open>
              <summary>Verso</summary>
              <div className="stack">
                <Field label="Faixa: linha de destaque"><Text value={b.panelDate} onChange={(v) => up('back.panelDate', v)} /></Field>
                <Field label="Faixa: título"><Text value={b.panelLabel} onChange={(v) => up('back.panelLabel', v)} /></Field>
                <Field label="Faixa: linha extra"><Text value={b.panelExtra} onChange={(v) => up('back.panelExtra', v)} /></Field>
                <Field label="Imagem de fundo (marca d'água central)"><ImageInput value={t.backImage} onChange={(v) => up('backImage', v)} /></Field>
                <Field label="Título"><Text value={b.title} onChange={(v) => up('back.title', v)} /></Field>
                <Field label="Introdução"><Area value={b.intro} onChange={(v) => up('back.intro', v)} rows={2} /></Field>
                <Field label="Programação (colunas)">
                  {b.days.map((d, i) => (
                    <div className="card" key={i} style={{ padding: 10 }}>
                      <div className="row">
                        <input value={d.label} placeholder="Ex.: Sexta · 06/11" onChange={(e) => up('back.days', b.days.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} style={{ flex: 1 }} />
                        <Select value={d.color} onChange={(v) => up('back.days', b.days.map((x, j) => (j === i ? { ...x, color: v } : x)))} options={COLORS} />
                        <button type="button" className="btn secondary" onClick={() => up('back.days', b.days.filter((_, j) => j !== i))}>×</button>
                      </div>
                      <input value={d.title} placeholder="Título do dia" onChange={(e) => up('back.days', b.days.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} style={{ marginTop: 6 }} />
                      <div style={{ marginTop: 6 }}><ListEditor items={d.items} onChange={(v) => up('back.days', b.days.map((x, j) => (j === i ? { ...x, items: v } : x)))} /></div>
                    </div>
                  ))}
                  {b.days.length < 4 && <button type="button" className="btn secondary" onClick={() => up('back.days', [...b.days, { label: '', color: 'teal', title: '', items: [] }])}>+ Coluna</button>}
                </Field>
                <Field label="Título da lista de entregas"><Text value={b.deliverTitle} onChange={(v) => up('back.deliverTitle', v)} /></Field>
                <Field label="Entregas / atuação"><ListEditor items={b.deliverItems} onChange={(v) => up('back.deliverItems', v)} /></Field>
                <Field label="Título das competências"><Text value={b.skillsTitle} onChange={(v) => up('back.skillsTitle', v)} /></Field>
                <Field label="Competências"><ListEditor items={b.skills} onChange={(v) => up('back.skills', v)} /></Field>
                <Field label="Rodapé" hint="Use Enter para quebrar linha."><Area value={b.footer} onChange={(v) => up('back.footer', v)} rows={2} /></Field>
              </div>
            </details>
          )}

          <details className="section">
            <summary>Pessoa de exemplo (só para a prévia)</summary>
            <div className="stack">
              {['name', 'team', 'cpf', 'cnpj', 'tier', 'note'].map((k) => <Field key={k} label={k}><Text value={sample[k]} onChange={(v) => setSample({ ...sample, [k]: v })} /></Field>)}
            </div>
          </details>
          <p className="muted">Variáveis: {TEXT_VARS.map(([k, d]) => <span key={k} title={d}><code>{`{${k}}`}</code> </span>)}</p>
        </div>
        <div className="preview">
          <Preview template={t} event={ev} type={type} person={sample} width={720} />
        </div>
      </div>
    </>
  );
}
