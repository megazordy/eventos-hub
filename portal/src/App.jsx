import React, { useEffect, useState } from 'react';
import { getStore } from './lib/store.js';
import Verify from './pages/Verify.jsx';
import Login from './pages/Login.jsx';
import Onboarding from './pages/Onboarding.jsx';
import Admin from './pages/Admin.jsx';
import Events from './pages/Events.jsx';
import EventForm from './pages/EventForm.jsx';
import TemplateEditor from './pages/TemplateEditor.jsx';
import Batch from './pages/Batch.jsx';
import { Privacy, Terms } from './pages/Legal.jsx';

// Rotas por hash (funciona em qualquer hospedagem estática, inclusive Firebase Hosting e GitHub Pages).
function useRoute() {
  const [hash, setHash] = useState(location.hash.slice(1) || '/');
  useEffect(() => {
    const on = () => setHash(location.hash.slice(1) || '/');
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return hash.split('/').filter(Boolean);
}



export default function App() {
  const route = useRoute();
  const [store, setStore] = useState(null);
  const [user, setUser] = useState(undefined);
  const [org, setOrg] = useState(undefined);
  const [admin, setAdmin] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { getStore().then(setStore).catch((e) => setError(e.message)); }, []);
  useEffect(() => {
    if (!store) return undefined;
    return store.onAuth(async (u) => {
      setUser(u || null);
      if (u) {
        try { setOrg(await store.myOrg()); setAdmin(await store.isAdmin()); } catch (e) { setError(e.message); setOrg(null); }
      } else setOrg(undefined);
    });
  }, [store]);

  // Verificação pública: não exige login.
  if (route[0] === 'v') return <Verify store={store} code={decodeURIComponent(route[1] || '')} />;
  if (route[0] === 'privacidade') return <Privacy />;
  if (route[0] === 'termos') return <Terms />;

  if (error) return <div className="wrap"><div className="card">Erro: {error}</div></div>;
  if (!store || user === undefined) return <div className="wrap muted">Carregando…</div>;
  if (!user) return <Login store={store} />;

  const ctx = { store, user, org, setOrg, admin };
  let page;
  if (route[0] === 'admin' && admin) page = <Admin {...ctx} />;
  else if (!org || org.status !== 'approved') page = <Onboarding {...ctx} />;
  else if (route[0] === 'events' && route[1] === 'new') page = <EventForm {...ctx} eventId={null} />;
  else if (route[0] === 'events' && route[2] === 'types' && route[3]) page = <TemplateEditor {...ctx} eventId={route[1]} typeKey={route[3]} />;
  else if (route[0] === 'events' && route[2] === 'batch') page = <Batch {...ctx} eventId={route[1]} />;
  else if (route[0] === 'events' && route[1]) page = <EventForm {...ctx} eventId={route[1]} />;
  else page = <Events {...ctx} />;

  return (
    <>
      <header className="top">
        <div className="brand">eventos<span>-hub</span></div>
        <nav>
          <a href="#/">Eventos</a>
          {admin && <a href="#/admin">Aprovações</a>}
          <a href="#/v">Verificar certificado</a>
        </nav>
        <span className="user">{user.displayName || user.email}</span>
        <button type="button" className="btn secondary" onClick={() => store.signOut()}>Sair</button>
      </header>
      {store.demo && <div className="demo-banner"><b>Modo demonstração:</b> o Firebase ainda não está configurado. Os dados ficam só neste navegador e os PDFs são baixados em ZIP.</div>}
      <main className="wrap">{page}</main>
      <footer className="wrap muted" style={{ paddingTop: 0 }}><a href="#/privacidade">Privacidade</a> · <a href="#/termos">Termos de uso</a> · <a href="https://github.com/megazordy/eventos-hub">Código aberto</a></footer>
    </>
  );
}
