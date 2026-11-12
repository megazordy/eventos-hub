// Google Drive do organizador (escopo drive.file: o portal só enxerga o que ele mesmo criou).
// IO: chamadas HTTPS à Drive API com o token OAuth do usuário.
const API = 'https://www.googleapis.com/drive/v3';
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3';
const FOLDER = 'application/vnd.google-apps.folder';

async function call(token, url, opts = {}) {
  const res = await fetch(url, { ...opts, headers: { Authorization: `Bearer ${token}`, ...(opts.headers || {}) } });
  if (res.status === 401) throw Object.assign(new Error('Sessão do Google expirou. Entre novamente.'), { code: 'reauth' });
  if (!res.ok) throw new Error(`Google Drive: HTTP ${res.status} ${await res.text()}`);
  return res.status === 204 ? null : res.json();
}

const q = (s) => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

async function findChild(token, parentId, name, mime) {
  const where = [`name = '${q(name)}'`, `'${parentId}' in parents`, 'trashed = false', mime ? `mimeType = '${mime}'` : ''].filter(Boolean).join(' and ');
  const r = await call(token, `${API}/files?q=${encodeURIComponent(where)}&fields=files(id,name)&spaces=drive`);
  return r.files[0] || null;
}

export async function ensureFolderPath(token, names) {
  let parent = 'root';
  for (const name of names) {
    const found = await findChild(token, parent, name, FOLDER);
    parent = found ? found.id : (await call(token, `${API}/files?fields=id`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, mimeType: FOLDER, parents: [parent] }),
    })).id;
  }
  return parent;
}

// Cria ou substitui (mantendo o mesmo id e link) um arquivo dentro da pasta.
export async function putFile(token, folderId, name, blob, mime) {
  const existing = await findChild(token, folderId, name);
  if (existing) {
    await call(token, `${UPLOAD}/files/${existing.id}?uploadType=media`, { method: 'PATCH', headers: { 'Content-Type': mime }, body: blob });
    return existing.id;
  }
  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify({ name, parents: [folderId], mimeType: mime })], { type: 'application/json' }));
  form.append('file', blob);
  return (await call(token, `${UPLOAD}/files?uploadType=multipart&fields=id`, { method: 'POST', body: form })).id;
}

export const shareWithLink = (token, fileId) => call(token, `${API}/files/${fileId}/permissions`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role: 'reader', type: 'anyone' }),
});

export async function readJsonFile(token, folderId, name) {
  const f = await findChild(token, folderId, name);
  if (!f) return null;
  const res = await fetch(`${API}/files/${f.id}?alt=media`, { headers: { Authorization: `Bearer ${token}` } });
  return res.ok ? res.json() : null;
}

export const fileLink = (id) => `https://drive.google.com/file/d/${id}/view`;
