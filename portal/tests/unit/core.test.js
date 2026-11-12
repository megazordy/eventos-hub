import { describe, test, expect } from 'vitest';
import * as portal from '../../src/lib/crypto.js';
import * as cli from '../../../certificados/lib/crypto.js';
import { renderPages, fmt } from '../../src/lib/template.js';
import { tswEvent, defaultTypes } from '../../src/lib/presets.js';
import { guessMapping, toPeople, validatePeople, isValidCpf, formatCpf, maskCpf } from '../../src/lib/lists.js';

const verification = { salt: 'teste-salt', iterations: 1000 };

describe('criptografia compatível com o gerador da linha de comando', () => {
  test('registro cifrado pelo CLI é lido pelo portal', async () => {
    const code = 'TSWI26-ABCD-EFGH-JKMN';
    const rec = await cli.encryptRecord(code, { name: 'Maria' }, verification);
    expect(await portal.recordId(code, verification)).toBe(rec.id);
    expect(await portal.decryptRecord(code, rec, verification)).toEqual({ name: 'Maria' });
  });
  test('registro cifrado pelo portal é lido pelo CLI', async () => {
    const code = portal.newCode('EVT26');
    expect(code).toMatch(/^EVT26(-[A-HJKMNP-Z2-9]{4}){3}$/);
    const rec = await portal.encryptRecord(code, { name: 'João' }, verification);
    expect(await cli.decryptRecord(code.toLowerCase(), rec, verification)).toEqual({ name: 'João' });
  });
  test('código errado não decifra', async () => {
    const rec = await portal.encryptRecord('EVT26-AAAA-BBBB-CCCC', { name: 'X' }, verification);
    expect(await portal.recordId('EVT26-AAAA-BBBB-CCCD', verification)).not.toBe(rec.id);
  });
});

describe('modelos', () => {
  const event = { ...tswEvent(), prefix: 'TSWI26' };
  const person = { name: 'Maria <script>', team: 'Startup X', cpf: '***.456.789-**', tier: 'Meia Praia', note: '' };

  test('todos os modelos do Startup Weekend renderizam sem variável sobrando', () => {
    for (const [key, type] of Object.entries(event.types)) {
      const pages = renderPages(type.template, { event, type, person, code: 'TSWI26-AAAA-BBBB-CCCC', qrSvg: '<svg></svg>', signatures: event.signatures, tierIcon: 'waves' });
      expect(pages.length, key).toBe(type.template.pages);
      for (const html of pages) {
        expect(html, key).not.toMatch(/\{(name|team|eventName|edition|dates|hours|city|code|datesShort)\}/);
        expect(html, key).not.toContain('<script>'); // nome escapado
      }
    }
  });
  test('verso traz programação e competências', () => {
    const type = event.types.participante;
    const [, back] = renderPages(type.template, { event, type, person, code: 'X', qrSvg: '', signatures: [] });
    expect(back).toContain('Conteúdo programático');
    expect(back).toContain('pensamento empreendedor');
  });
  test('modelos simples têm 1 folha', () => {
    for (const t of Object.values(defaultTypes())) expect(t.template.pages).toBe(1);
  });
  test('negrito e variáveis', () => {
    expect(fmt('olá **{name}** & cia', { name: 'Ana' })).toBe('olá <b>Ana</b> &amp; cia');
  });
});

describe('listas', () => {
  const sheet = {
    headers: ['Qual seu nome completo?', 'Qual seu e-mail?', 'CPF', 'Nome do Contato de Emergência', 'Equipe'],
    rows: [
      ['Ana Souza', 'ana@ex.com', '52998224725', 'Mãe da Ana', 'Alpha'],
      ['Bruno Lima', 'bruno@ex', '11111111111', 'Pai', 'Beta'],
      ['Ana Souza', 'ana@ex.com', '', '', 'Alpha'],
    ],
  };
  test('mapeamento não confunde contato de emergência com nome', () => {
    const m = guessMapping(sheet.headers);
    expect(m.name).toBe(0);
    expect(m.email).toBe(1);
    expect(m.cpf).toBe(2);
    expect(m.team).toBe(4);
  });
  test('validação aponta duplicado, CPF e e-mail inválidos', () => {
    const people = toPeople(sheet, guessMapping(sheet.headers));
    expect(people[0].cpf).toBe('529.982.247-25');
    const issues = validatePeople(people);
    expect(issues.some((i) => i.level === 'erro' && i.text.includes('repetido'))).toBe(true);
    expect(issues.some((i) => i.text.includes('CPF'))).toBe(true);
    expect(issues.some((i) => i.text.includes('e-mail'))).toBe(true);
  });
  test('CPF', () => {
    expect(isValidCpf('529.982.247-25')).toBe(true);
    expect(isValidCpf('111.111.111-11')).toBe(false);
    expect(maskCpf(formatCpf('52998224725'))).toBe('***.982.247-**');
  });
});
