import { describe, test, expect } from 'vitest';
import { waNumber, formatPhone, fillMessage, stripEmoji, waLink, filterPeople, distinct, sentKey, exportRows } from '../../src/lib/contacts.js';
import { guessMapping } from '../../src/lib/lists.js';

describe('telefone para WhatsApp', () => {
  test('normaliza celulares brasileiros', () => {
    expect(waNumber('(47) 98895-1008')).toBe('5547988951008');
    expect(waNumber('+55 47 98895-1008')).toBe('5547988951008');
    expect(waNumber('047988951008')).toBe('5547988951008');
    expect(waNumber('47 8895-1008')).toBe('5547988951008'); // celular antigo sem o 9
  });
  test('recusa fixo, incompleto e vazio', () => {
    expect(waNumber('(47) 3368-1234')).toBeNull();
    expect(waNumber('98895')).toBeNull();
    expect(waNumber('')).toBeNull();
  });
  test('aceita número internacional com +', () => {
    expect(waNumber('+351 912 345 678')).toBe('351912345678');
  });
  test('formata para exibir', () => expect(formatPhone('5547988951008')).toBe('(47) 98895-1008'));
});

describe('mensagem', () => {
  const p = { name: 'Eduarda Hanauer', nickname: 'Duda', team: 'Equipe X', role: 'Mentora' };
  test('preenche campos e mantém os desconhecidos', () => {
    expect(fillMessage('Oi, {nome} ({nome_completo}) da {equipe}! {link} {x}', p, { link: 'https://f.co' }))
      .toBe('Oi, Duda (Eduarda Hanauer) da Equipe X! https://f.co {x}');
  });
  test('sem apelido usa o primeiro nome', () => expect(fillMessage('{nome}', { name: 'Yverson Silva' })).toBe('Yverson'));
  test('remove emojis sem estragar acentos', () => {
    expect(stripEmoji('Oi! 👋 Edição 🚀\n👉 link\nValeu! 💙')).toBe('Oi! Edição\n link\nValeu!');
  });
  test('link do wa.me codifica o texto', () => {
    expect(waLink('5547988951008', 'Oi, Duda!\nOK')).toBe('https://wa.me/5547988951008?text=Oi%2C%20Duda!%0AOK');
  });
});

describe('filtro e exportação', () => {
  const people = [
    { name: 'Ana Souza', team: 'Alfa', role: 'Participante', phone: '47988887777', email: 'ana@x.com' },
    { name: 'Bruno Lima', team: 'Beta', role: 'Participante', phone: '123', email: '' },
    { name: 'Carla Melo', team: 'Alfa', role: 'Mentora', phone: '', email: 'carla@x.com' },
  ];
  test('filtra por equipe, função, busca sem acento e telefone válido', () => {
    expect(filterPeople(people, { team: 'Alfa' }).map((p) => p.name)).toEqual(['Ana Souza', 'Carla Melo']);
    expect(filterPeople(people, { role: 'Mentora' })).toHaveLength(1);
    expect(filterPeople(people, { text: 'LIMA' })[0].name).toBe('Bruno Lima');
    expect(filterPeople(people, { onlyValidPhone: true })).toHaveLength(1);
    expect(distinct(people, 'team')).toEqual(['Alfa', 'Beta']);
  });
  test('exporta sem CPF e com link só para telefone válido', () => {
    const rows = exportRows(people, { template: 'Oi, {nome}', link: '', eventName: '', noEmoji: true });
    expect(Object.keys(rows[0])).not.toContain('CPF');
    expect(rows[0]['Link WhatsApp']).toBe('https://wa.me/5547988887777?text=Oi%2C%20Ana');
    expect(rows[1]['Link WhatsApp']).toBe('');
  });
  test('marca de enviado não guarda o número', () => {
    expect(sentKey('5547988887777')).not.toContain('988887777');
    expect(sentKey('5547988887777')).toBe(sentKey('5547988887777'));
  });
  test('reconhece a coluna de telefone', () => {
    expect(guessMapping(['Nome', 'Telefone/WhatsApp']).phone).toBe(1);
  });
});
