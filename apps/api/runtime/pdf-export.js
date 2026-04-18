const fs = require("node:fs/promises");
const path = require("node:path");
const { PDFDocument, StandardFonts, rgb } = require("pdf-lib");
const fontkit = require("@pdf-lib/fontkit");

const PAGE_WIDTH = 841.89;
const PAGE_HEIGHT = 595.28;
const MARGIN = 32;
const HEADER_HEIGHT = 28;
const PERIOD_COLUMN = 64;
const GRID_ROWS = 6;
const GRID_COLUMNS = 5;

async function loadFont(pdfDoc) {
  pdfDoc.registerFontkit(fontkit);
  const candidates = [
    process.env.THAI_FONT_PATH,
    "assets/fonts/THSarabunNew.ttf",
    "C:/Windows/Fonts/THSarabun.ttf",
    "C:/Windows/Fonts/tahoma.ttf",
    "C:/Windows/Fonts/LeelawUI.ttf",
  ].filter(Boolean);

  for (const fontPath of candidates) {
    try {
      const fontBytes = await fs.readFile(fontPath);
      return pdfDoc.embedFont(fontBytes, { subset: true });
    } catch {
      // Try next font candidate.
    }
  }

  return pdfDoc.embedFont(StandardFonts.Helvetica);
}

function wrapText(font, text, size, maxWidth, maxLines = 6) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      current = candidate;
    } else {
      if (current) {
        lines.push(current);
      }
      current = word;
    }
  }

  if (current) {
    lines.push(current);
  }

  if (lines.length <= maxLines) {
    return lines;
  }

  const trimmed = lines.slice(0, maxLines);
  trimmed[maxLines - 1] = `${trimmed[maxLines - 1].slice(0, Math.max(0, trimmed[maxLines - 1].length - 3))}...`;
  return trimmed;
}

function drawCellText(page, font, text, x, y, width, height, size = 10.5, color = rgb(0.11, 0.16, 0.23)) {
  const paragraphs = String(text).split("\n");
  const lines = [];
  for (const paragraph of paragraphs) {
    if (!paragraph.trim()) {
      lines.push("");
      continue;
    }
    lines.push(...wrapText(font, paragraph, size, width - 8, 6));
  }

  const maxRenderableLines = Math.max(1, Math.floor((height - 8) / (size + 2)));
  const renderLines = lines.slice(0, maxRenderableLines);
  let cursorY = y + height - size - 6;
  for (const line of renderLines) {
    page.drawText(line, {
      x: x + 4,
      y: cursorY,
      size,
      font,
      color,
    });
    cursorY -= size + 2;
  }
}

async function generateTimetablePdfBuffer(payload) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const font = await loadFont(pdfDoc);
  const boldFont = font;

  const headerColor = rgb(0.07, 0.24, 0.48);
  const lineColor = rgb(0.8, 0.84, 0.9);
  const subtleFill = rgb(0.94, 0.96, 0.99);

  page.drawText(payload.school_name, {
    x: MARGIN,
    y: PAGE_HEIGHT - 38,
    size: 22,
    font: boldFont,
    color: headerColor,
  });

  page.drawText(payload.report_title, {
    x: MARGIN,
    y: PAGE_HEIGHT - 62,
    size: 14,
    font,
    color: rgb(0.22, 0.3, 0.4),
  });

  page.drawText(
    `ระดับ ${payload.education_level} | รายการ ${payload.section_name} | ภาคเรียน ${payload.term} | ปีการศึกษา ${payload.academic_year}`,
    {
      x: MARGIN,
      y: PAGE_HEIGHT - 82,
      size: 11,
      font,
      color: rgb(0.35, 0.43, 0.54),
    },
  );

  const tableTop = PAGE_HEIGHT - 116;
  const tableWidth = PAGE_WIDTH - MARGIN * 2;
  const cellWidth = (tableWidth - PERIOD_COLUMN) / GRID_COLUMNS;
  const rowHeight = 58;

  page.drawRectangle({
    x: MARGIN,
    y: tableTop - HEADER_HEIGHT,
    width: tableWidth,
    height: HEADER_HEIGHT,
    color: headerColor,
  });

  const dayLabels = ["จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์"];
  page.drawText("คาบ", { x: MARGIN + 18, y: tableTop - 19, size: 11, font, color: rgb(1, 1, 1) });
  dayLabels.forEach((label, index) => {
    page.drawText(label, {
      x: MARGIN + PERIOD_COLUMN + cellWidth * index + 12,
      y: tableTop - 19,
      size: 11,
      font,
      color: rgb(1, 1, 1),
    });
  });

  payload.matrix.forEach((row, rowIndex) => {
    const y = tableTop - HEADER_HEIGHT - rowHeight * (rowIndex + 1);
    page.drawRectangle({
      x: MARGIN,
      y,
      width: PERIOD_COLUMN,
      height: rowHeight,
      color: subtleFill,
      borderColor: lineColor,
      borderWidth: 1,
    });
    page.drawText(`คาบ ${rowIndex + 1}`, {
      x: MARGIN + 12,
      y: y + rowHeight / 2 - 6,
      size: 11,
      font,
      color: rgb(0.16, 0.22, 0.32),
    });

    row.forEach((cell, columnIndex) => {
      const x = MARGIN + PERIOD_COLUMN + cellWidth * columnIndex;
      page.drawRectangle({
        x,
        y,
        width: cellWidth,
        height: rowHeight,
        color: rowIndex % 2 === 0 ? rgb(1, 1, 1) : rgb(0.97, 0.98, 1),
        borderColor: lineColor,
        borderWidth: 1,
      });
      drawCellText(page, font, cell, x, y, cellWidth, rowHeight);
    });
  });

  page.drawText(`วันที่พิมพ์เอกสาร: ${payload.printed_at}`, {
    x: MARGIN,
    y: 78,
    size: 11,
    font,
    color: rgb(0.22, 0.3, 0.4),
  });

  const signatories = payload.signatories || [];
  const signatureWidth = (tableWidth - 20) / 3;
  signatories.slice(0, 3).forEach((signatory, index) => {
    const x = MARGIN + index * (signatureWidth + 10);
    page.drawLine({
      start: { x: x + 12, y: 52 },
      end: { x: x + signatureWidth - 12, y: 52 },
      thickness: 1,
      color: rgb(0.35, 0.43, 0.54),
    });
    page.drawText(signatory.name || "........................................", {
      x: x + 14,
      y: 34,
      size: 10,
      font,
      color: rgb(0.22, 0.3, 0.4),
    });
    page.drawText(signatory.title || "", {
      x: x + 14,
      y: 18,
      size: 10,
      font,
      color: rgb(0.22, 0.3, 0.4),
    });
  });

  return pdfDoc.save();
}

module.exports = {
  generateTimetablePdfBuffer,
};
