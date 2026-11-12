import React, { useEffect, useMemo, useRef, useState } from 'react';
import { renderPages, PAGE } from '../lib/template.js';

export function Field({ label, hint, children }) {
  return <label className="f">{label}{hint && <small>{hint}</small>}{children}</label>;
}

export function Text({ value, onChange, ...rest }) {
  return <input value={value ?? ''} onChange={(e) => onChange(e.target.value)} {...rest} />;
}

export function Area({ value, onChange, ...rest }) {
  return <textarea value={value ?? ''} onChange={(e) => onChange(e.target.value)} {...rest} />;
}

export function Select({ value, onChange, options }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  );
}

// Lista de textos editável (itens de agenda, competências, entregas...).
export function ListEditor({ items, onChange, placeholder }) {
  const set = (i, v) => onChange(items.map((x, j) => (j === i ? v : x)));
  return (
    <div className="list-editor">
      {items.map((it, i) => (
        <div className="item" key={i}>
          <input value={it} placeholder={placeholder} onChange={(e) => set(i, e.target.value)} />
          <button type="button" className="btn secondary" aria-label="Remover item" onClick={() => onChange(items.filter((_, j) => j !== i))}>×</button>
        </div>
      ))}
      <button type="button" className="btn secondary" onClick={() => onChange([...items, ''])}>+ Adicionar</button>
    </div>
  );
}

// Lê uma imagem e devolve data URL reduzida (assinaturas, logos), para caber no documento do evento.
export function fileToDataUrl(file, maxWidth = 700) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Não foi possível ler a imagem.'));
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.naturalWidth);
        const c = document.createElement('canvas');
        c.width = Math.round(img.naturalWidth * scale);
        c.height = Math.round(img.naturalHeight * scale);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL('image/png'));
      };
      img.onerror = () => reject(new Error('Arquivo de imagem inválido.'));
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

export function ImageInput({ value, onChange, label }) {
  const ref = useRef();
  return (
    <div className="row">
      {value ? <img src={value} alt="" className="thumb" /> : <span className="muted">Sem imagem</span>}
      <button type="button" className="btn secondary" onClick={() => ref.current.click()}>{label || 'Escolher imagem'}</button>
      {value && <button type="button" className="btn secondary" onClick={() => onChange('')}>Remover</button>}
      <input ref={ref} type="file" accept="image/*" hidden onChange={async (e) => { const f = e.target.files[0]; if (f) onChange(await fileToDataUrl(f)); e.target.value = ''; }} />
    </div>
  );
}

// Prévia fiel do certificado (mesmo HTML usado para gerar o PDF), em escala.
export function Preview({ template, event, type, person, width = 640 }) {
  const scale = width / PAGE.w;
  const pages = useMemo(() => {
    try { return renderPages(template, { event, type, person, code: `${event.prefix || 'XXXX'}-EXEM-PL0X-0000`, qrSvg: QR_PLACEHOLDER, signatures: event.signatures || [], tierIcon: (type.tiers || [])[0]?.icon || 'none' }); }
    catch (e) { return [`<div style="padding:20px;color:#B42318">Erro na prévia: ${e.message}</div>`]; }
  }, [template, event, type, person]);
  return (
    <div>
      {pages.map((html, i) => (
        <div key={i} className="sheet" style={{ width, height: PAGE.h * scale }}>
          <div style={{ transform: `scale(${scale})`, transformOrigin: '0 0', width: PAGE.w, height: PAGE.h }} dangerouslySetInnerHTML={{ __html: html }} />
        </div>
      ))}
    </div>
  );
}

const QR_PLACEHOLDER = '<svg viewBox="0 0 10 10" width="72" height="72"><rect width="10" height="10" fill="#fff" stroke="#1F3862" stroke-dasharray="0.6 0.4" stroke-width="0.3"/><text x="5" y="5.8" font-size="2" text-anchor="middle" fill="#1F3862" font-family="Inter">QR</text></svg>';

export function useAsync(fn, deps) {
  const [state, setState] = useState({ loading: true, data: null, error: null });
  useEffect(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: true }));
    fn().then((data) => alive && setState({ loading: false, data, error: null }))
      .catch((error) => alive && setState({ loading: false, data: null, error }));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return state;
}
