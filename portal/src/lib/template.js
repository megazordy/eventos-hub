// Motor de modelos: transforma a configuração editável de um certificado (1 ou 2 folhas)
// em HTML de cada página (1123 × 794 px, A4 paisagem), no layout aprovado do TSW Itapema 2026.
// Funções puras: sem IO e sem estado global.
import { CORNER_ICONS, TIER_ICONS, CHECK_SVG } from './icons.js';

export const PAGE = { w: 1123, h: 794 };

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const color = (t, name) => t.colors[name] || name;

// Variáveis disponíveis nos textos do modelo: {name}, {team}, {code}, {eventName}...
export const TEXT_VARS = [
  ['name', 'nome da pessoa'], ['team', 'equipe/startup'], ['role', 'função'], ['tier', 'cota'],
  ['eventName', 'nome do evento'], ['edition', 'edição'], ['dates', 'datas'], ['datesShort', 'datas curtas'],
  ['hours', 'carga horária'], ['city', 'cidade'], ['venue', 'local'], ['issuedAt', 'data de emissão'],
  ['contact', 'contato'], ['code', 'código'],
];

// Escapa, troca {variáveis} e converte **negrito**.
export function fmt(text, vars) {
  return esc(text)
    .replace(/\{(\w+)\}/g, (m, k) => (k in vars ? esc(vars[k]) : m))
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
}

export function textVars(event, person = {}, code = '', type = {}) {
  return {
    name: person.name || '', team: person.team || '', role: person.role || '', tier: person.tier || '',
    eventName: event.name || '', edition: event.edition || '', dates: type.dates || event.dates || '',
    datesShort: event.datesShort || '', hours: type.hours || event.hours || '', city: event.city || '',
    venue: event.venue || '', issuedAt: event.issuedAt || '', contact: event.contact || '', code,
  };
}

const css = (t) => `
.ehc{width:${PAGE.w}px;height:${PAGE.h}px;box-sizing:border-box;display:flex;overflow:hidden;background:#fff;font-family:Inter,system-ui,sans-serif;color:${t.colors.text};position:relative}
.ehc *{box-sizing:border-box}
.ehc .panel{flex:none;width:324px;height:${PAGE.h}px;padding:56px 48px;display:flex;flex-direction:column;justify-content:space-between;background-color:${t.colors.panel};background-image:radial-gradient(circle at 18% 88%,rgba(251,196,121,.55),rgba(251,196,121,0) 42%),radial-gradient(circle at 92% 30%,rgba(90,199,179,.45),rgba(90,199,179,0) 45%),radial-gradient(circle at 40% 10%,rgba(42,79,125,.9),rgba(42,79,125,0) 55%)}
.ehc .brand{font-weight:800;font-size:22px;line-height:1.08;letter-spacing:-.01em;color:#fff}
.ehc .brand .t{color:${t.colors.teal}}
.ehc .pdate{font-size:14px;font-weight:700;color:${t.colors.peach}}
.ehc .plabel{font-size:34px;font-weight:900;color:#fff;letter-spacing:-.02em;line-height:1}
.ehc .pextra{font-size:13px;color:#fff;line-height:1.45}
.ehc .main{flex:1;height:${PAGE.h}px;display:flex;flex-direction:column;position:relative;z-index:0}
.ehc .pill{display:inline-flex;align-items:center;padding:8px 20px;border-radius:999px;font-weight:800;font-size:17px;line-height:1}
.ehc .tier-icon{width:22px;height:22px;margin-right:10px;flex:none}
.ehc .sig{width:250px;display:flex;flex-direction:column;gap:4px;align-items:center;text-align:center}
.ehc .sig .line{align-self:stretch;height:1px;background:${t.colors.text};margin-bottom:8px}
.ehc .sig img{height:78px;max-width:250px;object-fit:contain;object-position:center bottom;margin-bottom:-16px;mix-blend-mode:multiply}
.ehc .qr{flex:none;display:flex;flex-direction:column;align-items:center;gap:4px}
.ehc .qr svg{width:72px;height:72px;display:block}
.ehc .qr-label{width:80px;font-size:9px;font-weight:700;color:${t.colors.navy};text-align:center;line-height:1.2}
.ehc .wm{position:absolute;width:92px;opacity:.3;mix-blend-mode:multiply;z-index:-1}
.ehc .logo-box{position:absolute;top:200px;right:72px;width:210px;height:118px;padding:16px 20px;background:#fff;border:1.5px solid ${t.colors.line};border-radius:16px;display:flex;align-items:center;justify-content:center}
.ehc .logo-box img{max-width:100%;max-height:100%;object-fit:contain}
.ehc .day{display:flex;flex-direction:column;gap:10px}
.ehc .day h3{margin:0;font-size:15px;font-weight:800;color:${t.colors.navy};line-height:1.25}
.ehc .day ul{margin:4px 0 0;padding:0;list-style:none;display:flex;flex-direction:column;gap:9px;font-size:13px;line-height:1.4}
.ehc .day li{display:flex;gap:8px;align-items:flex-start}
.ehc .day li::before{content:"";flex:none;width:6px;height:6px;border-radius:6px;background:${t.colors.teal};margin-top:7px}
.ehc .check{display:flex;gap:8px;align-items:flex-start;font-size:13px;font-weight:600;line-height:1.35;color:${t.colors.navy}}
.ehc .skill{display:inline-flex;align-items:center;padding:7px 16px;border-radius:999px;background:${t.colors.teal};color:${t.colors.navy};font-weight:800;font-size:13px;line-height:1}
`;

