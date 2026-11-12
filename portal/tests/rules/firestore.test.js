// Testes das regras do Firestore no emulador local (sem projeto real).
// Rodar: bun run test:rules  (sobe o emulador, roda os testes e desliga)
import { describe, test, beforeAll, afterAll, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, getDocs, collection, query, where, writeBatch, serverTimestamp } from 'firebase/firestore';

let env;
const ORG_A = 'orgA';
const ORG_B = 'orgB';

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-eventos-hub',
    firestore: { rules: readFileSync(new URL('../../firestore.rules', import.meta.url), 'utf8'), host: '127.0.0.1', port: 8095 },
  });
});
afterAll(() => env?.cleanup());

// Estado base: admin, org A aprovada (alice), org B aprovada (bob), org pendente (carol), evento da org A.
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'admins/admin'), {});
    await setDoc(doc(db, `orgs/${ORG_A}`), { name: 'Org A', contact: '', ownerUid: 'alice', status: 'approved' });
    await setDoc(doc(db, 'users/alice'), { orgId: ORG_A });
    await setDoc(doc(db, `orgs/${ORG_B}`), { name: 'Org B', contact: '', ownerUid: 'bob', status: 'approved' });
    await setDoc(doc(db, 'users/bob'), { orgId: ORG_B });
    await setDoc(doc(db, 'orgs/orgC'), { name: 'Org C', contact: '', ownerUid: 'carol', status: 'pending' });
    await setDoc(doc(db, 'users/carol'), { orgId: 'orgC' });
    await setDoc(doc(db, 'events/evA'), { orgId: ORG_A, name: 'Evento A', salt: 's1', iterations: 600000 });
    await setDoc(doc(db, 'publicEvents/evA'), { orgId: ORG_A, prefix: 'EVA26', name: 'Evento A', salt: 's1', iterations: 600000 });
    await setDoc(doc(db, 'records/rec1'), { eventId: 'evA', iv: 'x', ct: 'y' });
  });
});

const as = (uid) => env.authenticatedContext(uid).firestore();
const anon = () => env.unauthenticatedContext().firestore();

describe('verificação pública', () => {
  test('qualquer pessoa lê dados públicos do evento e um registro pelo id', async () => {
    await assertSucceeds(getDoc(doc(anon(), 'publicEvents/evA')));
    await assertSucceeds(getDoc(doc(anon(), 'records/rec1')));
  });
  test('ninguém lista os registros (não dá para baixar a base)', async () => {
    await assertFails(getDocs(collection(anon(), 'records')));
    await assertFails(getDocs(collection(as('alice'), 'records')));
  });
});

describe('organizações', () => {
  test('usuário novo cadastra organização pendente junto com o perfil', async () => {
    const db = as('dave');
    const b = writeBatch(db);
    b.set(doc(db, 'orgs/orgD'), { name: 'Org D', contact: 'd@ex.com', ownerUid: 'dave', status: 'pending', createdAt: serverTimestamp(), termsAcceptedAt: serverTimestamp() });
    b.set(doc(db, 'users/dave'), { orgId: 'orgD' });
    await assertSucceeds(b.commit());
  });
  test('cadastro sem aceite dos termos é recusado', async () => {
    const db = as('frank');
    const b = writeBatch(db);
    b.set(doc(db, 'orgs/orgF'), { name: 'Org F', contact: '', ownerUid: 'frank', status: 'pending', createdAt: serverTimestamp() });
    b.set(doc(db, 'users/frank'), { orgId: 'orgF' });
    await assertFails(b.commit());
  });
  test('não dá para se cadastrar já aprovado', async () => {
    await assertFails(setDoc(doc(as('erin'), 'orgs/orgE'), { name: 'Org E', contact: '', ownerUid: 'erin', status: 'approved', createdAt: new Date() }));
  });
  test('não dá para se ligar à organização de outra pessoa', async () => {
    await assertFails(setDoc(doc(as('mallory'), 'users/mallory'), { orgId: ORG_A }));
  });
  test('só admin aprova e lista pendentes', async () => {
    await assertFails(updateDoc(doc(as('carol'), 'orgs/orgC'), { status: 'approved' }));
    await assertFails(getDocs(query(collection(as('alice'), 'orgs'), where('status', '==', 'pending'))));
    await assertSucceeds(getDocs(query(collection(as('admin'), 'orgs'), where('status', '==', 'pending'))));
    await assertSucceeds(updateDoc(doc(as('admin'), 'orgs/orgC'), { status: 'approved', approvedAt: new Date() }));
  });
  test('admin não pode trocar o dono da organização', async () => {
    await assertFails(updateDoc(doc(as('admin'), `orgs/${ORG_A}`), { ownerUid: 'admin' }));
  });
});

