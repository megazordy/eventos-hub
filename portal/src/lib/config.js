// Configuração do Firebase vinda do ambiente de build (Vite). Sem ela, o portal roda em modo demonstração.
const env = import.meta.env || {};
export const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
};
export const isDemo = !firebaseConfig.apiKey || !firebaseConfig.projectId;

// Endereço público usado no QR code. Padrão: a própria origem do portal.
export const publicUrl = () => {
  const fromEnv = env.VITE_PUBLIC_URL;
  if (fromEnv) return fromEnv.endsWith('/') ? fromEnv : `${fromEnv}/`;
  return `${location.origin}${location.pathname.replace(/[^/]*$/, '')}`;
};
export const verifyLink = (code) => `${publicUrl()}#/v/${code}`;
export const PBKDF2_ITERATIONS = 600000;
