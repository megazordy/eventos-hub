import React, { useEffect, useState } from 'react';
import { normalizeCode, recordId, decryptRecord } from '../lib/crypto.js';

// Verificação pública: cada pessoa vê só o certificado do código informado.
// O registro é buscado pelo id derivado do código e decifrado no navegador.
export default function Verify({ store, code }) {
  const [input, setInput] = useState(code || '');
  const [state, setState] = useState({ status: 'idle' });

  useEffect(() => {
    if (!code || !store) return;
    let alive = true;
    (async () => {
      setState({ status: 'loading' });
      const c = normalizeCode(code);
      try {
        const pub = await store.findPublicEvent(c.split('-')[0]);
        if (!pub) return alive && setState({ status: 'notfound' });
        const rec = await store.getRecord(await recordId(c, pub));
        if (!rec) return alive && setState({ status: 'notfound' });
        const data = await decryptRecord(c, rec, pub);
        if (alive) setState({ status: 'ok', data, pub, code: c.toUpperCase() });
      } catch {
        if (alive) setState({ status: 'error' });
      }
    })();
    return () => { alive = false; };
  }, [code, store]);

  const submit = (e) => { e.preventDefault(); location.hash = `/v/${normalizeCode(input).toUpperCase()}`; };
  const { data, pub } = state;

  return (
    <main className="wrap" style={{ maxWidth: 680 }}>
      <h1 style={{ marginTop: 24 }}>Verificação de certificado</h1>
      <form className="card stack" onSubmit={submit}>
        <label className="f" htmlFor="code">Código de validação</label>
        <div className="row">
          <input id="code" value={input} onChange={(e) => setInput(e.target.value)} placeholder="PREFIXO-XXXX-XXXX-XXXX" autoComplete="off" spellCheck="false" style={{ flex: '1 1 240px', textTransform: 'uppercase' }} />
          <button className="btn">Verificar</button>
        </div>
        <p className="muted">O código está no rodapé do certificado. Ao ler o QR code, a verificação é feita automaticamente.</p>
      </form>
      {state.status === 'loading' && <div className="card">Verificando…</div>}
      {state.status === 'notfound' && <div className="card"><b>Código não encontrado.</b><p className="muted">Confira se o código foi digitado corretamente.</p></div>}
      {state.status === 'error' && <div className="card"><b>Não foi possível verificar agora.</b><p className="muted">Tente novamente em instantes.</p></div>}
      {state.status === 'ok' && (
        <div className="card" style={{ borderColor: 'var(--teal)', background: '#EAF8F5' }}>
          <b style={{ color: 'var(--navy)', fontSize: 18 }}>✔ Certificado válido</b>
          <div style={{ fontSize: 26, fontWeight: 900, color: 'var(--navy)', margin: '12px 0 8px' }}>{data.name}</div>
          <table>
            <tbody>
              <tr><th>Certificado</th><td>{data.type}</td></tr>
              {data.team && <tr><th>Equipe</th><td>{data.team}</td></tr>}
              <tr><th>Evento</th><td>{pub.name}{pub.edition ? ` (${pub.edition})` : ''}</td></tr>
              <tr><th>Data</th><td>{data.dates || pub.dates}</td></tr>
              <tr><th>Local</th><td>{pub.city}</td></tr>
              {(data.hours || pub.hours) && <tr><th>Carga horária</th><td>{data.hours || pub.hours} horas</td></tr>}
              <tr><th>Código</th><td>{state.code}</td></tr>
            </tbody>
          </table>
          {/^https:\/\/drive\.google\.com\//.test(data.pdfUrl || '')
            ? <a className="btn" style={{ marginTop: 14 }} href={data.pdfUrl} target="_blank" rel="noopener noreferrer">Abrir certificado (PDF)</a>
            : <p className="muted">O PDF deste certificado ainda não foi publicado.</p>}
        </div>
      )}
      <section className="muted" style={{ marginTop: 16 }}>
        <b>Privacidade.</b> Esta página só mostra um certificado a quem informa o código dele. Os registros ficam cifrados e o código completo não sai do seu navegador: a verificação e a decifragem acontecem aqui. Os dados são usados apenas para comprovar certificados (LGPD, Lei 13.709/2018). {pub?.contact && <>Para corrigir dados ou pedir remoção: {pub.contact}.</>}
      </section>
    </main>
  );
}
