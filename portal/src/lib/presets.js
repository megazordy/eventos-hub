// Modelos prontos: um genérico (para qualquer evento) e os do techstars_ Startup Weekend Itapema 2026,
// que viram ponto de partida editável. Funções puras.

export const DEFAULT_COLORS = { navy: '#1F3862', teal: '#5AC7B3', tealDark: '#2A8F7F', peach: '#FBC479', text: '#323232', line: '#D5DCE6', panel: '#2B2A63' };

const SIGNED_BY = 'Organização do {eventName}';

export function baseTemplate({ label = 'Participante', badge = 'de participação', badgeBg = 'teal', body, pages = 1, brand } = {}) {
  return {
    pages,
    colors: { ...DEFAULT_COLORS },
    brand: brand || [{ text: '{eventName}', accent: false }],
    panelImage: '',
    backImage: '',
    watermark: '',
    front: {
      panelDate: '{datesShort} · {city}',
      panelLabel: label,
      cornerIcon: 'star',
      cornerImage: '',
      title: 'Certificado',
      badges: [{ text: badge, bg: badgeBg }],
      showTierBadge: false,
      lead: 'Certificamos que',
      showCpf: true,
      showCnpj: false,
      teamText: '',
      body: body || 'participou da {edition} do **{eventName}**, realizada de {dates}, em {city}, com carga horária de {hours} horas.',
      showNote: true,
      facts: false,
      thanks: { text: '', signer: SIGNED_BY },
      sponsorLogo: false,
      footer: '{city}, {issuedAt} · Código de validação: {code}',
    },
    back: {
      panelDate: '{hours} horas · {datesShort}',
      panelLabel: label,
      panelExtra: '{venue} · {city}',
      title: 'Conteúdo programático',
      intro: '',
      days: [],
      deliverTitle: 'Entregas',
      deliverItems: [],
      skillsTitle: 'Competências desenvolvidas',
      skills: [],
      footer: 'Código de validação: {code} · {contact}',
    },
  };
}

// Tipos padrão para um evento novo (o organizador edita, remove ou cria outros).
export function defaultTypes() {
  return {
    participante: { label: 'Participante', driveFolder: 'Participantes', template: baseTemplate({ label: 'Participante', badge: 'de participação', badgeBg: 'teal' }) },
    mentor: { label: 'Mentor(a)', driveFolder: 'Mentores', template: { ...baseTemplate({ label: 'Mentor', badge: 'de mentoria', badgeBg: 'peach', body: 'atuou como **mentor(a)** na {edition} do **{eventName}**, realizada de {dates}, em {city}, orientando as equipes com conhecimento, experiência e feedback.' }) } },
    organizacao: { label: 'Organizador(a)', driveFolder: 'Organizadores', template: baseTemplate({ label: 'Organizador', badge: 'de organização', badgeBg: 'navy', body: 'integrou a **equipe de organização** da {edition} do **{eventName}**, realizada de {dates}, em {city}.' }) },
  };
}

// ---------- techstars_ Startup Weekend Itapema 2026 (modelos aprovados)
const TSW_ASSETS = { panel: 'presets/tsw/seagull-white.png', corner: 'presets/tsw/seagull.png', watermark: 'presets/tsw/costa-valley.png' };
const TSW_BRAND = [{ text: 'techstars_' }, { text: 'Startup Weekend' }, { text: 'Itapema', accent: true }, { text: 'Turistech', accent: true }];
const TSW_DAYS = [
  { label: 'Sexta · 06/11', color: 'peach', title: 'Ideias e formação dos times', items: ['Abertura e boas-vindas', 'Pitches de ideias e votação', 'Formação das equipes em dinâmica de recrutamento'] },
  { label: 'Sábado · 07/11', color: 'teal', title: 'Validação de problemas e soluções', items: ['Workshop de validação do problema', 'Workshop de validação da solução (MVP)', 'Validação com potenciais clientes', 'Mentorias de negócios, tecnologia e design'] },
  { label: 'Domingo · 08/11', color: 'navy', title: 'Pitch para a banca', items: ['Workshop de pitch: como apresentar para investidores e clientes', 'Ajustes finais do modelo de negócio', 'Apresentação final à banca de investidores, empreendedores e aceleradoras'] },
];
const TSW_THANKS_SIGNER = 'Organização do techstars_ Startup Weekend Itapema · Comunidade Costa Valley';