const pill = (t, text, bg, prefix = '') => {
  const fg = bg === 'navy' ? '#FFFFFF' : color(t, 'navy');
  return `<span class="pill" style="background:${color(t, bg)};color:${fg}">${prefix}${text}</span>`;
};

function panel(t, vars, { date, label, extra }) {
  const brand = t.brand.map((l) => `<div${l.accent ? ' class="t"' : ''}>${fmt(l.text, vars)}</div>`).join('');
  return `<div class="panel"><div class="brand">${brand}</div>
${t.panelImage ? `<img src="${esc(t.panelImage)}" alt="" style="width:220px;align-self:center">` : '<div></div>'}
<div style="display:flex;flex-direction:column;gap:8px"><div class="pdate">${fmt(date, vars)}</div><div class="plabel">${fmt(label, vars)}</div>${extra ? `<div class="pextra">${fmt(extra, vars)}</div>` : ''}</div></div>`;
}

function frontPage(t, ctx) {
  const { vars, person, qrSvg, signatures, tierIcon } = ctx;
  const f = t.front;
  const corner = f.cornerImage
    ? `<div style="position:absolute;top:44px;right:56px"><img src="${esc(f.cornerImage)}" alt="" style="width:110px;display:block"></div>`
    : (CORNER_ICONS[f.cornerIcon]?.svg ? `<div style="position:absolute;top:52px;right:60px">${CORNER_ICONS[f.cornerIcon].svg}</div>` : '');
  const badges = f.badges.map((b) => pill(t, fmt(b.text, vars), b.bg)).join('')
    + (f.showTierBadge && person.tier ? pill(t, `Cota ${esc(person.tier)}`, 'navy', TIER_ICONS[tierIcon]?.svg || '') : '');
  const meta = [];
  if (f.showCnpj && person.cnpj) meta.push(`CNPJ ${esc(person.cnpj)}`);
  if (f.showCpf && person.cpf) meta.push(`CPF ${esc(person.cpf)}`);
  if (f.teamText && person.team) meta.push(fmt(f.teamText, vars));
  const compact = f.facts || f.thanks?.text || f.sponsorLogo;
  const sigs = signatures.map((s) => `<div class="sig">${s.image ? `<img src="${esc(s.image)}" alt="">` : ''}<div class="line"></div><div style="font-weight:700;font-size:15px">${esc(s.name)}</div><div style="font-size:13px">${esc(s.role)}</div></div>`).join('');
  return `<div class="ehc" style="--x:0">${panel(t, vars, { date: f.panelDate, label: f.panelLabel, extra: '' })}
<div class="main" style="padding:64px 72px 56px">
${t.watermark ? `<img class="wm" src="${esc(t.watermark)}" alt="" style="right:66px;bottom:10px">` : ''}
${corner}
${f.sponsorLogo && person.logoUrl ? `<div class="logo-box"><img src="${esc(person.logoUrl)}" alt=""></div>` : ''}
<h1 style="margin:0;font-size:64px;font-weight:900;line-height:1;letter-spacing:-.03em;color:${t.colors.navy}">${fmt(f.title, vars)}</h1>
<div style="margin-top:14px;display:flex;flex-wrap:wrap;gap:10px">${badges}</div>
<div style="font-size:17px;font-weight:500;margin-top:${f.facts ? 36 : 44}px">${fmt(f.lead, vars)}</div>
<div style="font-size:38px;font-weight:800;color:${t.colors.navy};letter-spacing:-.02em;line-height:1.1;margin-top:10px;${f.sponsorLogo ? 'max-width:420px;' : ''}text-wrap:balance">${esc(person.name)}</div>
${meta.length ? `<div style="font-size:16px;font-weight:700;color:${t.colors.tealDark};margin-top:8px">${meta.join(' · ')}</div>` : ''}
<div style="width:96px;height:4px;border-radius:4px;background:${t.colors.teal};margin-top:${f.facts ? 14 : 18}px"></div>
<p style="margin:${compact ? 14 : 18}px 0 0;font-size:${compact ? 16 : 17}px;line-height:${compact ? 1.55 : 1.6};text-wrap:pretty">${fmt(f.body, vars)}</p>
${f.showNote && person.note ? `<p style="margin:12px 0 0;font-size:15px;line-height:1.55;color:${t.colors.navy};text-wrap:pretty">${esc(person.note)}</p>` : ''}
${f.facts ? `<div style="display:flex;gap:40px;margin-top:20px;padding-top:14px;border-top:1px solid ${t.colors.line}">${[['Carga horária', `${vars.hours} horas`], ['Data', vars.dates], ['Local', [vars.venue, vars.city].filter(Boolean).join(' · ')]].map(([k, v]) => `<div style="display:flex;flex-direction:column;gap:2px"><div style="font-size:12px;font-weight:800;color:${t.colors.tealDark}">${k}</div><div style="font-size:14px;font-weight:700;color:${t.colors.navy}">${esc(v)}</div></div>`).join('')}</div>` : ''}
${f.thanks?.text ? `<div style="margin-top:14px;display:flex;flex-direction:column;gap:4px"><div style="font-size:14px;font-weight:600;font-style:italic;line-height:1.5;color:${t.colors.navy};text-wrap:pretty">“${fmt(f.thanks.text, vars)}”</div>${f.thanks.signer ? `<div style="font-size:13px;font-weight:700;color:${t.colors.tealDark}">${fmt(f.thanks.signer, vars)}</div>` : ''}</div>` : ''}
<div style="margin-top:auto;display:flex;flex-direction:column;gap:${f.facts ? 14 : 22}px">
<div style="display:flex;justify-content:space-between;align-items:flex-end;gap:32px"><div style="display:flex;gap:40px">${sigs}</div>
<div class="qr">${qrSvg || ''}<div class="qr-label">Verifique a autenticidade</div></div></div>
<div style="font-size:13px">${fmt(f.footer, vars)}</div></div>
</div></div>`;
}

