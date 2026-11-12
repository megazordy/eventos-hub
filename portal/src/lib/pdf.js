// Gera o PDF de um certificado no navegador: cada página HTML vira imagem em alta resolução
// (igual ao gerador da linha de comando, que rasteriza para evitar distorção de degradês) e o
// pdf-lib monta o arquivo A4 paisagem. IO: cria e remove um contêiner fora da tela no DOM.
import { toJpeg } from 'html-to-image';
import { PDFDocument } from 'pdf-lib';
import QRCode from 'qrcode';
import { PAGE } from './template.js';

export const qrSvg = (url) => QRCode.toString(url, { type: 'svg', margin: 0, errorCorrectionLevel: 'M', color: { dark: '#1F3862', light: '#FFFFFF' } });

const waitImages = (root) => Promise.all([...root.querySelectorAll('img')].map((img) =>
  img.complete ? null : new Promise((ok) => { img.onload = ok; img.onerror = ok; })));

export async function pagesToPdf(pages, { title = 'Certificado', pixelRatio = 2.5 } = {}) {
  const host = document.createElement('div');
  host.style.cssText = `position:fixed;left:-20000px;top:0;width:${PAGE.w}px;height:${PAGE.h}px;pointer-events:none`;
  document.body.appendChild(host);
  const pdf = await PDFDocument.create();
  try {
    for (const html of pages) {
      host.innerHTML = html;
      const node = host.querySelector('.ehc');
      await waitImages(host);
      await document.fonts.ready;
      const dataUrl = await toJpeg(node, { quality: 0.92, pixelRatio, width: PAGE.w, height: PAGE.h, cacheBust: false });
      const img = await pdf.embedJpg(dataUrl);
      const page = pdf.addPage([PAGE.w * 0.75, PAGE.h * 0.75]); // px → pt
      page.drawImage(img, { x: 0, y: 0, width: PAGE.w * 0.75, height: PAGE.h * 0.75 });
    }
  } finally {
    host.remove();
  }
  pdf.setTitle(title);
  pdf.setProducer('eventos-hub');
  return pdf.save(); // Uint8Array
}

export const safeFileName = (s) => s.normalize('NFC').replace(/[\\/:*?"<>|]+/g, '').replace(/\s+/g, ' ').trim();
