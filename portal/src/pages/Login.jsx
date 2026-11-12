import React, { useState } from 'react';

export default function Login({ store }) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const signIn = async () => {
    setBusy(true); setError('');
    try { await store.signIn(); } catch (e) { setError(e.message); } finally { setBusy(false); }
  };
  return (
    <main className="wrap" style={{ maxWidth: 560 }}>
      <div className="card" style={{ marginTop: 60 }}>
        <h1>eventos-hub</h1>
        <p>Portal aberto para emitir e verificar certificados de eventos, com código único e QR code.</p>
        <p className="muted">O login usa sua conta Google. As listas de pessoas e os PDFs ficam no <b>seu</b> Google Drive; o portal guarda apenas os dados do evento, os modelos e registros cifrados para a verificação.</p>
        <div className="row" style={{ marginTop: 16 }}>
          <button type="button" className="btn" disabled={busy} onClick={signIn}>Entrar com Google</button>
          <a className="btn secondary" href="#/v">Verificar um certificado</a>
        </div>
        {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}
      </div>
    </main>
  );
}
