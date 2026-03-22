import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { EmployeeSheetRow, DayType } from './attendance.service';

export interface PdfOptions {
  businessName: string;
  businessRuc?: string;
  year: number;
  month: number;
  monthLabel: string;
  sheet: EmployeeSheetRow[];
  dayTypeKeys: DayType[];
  logoBase64?: string;
  /** Si true (planilla cerrada/aprobada): PDF resumido — solo días efectivos trabajados (T+EX) y total, sin leyenda de todos los tipos. */
  monthClosed?: boolean;
}

@Injectable({ providedIn: 'root' })
export class PlanillaPdfService {

  private readonly MONTH_NAMES = [
    'Enero','Febrero','Marzo','Abril','Mayo','Junio',
    'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'
  ];

  private readonly DAY_COLORS: Record<string, [number,number,number]> = {
    T:   [219, 234, 254],  // azul claro
    D:   [226, 232, 240],  // gris
    EX:  [255, 237, 213],  // naranja claro
    V:   [219, 234, 254],  // azul
    P:   [254, 243, 199],  // amarillo
    E:   [255, 228, 230],  // rojo claro (enfermedad)
    A:   [254, 215, 215],  // rojo suave (accidente — distinto de E)
  };

  private readonly DAY_TEXT_COLORS: Record<string, [number,number,number]> = {
    T:   [37,  99,  235],
    D:   [71,  85,  105],
    EX:  [234, 88,   12],
    V:   [37,  99,  235],
    P:   [217, 119,   6],
    E:   [225, 29,   72],
    A:   [127, 29,  29],
  };

  /** Marca visual en PDF de mes cerrado (día efectivo = T o EX) */
  private readonly EFFECTIVE_DAY_MARK = '•';
  private readonly EFFECTIVE_DAY_FILL: [number, number, number] = [209, 250, 229];
  private readonly EFFECTIVE_DAY_TEXT: [number, number, number] = [22, 101, 52];

  /** Paleta PDF (sin negro puro): encabezados, pies y bordes */
  private readonly PDF_HEADER_BG: [number, number, number] = [71, 85, 105];   // slate-600
  private readonly PDF_HEADER_BG2: [number, number, number] = [100, 116, 139]; // slate-500
  private readonly PDF_BORDER_STRONG: [number, number, number] = [71, 85, 105];
  private readonly PDF_GRID_LINE: [number, number, number] = [100, 116, 139];

  generate(opts: PdfOptions): void {
    const { businessName, businessRuc, year, month, monthLabel, sheet, dayTypeKeys } = opts;
    const monthClosed = !!opts.monthClosed;
    const daysCount = new Date(year, month, 0).getDate();

    // ── Orientación landscape A4 ──────────────────────────────────────────
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();   // 297
    const pageH = doc.internal.pageSize.getHeight();  // 210
    const margin = 5;

    // ── HEADER ────────────────────────────────────────────────────────────
    this.drawHeader(doc, businessName, businessRuc, year, month, monthLabel, pageW, margin, opts.logoBase64);

    // ── LEYENDA (varias filas si hace falta; mes cerrado = texto resumido) ─
    const legendY = 28;
    const legendBottom = this.drawLegend(doc, dayTypeKeys, legendY, margin, pageW, monthClosed);

    // ── TABLA ─────────────────────────────────────────────────────────────
    const tableStartY = legendBottom + 3;
    this.drawTable(
      doc,
      sheet,
      daysCount,
      year,
      month,
      tableStartY,
      margin,
      pageW,
      pageH,
      monthClosed
    );

    // ── PIE DE PÁGINA ─────────────────────────────────────────────────────
    this.drawFooter(doc, businessName, year, month, monthLabel);

    // ── GUARDAR ───────────────────────────────────────────────────────────
    const suffix = monthClosed ? '_cerrada' : '';
    const fileName = `Planilla_${businessName.replace(/\s+/g,'_')}_${year}_${String(month).padStart(2,'0')}${suffix}.pdf`;
    doc.save(fileName);
  }

