import React from 'react';
import { useAsync } from '../components/ui.jsx';

export default function Events({ store, org }) {
  const { loading, data, error } = useAsync(() => store.listEvents(org.id), [org.id]);
  return (
    <>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h1>Eventos · {org.name}</h1>
        <a className="btn" href="#/events/new">+ Novo evento</a>
      </div>
      {loading && <p className="muted">Carregando…</p>}
      {error && <p style={{ color: 'var(--danger)' }}>{error.message}</p>}
      {data && !data.length && <div className="card">Nenhum evento ainda. Crie o primeiro, do zero ou a partir do modelo do Startup Weekend.</div>}
      <div className="grid">
        {data?.map((ev) => (
          <div className="card" key={ev.id}>
            <b>{ev.name}</b>
            <div className="muted">{ev.edition} · {ev.dates} · {ev.city}</div>
            <div className="muted">{Object.keys(ev.types || {}).length} tipo(s) de certificado · prefixo {ev.prefix}</div>
            <div className="row" style={{ marginTop: 12 }}>
              <a className="btn secondary" href={`#/events/${ev.id}`}>Editar</a>
              <a className="btn" href={`#/events/${ev.id}/batch`}>Gerar certificados</a>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
