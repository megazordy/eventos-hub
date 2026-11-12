// Preenche os modelos HTML do evento e gera o PDF (uma página por modelo) com o Chrome/Edge instalado.
// Sintaxe dos modelos: {{campo}} (texto escapado), {{{campo}}} (HTML cru), {{#campo}}...{{/campo}} (só se preenchido).
// IO: lê modelos, escreve HTML temporário em tmpDir, abre o navegador (processo externo).
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer-core';
import QRCode from 'qrcode';
import { PDFDocument } from 'pdf-lib';

const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const lookup = (data, path) => path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), data);

export function fillTemplate(html, data) {
  // Seções podem estar aninhadas: resolve até não sobrar nenhuma.
  let out = html;
  for (let prev = ''; prev !== out;) {
    prev = out;
    out = out.replace(/\{\{#([\w.]+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (_, k, inner) => (lookup(data, k) ? inner : ''));
  }
  return out
    .replace(/\{\{\{([\w.]+)\}\}\}/g, (_, k) => String(lookup(data, k) ?? ''))
    .replace(/\{\{([\w.]+)\}\}/g, (_, k) => escapeHtml(lookup(data, k)));
}

const BROWSER_PATHS = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
].filter(Boolean);

export async function openBrowser() {
  const executablePath = BROWSER_PATHS.find((p) => existsSync(p));
  if (!executablePath) throw new Error('Chrome/Edge não encontrado. Defina CHROME_PATH.');
  return puppeteer.launch({ executablePath, headless: true, args: ['--allow-file-access-from-files'] });
}

export const qrSvg = (url) => QRCode.toString(url, { type: 'svg', margin: 0, errorCorrectionLevel: 'M', color: { dark: '#1F3862', light: '#FFFFFF' } });

export const cssVars = (colors) => Object.entries(colors).map(([k, v]) => `--${k}: ${v};`).join(' ');

const PAGE = { w: 1123, h: 794 }; // A4 paisagem em px CSS (96 dpi), tamanho dos modelos

export async function renderPdf(browser, { eventDir, templates, data, tmpDir }) {
  mkdirSync(tmpDir, { recursive: true });
  const baseHref = pathToFileURL(resolve(eventDir) + '/').href;
  const merged = await PDFDocument.create();
  const page = await browser.newPage();
  await page.setViewport({ width: PAGE.w, height: PAGE.h, deviceScaleFactor: 3 }); // ~290 dpi
  try {
    for (const [i, name] of templates.entries()) {
      const html = fillTemplate(readFileSync(join(eventDir, 'templates', name), 'utf8'), data)
        .replace(/<head>/i, `<head><base href="${baseHref}">`);
      const tmpFile = join(tmpDir, `render-${i}.html`);
      writeFileSync(tmpFile, html);
      await page.goto(pathToFileURL(resolve(tmpFile)).href, { waitUntil: 'networkidle0', timeout: 60000 });
      await page.evaluate(() => document.fonts.ready);
      // Página rasterizada: o page.pdf() do Chrome distorce degradês com transparência (painel saía rosa).
      // A imagem fica idêntica ao layout aprovado em qualquer leitor de PDF.
      const jpg = await page.screenshot({ type: 'jpeg', quality: 92, clip: { x: 0, y: 0, width: PAGE.w, height: PAGE.h } });
      const img = await merged.embedJpg(jpg);
      const pdfPage = merged.addPage([PAGE.w * 0.75, PAGE.h * 0.75]); // px → pt (A4 paisagem)
      pdfPage.drawImage(img, { x: 0, y: 0, width: PAGE.w * 0.75, height: PAGE.h * 0.75 });
    }
  } finally {
    await page.close();
  }
  merged.setTitle(`Certificado - ${data.person.name}`);
  merged.setProducer('eventos-hub');
  return Buffer.from(await merged.save());
}