function backPage(t, ctx) {
  const { vars } = ctx;
  const b = t.back;
  const days = b.days.map((d) => `<div class="day"><div>${pill(t, fmt(d.label, vars), d.color).replace('font-size:17px', 'font-size:15px')}</div><h3>${fmt(d.title, vars)}</h3><ul>${d.items.map((i) => `<li><span>${fmt(i, vars)}</span></li>`).join('')}</ul></div>`).join('');
  return `<div class="ehc">${panel(t, vars, { date: b.panelDate, label: b.panelLabel, extra: b.panelExtra })}
<div class="main" style="padding:56px 64px 48px">
${t.watermark ? `<img class="wm" src="${esc(t.watermark)}" alt="" style="right:40px;bottom:16px">` : ''}
${t.backImage ? `<img src="${esc(t.backImage)}" alt="" style="position:absolute;left:50%;top:50%;width:560px;transform:translate(-50%,-46%);opacity:.2;z-index:-1">` : ''}
<h2 style="margin:0;font-size:36px;font-weight:900;letter-spacing:-.025em;line-height:1;color:${t.colors.navy}">${fmt(b.title, vars)}</h2>
${b.intro ? `<p style="margin:10px 0 0;font-size:14px;line-height:1.5">${fmt(b.intro, vars)}</p>` : ''}
${b.days.length ? `<div style="display:grid;grid-template-columns:repeat(${b.days.length},1fr);gap:32px;margin-top:30px">${days}</div>` : ''}
${b.deliverItems.length ? `<div style="margin-top:28px;display:flex;flex-direction:column;gap:12px"><div style="font-size:15px;font-weight:800;color:${t.colors.navy}">${fmt(b.deliverTitle, vars)}</div><div style="display:grid;grid-template-columns:repeat(${Math.min(4, b.deliverItems.length)},1fr);gap:16px">${b.deliverItems.map((i) => `<div class="check">${CHECK_SVG}<span>${fmt(i, vars)}</span></div>`).join('')}</div></div>` : ''}
<div style="margin-top:auto;padding-top:22px;border-top:1px solid ${t.colors.line};display:flex;flex-direction:column;gap:12px">
${b.skills.length ? `<div style="font-size:15px;font-weight:800;color:${t.colors.navy}">${fmt(b.skillsTitle, vars)}</div><div style="display:flex;flex-wrap:wrap;gap:8px">${b.skills.map((s) => `<span class="skill">${fmt(s, vars)}</span>`).join('')}</div>` : ''}
<div style="font-size:12px;margin-top:6px;line-height:1.5">${fmt(b.footer, vars).replace(/\n/g, '<br>')}</div></div>
</div></div>`;
}

// ctx: { event, type, person, code, qrSvg, signatures, tierIcon }
export function renderPages(template, ctx) {
  const vars = textVars(ctx.event, ctx.person, ctx.code, ctx.type);
  const full = { ...ctx, vars, signatures: ctx.signatures || [] };
  const style = `<style>${css(template)}</style>`;
  const pages = [style + frontPage(template, full)];
  if (template.pages === 2) pages.push(style + backPage(template, full));
  return pages;
}