describe('eventos', () => {
  test('membro de organização aprovada cria e lê evento', async () => {
    await assertSucceeds(setDoc(doc(as('alice'), 'events/evA2'), { orgId: ORG_A, name: 'Outro', salt: 's2', iterations: 600000 }));
    await assertSucceeds(getDoc(doc(as('alice'), 'events/evA')));
  });
  test('organização pendente não cria evento', async () => {
    await assertFails(setDoc(doc(as('carol'), 'events/evC'), { orgId: 'orgC', name: 'X', salt: 's', iterations: 600000 }));
  });
  test('outra organização não lê nem altera o evento', async () => {
    await assertFails(getDoc(doc(as('bob'), 'events/evA')));
    await assertFails(updateDoc(doc(as('bob'), 'events/evA'), { name: 'invadido' }));
    await assertFails(setDoc(doc(as('bob'), 'events/evB'), { orgId: ORG_A, name: 'X', salt: 's', iterations: 1 }));
  });
  test('não dá para trocar salt ou iterações (quebraria os códigos emitidos)', async () => {
    await assertFails(updateDoc(doc(as('alice'), 'events/evA'), { salt: 'outro' }));
    await assertSucceeds(updateDoc(doc(as('alice'), 'events/evA'), { name: 'Evento A renomeado' }));
  });
  test('listagem só dos eventos da própria organização', async () => {
    await assertSucceeds(getDocs(query(collection(as('alice'), 'events'), where('orgId', '==', ORG_A))));
    await assertFails(getDocs(query(collection(as('bob'), 'events'), where('orgId', '==', ORG_A))));
  });
});

describe('dados públicos e registros', () => {
  test('membro publica dados públicos do próprio evento', async () => {
    await assertSucceeds(setDoc(doc(as('alice'), 'publicEvents/evA'), { orgId: ORG_A, prefix: 'EVA26', name: 'Evento A', salt: 's1', iterations: 600000 }));
  });
  test('outra organização não sequestra os dados públicos', async () => {
    await assertFails(setDoc(doc(as('bob'), 'publicEvents/evA'), { orgId: ORG_B, prefix: 'EVA26', name: 'X', salt: 's1', iterations: 1 }));
  });
  test('prefixo inválido é recusado', async () => {
    await assertFails(setDoc(doc(as('alice'), 'publicEvents/evA'), { orgId: ORG_A, prefix: 'eva 26', name: 'Evento A', salt: 's1', iterations: 600000 }));
  });
  test('membro grava registro cifrado só com os campos permitidos', async () => {
    await assertSucceeds(setDoc(doc(as('alice'), 'records/rec2'), { eventId: 'evA', iv: 'a', ct: 'b' }));
    await assertFails(setDoc(doc(as('alice'), 'records/rec3'), { eventId: 'evA', iv: 'a', ct: 'b', name: 'em claro' }));
  });
  test('outra organização não grava registros do evento', async () => {
    await assertFails(setDoc(doc(as('bob'), 'records/rec4'), { eventId: 'evA', iv: 'a', ct: 'b' }));
    await assertFails(setDoc(doc(as('bob'), 'records/rec1'), { eventId: 'evA', iv: 'z', ct: 'z' }));
  });
  test('registro não muda de evento', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'events/evA2'), { orgId: ORG_A, name: 'A2', salt: 's', iterations: 1 });
      await setDoc(doc(ctx.firestore(), 'publicEvents/evA2'), { orgId: ORG_A, prefix: 'EVB26', name: 'A2', salt: 's', iterations: 1 });
    });
    await assertFails(setDoc(doc(as('alice'), 'records/rec1'), { eventId: 'evA2', iv: 'a', ct: 'b' }));
  });
  test('ninguém apaga registros', async () => {
    const { deleteDoc } = await import('firebase/firestore');
    await assertFails(deleteDoc(doc(as('alice'), 'records/rec1')));
  });
});
