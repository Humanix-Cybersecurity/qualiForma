// SPDX-License-Identifier: AGPL-3.0-or-later
import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from 'pdf-lib';
import QRCode from 'qrcode';
import { TEMPLATE_VERSION } from './types';

const A4 = { w: 595.28, h: 841.89 };
const MARGIN = 50;
const GREY = rgb(0.35, 0.35, 0.35);
const BLACK = rgb(0.1, 0.1, 0.1);

/** Constructeur de PDF en flux vertical avec pagination et pied de page versionné. */
export class PdfBuilder {
  private page!: PDFPage;
  private y = 0;
  private constructor(
    private readonly doc: PDFDocument,
    private readonly font: PDFFont,
    private readonly bold: PDFFont,
  ) {}

  static async create(): Promise<PdfBuilder> {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const bold = await doc.embedFont(StandardFonts.HelveticaBold);
    const b = new PdfBuilder(doc, font, bold);
    b.addPage();
    return b;
  }

  addPage(): void {
    this.page = this.doc.addPage([A4.w, A4.h]);
    this.y = A4.h - MARGIN;
  }

  private ensure(height: number): void {
    if (this.y - height < MARGIN + 30) this.addPage();
  }

  title(text: string): void {
    this.ensure(28);
    this.page.drawText(text, { x: MARGIN, y: this.y, size: 16, font: this.bold, color: BLACK });
    this.y -= 26;
  }

  heading(text: string): void {
    this.ensure(20);
    this.page.drawText(text, { x: MARGIN, y: this.y, size: 12, font: this.bold, color: BLACK });
    this.y -= 18;
  }

  text(text: string, opts: { size?: number; indent?: number; bold?: boolean; color?: ReturnType<typeof rgb> } = {}): void {
    const size = opts.size ?? 10;
    const f = opts.bold ? this.bold : this.font;
    const x = MARGIN + (opts.indent ?? 0);
    const maxWidth = A4.w - x - MARGIN;
    for (const line of wrap(text, f, size, maxWidth)) {
      this.ensure(size + 4);
      this.page.drawText(line, { x, y: this.y, size, font: f, color: opts.color ?? BLACK });
      this.y -= size + 4;
    }
  }

  keyVal(label: string, value: string): void {
    this.text(`${label} : ${value}`, { size: 10 });
  }

  spacer(h = 8): void {
    this.y -= h;
  }

  hr(): void {
    this.ensure(10);
    this.page.drawLine({
      start: { x: MARGIN, y: this.y },
      end: { x: A4.w - MARGIN, y: this.y },
      thickness: 0.5,
      color: GREY,
    });
    this.y -= 12;
  }

  /** Dessine un QR (PNG) à droite de la ligne courante, sans déplacer le curseur. */
  async qrRight(data: string, size = 48): Promise<void> {
    const png = await QRCode.toBuffer(data, { type: 'png', margin: 0, width: size * 3 });
    const img = await this.doc.embedPng(png);
    this.page.drawImage(img, { x: A4.w - MARGIN - size, y: this.y - size + 10, width: size, height: size });
  }

  async finalize(): Promise<Uint8Array> {
    const pages = this.doc.getPages();
    const total = pages.length;
    pages.forEach((p, i) => {
      const footer = `Gabarit ${TEMPLATE_VERSION} — page ${i + 1}/${total}`;
      p.drawText(footer, { x: MARGIN, y: MARGIN - 18, size: 8, font: this.font, color: GREY });
    });
    return this.doc.save();
  }
}

function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const out: string[] = [];
  for (const paragraph of text.split('\n')) {
    let line = '';
    for (const word of paragraph.split(/\s+/)) {
      const candidate = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) > maxWidth && line) {
        out.push(line);
        line = word;
      } else {
        line = candidate;
      }
    }
    out.push(line);
  }
  return out;
}
