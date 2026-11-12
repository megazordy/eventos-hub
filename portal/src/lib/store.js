// Acesso a dados do portal com duas implementações de mesma interface:
// - Firebase (Auth Google + Firestore) quando configurado;
// - demonstração (localStorage) quando não há configuração.
// Firestore guarda só organização, evento, modelo, dados públicos do evento e registros cifrados.
// Listas, CPF e e-mails nunca vão para o Firestore: ficam no Drive do organizador.
import { firebaseConfig, isDemo } from './config.js';

const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
const TOKEN_KEY = 'eh.driveToken';

// ---------------------------------------------------------------- demonstração (localStorage)
function demoStore() {
  const key = (k) => `eh.demo.${k}`;
  const get = (k, d) => { try { return JSON.parse(localStorage.getItem(key(k))) ?? d; } catch { return d; } };
  const set = (k, v) => { try { localStorage.setItem(key(k), JSON.stringify(v)); } catch (e) { throw new Error(`Não foi possível salvar no navegador: ${e.message}`); } };
  const user = { uid: 'demo', displayName: 'Modo demonstração', email: 'demo@local' };
  const uid = () => crypto.randomUUID().replace(/-/g, '').slice(0, 20);
  return {
    demo: true,
    onAuth(cb) { cb(get('signedIn', true) ? user : null); return () => {}; },
    async signIn() { set('signedIn', true); return user; },
    async signOut() { set('signedIn', false); location.reload(); },
    async driveToken() { return null; },
    async isAdmin() { return true; },
    async myOrg() { const org = get('org', null); return org; },
    async createOrg(data) { const org = { id: uid(), ...data, ownerUid: 'demo', status: 'approved', createdAt: Date.now() }; set('org', org); return org; },
    async pendingOrgs() { return []; },
    async approveOrg() {},
    async listEvents() { return Object.values(get('events', {})).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)); },
    async getEvent(id) { return get('events', {})[id] || null; },
    async saveEvent(ev) { const all = get('events', {}); const id = ev.id || uid(); all[id] = { ...ev, id, updatedAt: Date.now() }; set('events', all); return all[id]; },
    async deleteEvent(id) { const all = get('events', {}); delete all[id]; set('events', all); },
    async publishPublicEvent(pub) { const all = get('publicEvents', {}); all[pub.id] = pub; set('publicEvents', all); },
    async findPublicEvent(prefix) { return Object.values(get('publicEvents', {})).find((e) => e.prefix.toLowerCase() === prefix.toLowerCase()) || null; },
    async prefixTaken(prefix, eventId) { return Object.values(get('publicEvents', {})).some((e) => e.prefix.toLowerCase() === prefix.toLowerCase() && e.id !== eventId); },
    async putRecord(id, rec) { const all = get('records', {}); all[id] = rec; set('records', all); },
    async getRecord(id) { return get('records', {})[id] || null; },
    async loadLedger(eventId) { return get(`ledger.${eventId}`, { entries: {} }); },
    async saveLedger(eventId, ledger) { set(`ledger.${eventId}`, ledger); },
  };
}

