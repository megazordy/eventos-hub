import React, { useState } from 'react';
import { useAsync } from '../components/ui.jsx';

// Aprovação de organizações (somente admins, garantido também pelas regras do Firestore).
export default function Admin({ store }) {
  const [tick, setTick] = useState(0);
  const { loading, data, error } = useAsync(() => store.pendingOrgs(), [tick]);
  const approve = async (id) => { await store.approveOrg(id); setTick((t) => t + 1); };
  return (
    <>
      <h1>Organizações aguardando aprovação</h1>
      {loading && <p className="muted">Carregando…</p>}
      {error && <p style={{ color: 'var(--danger)' }}>{error.message}</p>}
      {data && !data.length && <div className="card">Nenhuma organização pendente.</div>}
      {data?.map((o) => (
        <div className="card row" key={o.id} style={{ justifyContent: 'space-between' }}>
          <div><b>{o.name}</b><div className="muted">{o.contact}</div></div>
          <button type="button" className="btn" onClick={() => approve(o.id)}>Aprovar</button>
        </div>
      ))}
    </>
  );
}