  // ────────────────────────────────────────────────────────────────────────
  private drawHeader(
    doc: jsPDF,
    businessName: string,
    businessRuc: string | undefined,
    year: number,
    month: number,
    monthLabel: string,
    pageW: number,
    margin: number,
    logoBase64?: string
  ): void {
    const hH = 24; // height del header box

    // Borde exterior del header
    doc.setDrawColor(...this.PDF_BORDER_STRONG);
    doc.setLineWidth(0.45);
    doc.rect(margin, margin, pageW - margin * 2, hH);

    // ── Logo / nombre empresa (25% izquierda) ──
    const logoW = (pageW - margin * 2) * 0.22;
    doc.setDrawColor(...this.PDF_GRID_LINE);
    doc.setLineWidth(0.35);
    doc.line(margin + logoW, margin, margin + logoW, margin + hH);

    if (logoBase64) {
      try {
        const fmt = logoBase64.startsWith('data:image/png') ? 'PNG'
                   : (logoBase64.startsWith('data:image/jpeg') || logoBase64.startsWith('data:image/jpg')) ? 'JPEG'
                   : 'JPEG';
        doc.addImage(logoBase64, fmt as any, margin + 2, margin + 2, logoW - 4, hH - 4);
      } catch {
        this.drawLogoFallback(doc, businessName, margin, margin + hH / 2, logoW);
      }
    } else {
      this.drawLogoFallback(doc, businessName, margin, margin + hH / 2, logoW);
    }

    // ── Título central (50%) ──
    const titleX = margin + logoW;
    const titleW  = (pageW - margin * 2) * 0.56;
    doc.setFillColor(241, 245, 249);
    doc.rect(titleX, margin, titleW, hH, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('CONTROL DE ASISTENCIA MENSUAL', titleX + titleW / 2, margin + 8, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85);
    doc.text(`${businessName.toUpperCase()}`, titleX + titleW / 2, margin + 14, { align: 'center' });

    if (businessRuc) {
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text(`RUC: ${businessRuc}`, titleX + titleW / 2, margin + 19, { align: 'center' });
    }

    // ── Panel derecho (año/mes) ──
    const rightX = titleX + titleW;
    const rightW = pageW - margin - rightX;
    doc.setDrawColor(...this.PDF_GRID_LINE);
    doc.setLineWidth(0.35);
    doc.line(rightX, margin, rightX, margin + hH);

    doc.setFillColor(...this.PDF_HEADER_BG);
    doc.rect(rightX, margin, rightW, hH / 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    doc.text(String(year), rightX + rightW / 2, margin + hH / 4 + 2, { align: 'center' });

    doc.setFillColor(...this.PDF_HEADER_BG2);
    doc.rect(rightX, margin + hH / 2, rightW, hH / 2, 'F');
    doc.setFontSize(8);
    doc.setTextColor(241, 245, 249);
    doc.text(monthLabel.toUpperCase(), rightX + rightW / 2, margin + hH * 0.75 + 1, { align: 'center' });
  }

  private drawLogoFallback(doc: jsPDF, name: string, x: number, y: number, w: number): void {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(15, 23, 42);
    const lines = doc.splitTextToSize(name.toUpperCase(), w - 4);
    doc.text(lines, x + w / 2, y, { align: 'center', baseline: 'middle' });
  }

  // ────────────────────────────────────────────────────────────────────────
  /** Devuelve la coordenada Y inferior de la leyenda (para posicionar la tabla). */
  private drawLegend(
    doc: jsPDF,
    keys: DayType[],
    y: number,
    margin: number,
    pageW: number,
    monthClosed: boolean
  ): number {
    const usableW = pageW - margin * 2;

    if (monthClosed) {
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(51, 65, 85);
      const msg =
        'Mes cerrado — Resumen de días efectivos: cada “•” es un día trabajado (jornada normal o horas extra). ' +
        'No se muestran indicadores de descanso, vacaciones, permisos, enfermedad ni accidente. ' +
        'La última columna es el total de días efectivos del empleado.';
      const lines = doc.splitTextToSize(msg, usableW);
      doc.text(lines, margin, y + 3.5);
      return y + lines.length * 3.6 + 2;
    }

    // Texto compacto en 2 líneas, centrado (más limpio en PDF)
    const labels: Record<string, string> = {
      T: 'T\nTrabajo',
      D: 'D\nDescanso',
      EX: 'EX\nExtra',
      V: 'V\nVacaciones',
      P: 'P\nPermiso',
      E: 'E\nEnfermedad',
      A: 'A\nAccidente',
    };

    const boxW = 27;
    const boxH = 5.4;
    const gap = 1.2;
    let x = margin;
    let rowY = y;

    doc.setFontSize(5);
    keys.forEach(k => {
      if (x + boxW > margin + usableW + 0.5) {
        x = margin;
        rowY += boxH + gap + 0.4;
      }
      const [br, bg, bb] = this.DAY_COLORS[k] ?? [230, 230, 230];
      const [tr, tg, tb] = this.DAY_TEXT_COLORS[k] ?? [0, 0, 0];
      doc.setFillColor(br, bg, bb);
      doc.setDrawColor(...this.PDF_BORDER_STRONG);
      doc.setLineWidth(0.3);
      doc.roundedRect(x, rowY, boxW, boxH, 0.5, 0.5, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(tr, tg, tb);
      const line = labels[k] ?? String(k);
      const split = doc.splitTextToSize(line, boxW - 1.6);
      const lineH = 1.85;
      const textStartY = rowY + (boxH - split.length * lineH) / 2 + lineH - 0.15;
      doc.text(split, x + boxW / 2, textStartY, { align: 'center' });
      x += boxW + gap;
    });

    return rowY + boxH + 2;
  }

  // ────────────────────────────────────────────────────────────────────────
  private drawTable(
    doc: jsPDF,
    sheet: EmployeeSheetRow[],
    daysCount: number,
    year: number,
    month: number,
    startY: number,
    margin: number,
    pageW: number,
    pageH: number,
    monthClosed: boolean
  ): void {
    // Nombres de día de semana abreviados (L/M/X/J/V/S/D)
    const DAY_LETTER = ['D','L','M','X','J','V','S'];

    // PDF: sin columnas resumen T/D/EX/… (solo calendario; mes cerrado conserva “Días efectivos”)
    const totCount = monthClosed ? 1 : 0;
    const totW = 14;

    // ── Encabezados ──────────────────────────────────────────────────────
    const fixedHeaders = ['#', 'Personal', 'Cargo'];
    const dayHeaders   = Array.from({ length: daysCount }, (_, i) => {
      const d = i + 1;
      const dow = new Date(year, month - 1, d).getDay();
      return `${d}\n${DAY_LETTER[dow]}`;
    });
    const totHeaders: string[] = monthClosed ? ['Días efectivos'] : [];
    const head = [[...fixedHeaders, ...dayHeaders, ...totHeaders]];

    // ── Filas ────────────────────────────────────────────────────────────
    const body = sheet.map((row, idx) => {
      const fixed = [
        String(idx + 1),
        row.cedula ? `${row.fullName}\n${row.cedula}` : row.fullName,
        row.position ?? '',
      ];
      const days = Array.from({ length: daysCount }, (_, i) => {
        const t = (row.days[i]?.dayType ?? '') as string;
        if (!monthClosed) return t;
        return t === 'T' || t === 'EX' ? this.EFFECTIVE_DAY_MARK : '';
      });
      const totals = monthClosed
        ? [String((row.totals?.T ?? 0) + (row.totals?.EX ?? 0))]
        : [];
      return [...fixed, ...days, ...totals];
    });

    // ── Fila de TOTALES (solo columnas de días + opcional días efectivos) ─
    const totalRow: string[] = ['', 'TOTALES', ''];
    for (let d = 0; d < daysCount; d++) {
      const countForDay = monthClosed
        ? sheet.filter(r => {
            const t = r.days[d]?.dayType;
            return t === 'T' || t === 'EX';
          }).length
        : sheet.filter(r => r.days[d]?.dayType === 'T').length;
      totalRow.push(countForDay > 0 ? String(countForDay) : '');
    }
    if (monthClosed) {
      const sumEff = sheet.reduce(
        (acc, r) => acc + (r.totals?.T ?? 0) + (r.totals?.EX ?? 0),
        0
      );
      totalRow.push(String(sumEff));
    }
    body.push(totalRow);

    // ── Anchos de columna ─────────────────────────────────────────────────
    const usable    = pageW - margin * 2;
    const nameW     = 38;
    const posW      = 22;
    const indexW    = 5;
    const dayW      = Math.max(
      3.5,
      (usable - nameW - posW - indexW - totW * totCount) / daysCount
    );
    const columnStyles: any = {
      0: { cellWidth: indexW, halign: 'center' },
      1: { cellWidth: nameW,  halign: 'left' },
      2: { cellWidth: posW,   halign: 'left' },
    };
    for (let i = 0; i < daysCount; i++) {
      columnStyles[3 + i] = { cellWidth: dayW, halign: 'center' };
    }
    for (let i = 0; i < totCount; i++) {
      columnStyles[3 + daysCount + i] = { cellWidth: totW, halign: 'center' };
    }

    // ── Tabla: rejilla visible y tonos corporativos (sin negro puro) ─────
    autoTable(doc, {
      head,
      body,
      startY,
      theme: 'grid',
      margin: { left: margin, right: margin, bottom: 42 },
      tableWidth: 'auto',
      styles: {
        fontSize: 5.5,
        cellPadding: { top: 0.8, bottom: 0.8, left: 0.5, right: 0.5 },
        lineColor: [...this.PDF_GRID_LINE],
        lineWidth: 0.3,
        overflow: 'linebreak',
        minCellHeight: 5,
      },
      headStyles: {
        fillColor: [...this.PDF_HEADER_BG],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 5.5,
        halign: 'center',
        valign: 'middle',
        minCellHeight: 7,
        lineColor: [...this.PDF_BORDER_STRONG],
        lineWidth: 0.35,
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
        lineColor: [...this.PDF_GRID_LINE],
        lineWidth: 0.3,
      },
      columnStyles,
      didParseCell: (data: any) => {
        const { section, column, row: rowData, cell } = data;

        if (section === 'head') {
          cell.styles.lineColor = [...this.PDF_BORDER_STRONG];
          cell.styles.lineWidth = 0.35;
          return;
        }

        if (section !== 'body') return;

        const colIdx = column.index;
        cell.styles.lineColor = [...this.PDF_GRID_LINE];
        cell.styles.lineWidth = 0.3;

        // ── Fila de totales (última fila)
        if (rowData.index === body.length - 1) {
          cell.styles.fillColor = [...this.PDF_HEADER_BG];
          cell.styles.textColor = [255, 255, 255];
          cell.styles.fontStyle = 'bold';
          cell.styles.fontSize = 6;
          cell.styles.lineColor = [...this.PDF_BORDER_STRONG];
          cell.styles.lineWidth = 0.35;
          return;
        }

        // ── Celdas de días (columna 3 … 3+daysCount-1)
        if (colIdx >= 3 && colIdx < 3 + daysCount) {
          const val = cell.raw as string;
          if (monthClosed && val === this.EFFECTIVE_DAY_MARK) {
            cell.styles.fillColor = this.EFFECTIVE_DAY_FILL;
            cell.styles.textColor = this.EFFECTIVE_DAY_TEXT;
            cell.styles.fontStyle = 'bold';
            cell.styles.fontSize = 7;
            return;
          }
          if (val && this.DAY_COLORS[val]) {
            const [br, bg, bb] = this.DAY_COLORS[val];
            const [tr, tg, tb] = this.DAY_TEXT_COLORS[val];
            cell.styles.fillColor = [br, bg, bb];
            cell.styles.textColor = [tr, tg, tb];
            cell.styles.fontStyle = 'bold';
          }
          return;
        }

        // ── Columna “Días efectivos” (solo mes cerrado)
        if (monthClosed && colIdx >= 3 + daysCount) {
          cell.styles.fillColor = [236, 253, 245];
          cell.styles.textColor = [22, 101, 52];
          cell.styles.fontStyle = 'bold';
          return;
        }

        // ── Primera y segunda columna: texto más oscuro
        if (colIdx === 1) {
          cell.styles.fontStyle = 'bold';
          cell.styles.fontSize = 6;
        }
      },
    });
  }

  // ────────────────────────────────────────────────────────────────────────
  private drawFooter(
    doc: jsPDF,
    businessName: string,
    year: number,
    month: number,
    monthLabel: string
  ): void {
    const pageCount = (doc.internal as any).getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const y     = pageH - 6;

      doc.setFontSize(6);
      doc.setTextColor(148, 163, 184);
      doc.setFont('helvetica', 'normal');
      doc.text(
        `${businessName} — Control de Asistencia ${monthLabel} ${year}`,
        10, y
      );
      doc.text(
        `Generado el ${new Date().toLocaleDateString('es-EC')} — Pág. ${i} / ${pageCount}`,
        pageW - 10, y, { align: 'right' }
      );
      // Línea separadora del pie
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.2);
      doc.line(5, y - 2, pageW - 5, y - 2);

      // ── Firma(s) en última página ─────────────────────────────────────
      if (i === pageCount) {
        const blockTop = pageH - 38; // zona de firmas encima del pie
        const blockHeight = 22;
        const padding = 4;
        const colW = (pageW - 10 - 2 * padding) / 3; // tres columnas, respetando márgenes
        const startX = 5 + padding;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(100, 116, 139);

        const labels = [
          { title: 'Elaborado por:', hint: 'Firma Digital' },
          { title: 'Recibido y Revisado por:', hint: 'Firma Digital' },
          { title: 'Aprobado por:', hint: 'Firma Digital' },
        ];

        labels.forEach((lb, idx) => {
          const x = startX + idx * colW;
          // línea de firma
          const lineY = blockTop + blockHeight - 8;
          doc.setDrawColor(148, 163, 184);
          doc.setLineWidth(0.3);
          doc.line(x + 6, lineY, x + colW - 6, lineY);

          // hint superior (gris)
          doc.setFont('helvetica', 'italic');
          doc.setFontSize(6);
          doc.setTextColor(148, 163, 184);
          doc.text(lb.hint, x + colW / 2, lineY - 5, { align: 'center' });

          // etiqueta en negrita
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);
          doc.setTextColor(...this.PDF_HEADER_BG);
          doc.text(lb.title, x + colW / 2, lineY + 4, { align: 'center' });
        });
      }
    }
  }
}