// ---------------------------------------------------------------- Firebase
async function firebaseStore() {
  const [{ initializeApp }, auth, fs] = await Promise.all([import('firebase/app'), import('firebase/auth'), import('firebase/firestore')]);
  const app = initializeApp(firebaseConfig);
  const a = auth.getAuth(app);
  const db = fs.getFirestore(app);
  const provider = new auth.GoogleAuthProvider();
  provider.addScope(DRIVE_SCOPE);
  const d = (path, ...rest) => fs.doc(db, path, ...rest);
  const snap = async (ref) => { const s = await fs.getDoc(ref); return s.exists() ? { id: s.id, ...s.data() } : null; };

  async function signIn() {
    const res = await auth.signInWithPopup(a, provider);
    const cred = auth.GoogleAuthProvider.credentialFromResult(res);
    // Token do Drive vale ~1h; fica só nesta aba (sessionStorage), nunca no Firestore.
    sessionStorage.setItem(TOKEN_KEY, JSON.stringify({ token: cred.accessToken, exp: Date.now() + 55 * 60 * 1000 }));
    return res.user;
  }

  const myProfile = async () => (a.currentUser ? snap(d('users', a.currentUser.uid)) : null);

  return {
    demo: false,
    onAuth: (cb) => auth.onAuthStateChanged(a, cb),
    signIn,
    async signOut() { sessionStorage.removeItem(TOKEN_KEY); await auth.signOut(a); },
    async driveToken() {
      try { const t = JSON.parse(sessionStorage.getItem(TOKEN_KEY)); if (t && t.exp > Date.now()) return t.token; } catch { /* sem token */ }
      await signIn();
      return JSON.parse(sessionStorage.getItem(TOKEN_KEY)).token;
    },
    async isAdmin() { return !!(a.currentUser && (await snap(d('admins', a.currentUser.uid)))); },
    async myOrg() { const p = await myProfile(); return p?.orgId ? snap(d('orgs', p.orgId)) : null; },
    async createOrg(data) {
      const ref = fs.doc(fs.collection(db, 'orgs'));
      const org = { name: data.name, contact: data.contact, ownerUid: a.currentUser.uid, status: 'pending', createdAt: fs.serverTimestamp() };
      const batch = fs.writeBatch(db);
      batch.set(ref, org);
      batch.set(d('users', a.currentUser.uid), { orgId: ref.id });
      await batch.commit();
      return { id: ref.id, ...org, status: 'pending' };
    },
    async pendingOrgs() {
      const s = await fs.getDocs(fs.query(fs.collection(db, 'orgs'), fs.where('status', '==', 'pending')));
      return s.docs.map((x) => ({ id: x.id, ...x.data() }));
    },
    async approveOrg(id) { await fs.updateDoc(d('orgs', id), { status: 'approved', approvedAt: fs.serverTimestamp() }); },
    async listEvents(orgId) {
      const s = await fs.getDocs(fs.query(fs.collection(db, 'events'), fs.where('orgId', '==', orgId)));
      return s.docs.map((x) => ({ id: x.id, ...x.data() })).sort((x, y) => (y.updatedAt || 0) - (x.updatedAt || 0));
    },
    getEvent: (id) => snap(d('events', id)),
    async saveEvent(ev) {
      const ref = ev.id ? d('events', ev.id) : fs.doc(fs.collection(db, 'events'));
      const data = { ...ev, updatedAt: Date.now() };
      delete data.id;
      await fs.setDoc(ref, data);
      return { ...data, id: ref.id };
    },
    deleteEvent: (id) => fs.deleteDoc(d('events', id)),
    publishPublicEvent: (pub) => { const { id, ...data } = pub; return fs.setDoc(d('publicEvents', id), data); },
    async findPublicEvent(prefix) {
      const s = await fs.getDocs(fs.query(fs.collection(db, 'publicEvents'), fs.where('prefix', '==', prefix.toUpperCase()), fs.limit(1)));
      return s.docs[0] ? { id: s.docs[0].id, ...s.docs[0].data() } : null;
    },
    async prefixTaken(prefix, eventId) {
      const s = await fs.getDocs(fs.query(fs.collection(db, 'publicEvents'), fs.where('prefix', '==', prefix.toUpperCase()), fs.limit(2)));
      return s.docs.some((x) => x.id !== eventId);
    },
    putRecord: (id, rec) => fs.setDoc(d('records', id), rec),
    getRecord: (id) => snap(d('records', id)),
    // Controle de códigos (tem nome e e-mail): fica no Drive do organizador, não no Firestore.
    loadLedger: null,
    saveLedger: null,
  };
}

let instance;
export async function getStore() {
  if (!instance) instance = isDemo ? demoStore() : await firebaseStore();
  return instance;
}
