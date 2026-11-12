// Dados públicos de um evento (vão para publicEvents e aparecem na verificação). Sem dados pessoais.
export function publicEventOf(event) {
  return {
    id: event.id, orgId: event.orgId || '', prefix: event.prefix.toUpperCase(), salt: event.salt, iterations: event.iterations,
    name: event.name, edition: event.edition || '', dates: event.dates || '', hours: event.hours || '', city: event.city || '', contact: event.contact || '',
  };
}
