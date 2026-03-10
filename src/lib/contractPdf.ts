import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

const FONT_REGULAR = 'C:/Windows/Fonts/arial.ttf';
const FONT_BOLD    = 'C:/Windows/Fonts/arialbd.ttf';

const TEMPLATE_PATH = path.join(process.cwd(), 'src/templates/kira_sozlesmesi.txt');

// ── Section detection ─────────────────────────────────────────
function isTitle(line: string)      { return line === 'KİRA SÖZLEŞMESİ'; }
function isArticleHeader(line: string) {
  return /^Madde\s+\d+/.test(line);
}
function isSectionLabel(line: string) {
  return /^[A-ZÇĞİÖŞÜ\s]{4,}$/.test(line.trim()) && line.trim().length > 3;
}

export function loadTemplate(): string {
  return fs.readFileSync(TEMPLATE_PATH, 'utf-8');
}

export function generateContractPdf(filledText: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size:    'A4',
      margins: { top: 60, bottom: 60, left: 65, right: 65 },
      info:    { Title: 'Kira Sözleşmesi', Author: 'KiraTakip' },
    });

    doc.registerFont('Regular', FONT_REGULAR);
    doc.registerFont('Bold',    FONT_BOLD);

    const chunks: Buffer[] = [];
    doc.on('data',  (c: Buffer) => chunks.push(c));
    doc.on('end',   ()          => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const lines = filledText.split('\n');

    for (const raw of lines) {
      const line = raw.trimEnd();

      if (isTitle(line)) {
        doc.font('Bold').fontSize(16)
          .text(line, { align: 'center' })
          .moveDown(0.6);
        continue;
      }

      if (isArticleHeader(line)) {
        doc.moveDown(0.4)
          .font('Bold').fontSize(11)
          .text(line)
          .moveDown(0.1);
        continue;
      }

      if (isSectionLabel(line)) {
        doc.font('Bold').fontSize(10)
          .text(line)
          .moveDown(0.1);
        continue;
      }

      if (line === '') {
        doc.moveDown(0.35);
        continue;
      }

      doc.font('Regular').fontSize(10)
        .text(line, { align: 'justify', lineGap: 2 });
    }

    doc.end();
  });
}
