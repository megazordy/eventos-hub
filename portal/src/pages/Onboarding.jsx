import React, { useState } from 'react';
import { Field, Text } from '../components/ui.jsx';

// Cadastro da organização. Só depois da aprovação do admin a organização cria eventos e emite certificados.
export default function Onboarding({ store, org, setOrg }) {
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (org && org.status !== 'approved') {
    return (
      <div className="card">
        <h1>Cadastro em análise</h1>
        <p>A organização <b>{org.name}</b> foi cadastrada e aguarda aprovação. Assim que for aprovada, você poderá criar eventos e emitir certificados.</p>
        <p className="muted">A aprovação existe para evitar certificados falsos em nome de eventos e comunidades.</p>
      </div>
    );
  }

  const submit = async (e) => {
    e.preventDefault();
    if (name.trim().length < 3) return setError('Informe o nome da organização.');
    setBusy(true); setError('');
    try { setOrg(await store.createOrg({ name: name.trim(), contact: contact.trim() })); } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  return (
    <form className="card" onSubmit={submit} style={{ maxWidth: 640 }}>
      <h1>Cadastre sua organização</h1>
      <p className="muted">Organização é quem realiza o evento (comunidade, empresa, universidade). Um evento pertence a uma organização.</p>
      <div className="stack">
        <Field label="Nome da organização"><Text value={name} onChange={setName} required /></Field>
        <Field label="Contato público" hint="Aparece na verificação dos certificados (e-mail ou rede social)."><Text value={contact} onChange={setContact} /></Field>
        <div><button className="btn" disabled={busy}>Enviar para aprovação</button></div>
        {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}
      </div>
    </form>
  );
}