function tsw(label, badge, badgeBg, icon, body, extra = {}) {
  const t = baseTemplate({ label, badge, badgeBg, body, brand: TSW_BRAND });
  t.panelImage = TSW_ASSETS.panel;
  t.backImage = TSW_ASSETS.corner;
  t.watermark = TSW_ASSETS.watermark;
  t.front.cornerIcon = icon;
  t.front.thanks = { text: '', signer: TSW_THANKS_SIGNER };
  t.back.days = TSW_DAYS;
  t.back.footer = 'Realização: Techstars · Startup Weekend  |  Apoio: Sebrae/SC · Startup SC\nCódigo de validação: {code} · {contact}';
  return Object.assign(t, extra);
}

function withBack(t, { badge, intro, deliverTitle, deliverItems, skillsTitle = 'Competências exercidas', skills }) {
  t.pages = 2;
  if (badge) t.back.panelDate = badge;
  t.back.intro = intro;
  t.back.deliverTitle = deliverTitle;
  t.back.deliverItems = deliverItems;
  t.back.skillsTitle = skillsTitle;
  t.back.skills = skills;
  return t;
}

export function tswEvent() {
  const participant = withBack(tsw('Participante', 'de participação', 'teal', 'none',
    'participou da {edition} do **{eventName}**, imersão em empreendedorismo aplicado ao turismo com a metodologia Techstars. Em uma equipe multidisciplinar, validou um problema real com potenciais usuários, construiu e testou uma solução e apresentou o pitch final a uma banca de investidores, empreendedores e aceleradoras.'), {
    intro: 'Imersão em empreendedorismo aplicado ao turismo, com acompanhamento de facilitador e mentores.',
    deliverTitle: 'Entregas da equipe', deliverItems: ['Problema validado com potenciais clientes', 'Solução testada e MVP definido', 'Modelo de negócio estruturado', 'Pitch apresentado à banca'],
    skillsTitle: 'Competências desenvolvidas', skills: ['desenvolvimento de clientes', 'trabalho em equipe multidisciplinar', 'pensamento empreendedor', 'comunicação e persuasão'],
  });
  participant.front.cornerImage = TSW_ASSETS.corner;
  participant.front.teamText = 'integrante da startup {team}';
  participant.front.facts = true;

  const mentor = withBack(tsw('Mentor', 'de mentoria', 'peach', 'paths', 'atuou como **mentor(a)** na {edition} do **{eventName}**, realizada de {dates}, em {city}, orientando as equipes com conhecimento, experiência e feedback, da validação do problema ao pitch final.'), {
    intro: 'Programação acompanhada pelos mentores, que orientaram as equipes com experiência de mercado em negócios, tecnologia e design.',
    deliverTitle: 'Atuação na mentoria', deliverItems: ['Orientação na validação do problema com potenciais clientes', 'Feedback sobre a solução e o MVP', 'Apoio na estruturação do modelo de negócio', 'Preparação das equipes para o pitch final'],
    skills: ['mentoria de empreendedores', 'feedback estruturado', 'visão de negócios', 'desenvolvimento de pessoas'],
  });
  const organizer = withBack(tsw('Organizador', 'de organização', 'navy', 'sun', 'integrou a **equipe de organização** da {edition} do **{eventName}**, atuando desde os **três meses de preparação** até a realização do evento, de {dates}, em {city}, e tornando possíveis {hours} horas de empreendedorismo na prática.'), {
    badge: '3 meses de preparação · {datesShort}',
    intro: 'Trabalho iniciado três meses antes do evento, do planejamento e da preparação até a realização das {hours} horas de programação.',
    deliverTitle: 'Atuação na organização', deliverItems: ['Planejamento e produção do evento', 'Relacionamento com patrocinadores, mentores e banca', 'Acolhimento e suporte aos participantes', 'Comunicação e divulgação do evento'],
    skills: ['gestão de eventos', 'liderança e trabalho em equipe', 'articulação do ecossistema', 'comunicação'],
  });
  const staff = withBack(tsw('Staff', 'de staff', 'teal', 'people', 'integrou a **equipe de staff** da {edition} do **{eventName}**, realizada de {dates}, em {city}, apoiando a operação do evento e o acolhimento de participantes, mentores e banca ao longo das {hours} horas.'), {
    intro: 'Programação apoiada pela equipe de staff, do credenciamento ao pitch final.',
    deliverTitle: 'Atuação no staff', deliverItems: ['Credenciamento e acolhimento dos participantes', 'Apoio logístico e operacional', 'Suporte a mentores, palestrantes e banca', 'Organização dos espaços e da programação'],
    skills: ['trabalho em equipe', 'resolução de problemas', 'comunicação', 'organização e logística'],
  });
  const facilitator = withBack(tsw('Facilitador', 'de facilitação', 'navy', 'star', 'atuou como **facilitador(a)** na {edition} do **{eventName}**, realizada de {dates}, em {city}, conduzindo a programação e as equipes ao longo das {hours} horas.'), {
    intro: 'Programação conduzida pelo facilitador com a metodologia Techstars, do primeiro pitch à apresentação final.',
    deliverTitle: 'Atuação na facilitação', deliverItems: ['Condução da programação e dos workshops', 'Aplicação da metodologia Techstars', 'Acompanhamento das equipes e gestão do tempo', 'Condução das apresentações finais à banca'],
    skills: ['facilitação de grupos', 'metodologias de inovação', 'gestão do tempo', 'oratória e condução'],
  });
  const jury = tsw('Jurado', 'de banca avaliadora', 'navy', 'medal', 'atuou como **jurado(a)** na banca avaliadora da {edition} do **{eventName}**, no domingo, 8 de novembro de 2026, das 16h às 22h, em {city}, avaliando os pitches finais das equipes, com carga horária de 6 horas.');
  jury.front.panelDate = 'Domingo · 8/11/2026';
  jury.front.thanks.text = 'Obrigado por dedicar seu tempo e sua experiência à avaliação das equipes. Seu olhar criterioso e seus feedbacks ajudam cada empreendedor a dar o próximo passo.';
  const sponsor = tsw('Patrocinador', 'de patrocínio', 'teal', 'gem', 'patrocinou a {edition} do **{eventName}**, realizada de {dates}, em {city}, investindo no ecossistema local e tornando possíveis {hours} horas de empreendedorismo e inovação no turismo.');
  sponsor.front.showTierBadge = true;
  sponsor.front.showCnpj = true;
  sponsor.front.sponsorLogo = true;
  sponsor.front.thanks.text = 'Obrigado por acreditar no potencial de Itapema e investir em quem empreende. Seu patrocínio transformou ideias em startups e aproximou a cidade do ecossistema de inovação.';
  const supporter = tsw('Apoiador', 'de apoio', 'peach', 'heart', 'apoiou a {edition} do **{eventName}**, realizada de {dates}, em {city}, contribuindo com recursos, serviços ou divulgação para tornar possíveis {hours} horas de empreendedorismo e inovação no turismo.');
  supporter.front.showCnpj = true;
  supporter.front.thanks.text = 'Obrigado por caminhar junto com a gente. Seu apoio fez diferença em cada detalhe destes três dias e mostra a força de uma comunidade que acredita na inovação.';

  return {
    name: 'techstars_ Startup Weekend Itapema - Turistech',
    edition: '4ª edição',
    dates: '6 a 8 de novembro de 2026',
    datesShort: '6 a 8/11/2026',
    issuedAt: '8 de novembro de 2026',
    hours: '54',
    city: 'Itapema/SC',
    venue: 'Centro Novos Caminhos',
    contact: 'switapema@gmail.com · @switapema',
    signatures: [{ name: 'Nome do(a) líder', role: 'Organizador Líder', image: '' }, { name: 'Nome do(a) vice-líder', role: 'Organizador Vice-líder', image: '' }],
    types: {
      participante: { label: 'Participante', driveFolder: 'Participantes', template: participant },
      mentor: { label: 'Mentor(a)', driveFolder: 'Mentores', template: mentor },
      organizacao: { label: 'Organizador(a)', driveFolder: 'Organizadores', template: organizer },
      staff: { label: 'Staff', driveFolder: 'Staff', template: staff },
      facilitador: { label: 'Facilitador(a)', driveFolder: 'Facilitadores', template: facilitator },
      jurado: { label: 'Jurado(a)', driveFolder: 'Jurados', hours: '6', dates: '8 de novembro de 2026 (domingo), das 16h às 22h', template: jury },
      patrocinador: { label: 'Patrocinador', driveFolder: 'Patrocinadores', tiers: [{ name: 'Mirante do Encanto', icon: 'sun' }, { name: 'Ponte dos Suspiros', icon: 'bridge' }, { name: 'Meia Praia', icon: 'waves' }], template: sponsor },
      apoiador: { label: 'Apoiador', driveFolder: 'Apoiadores', template: supporter },
    },
  };
}
