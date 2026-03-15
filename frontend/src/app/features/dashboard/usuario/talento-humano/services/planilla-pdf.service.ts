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
    E:   [255, 228, 230],  // rojo claro
  };

  private readonly DAY_TEXT_COLORS: Record<string, [number,number,number]> = {
    T:   [37,  99,  235],
    D:   [71,  85,  105],
    EX:  [234, 88,   12],
    V:   [37,  99,  235],
    P:   [217, 119,   6],
    E:   [225, 29,   72],
  };

  generate(opts: PdfOptions): void {
    const { businessName, businessRuc, year, month, monthLabel, sheet, dayTypeKeys } = opts;
    const daysCount = new Date(year, month, 0).getDate();

    // ── Orientación landscape A4 ──────────────────────────────────────────
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();   // 297
    const pageH = doc.internal.pageSize.getHeight();  // 210
    const margin = 5;

    // ── HEADER ────────────────────────────────────────────────────────────
    this.drawHeader(doc, businessName, businessRuc, year, month, monthLabel, pageW, margin, opts.logoBase64);

    // ── LEYENDA DE TIPOS ──────────────────────────────────────────────────
    const legendY = 28;
    this.drawLegend(doc, dayTypeKeys, legendY, margin);

    // ── TABLA ─────────────────────────────────────────────────────────────
    const tableStartY = 36;
    this.drawTable(doc, sheet, dayTypeKeys, daysCount, year, month, tableStartY, margin, pageW, pageH);

    // ── PIE DE PÁGINA ─────────────────────────────────────────────────────
    this.drawFooter(doc, businessName, year, month, monthLabel);

    // ── GUARDAR ───────────────────────────────────────────────────────────
    const fileName = `Planilla_${businessName.replace(/\s+/g,'_')}_${year}_${String(month).padStart(2,'0')}.pdf`;
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
    doc.setDrawColor(0);
    doc.setLineWidth(0.3);
    doc.rect(margin, margin, pageW - margin * 2, hH);

    // ── Logo / nombre empresa (25% izquierda) ──
    const logoW = (pageW - margin * 2) * 0.22;
    doc.setDrawColor(0);
    doc.line(margin + logoW, margin, margin + logoW, margin + hH);

    if (logoBase64) {
      try {
        doc.addImage(logoBase64, 'JPEG', margin + 2, margin + 2, logoW - 4, hH - 4);
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
    doc.line(rightX, margin, rightX, margin + hH);

    doc.setFillColor(15, 23, 42);
    doc.rect(rightX, margin, rightW, hH / 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    doc.text(String(year), rightX + rightW / 2, margin + hH / 4 + 2, { align: 'center' });

    doc.setFillColor(30, 41, 59);
    doc.rect(rightX, margin + hH / 2, rightW, hH / 2, 'F');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
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
  private drawLegend(doc: jsPDF, keys: DayType[], y: number, margin: number): void {
    const labels: Record<string, string> = {
      T: 'T — Trabajo normal',
      D: 'D — Descanso',
      EX: 'EX — Horas extra',
      V: 'V — Vacaciones',
      P: 'P — Permiso',
      E: 'E — Enfermedad',
    };
    let x = margin;
    doc.setFontSize(6.5);
    keys.forEach(k => {
      const [br, bg, bb] = this.DAY_COLORS[k] ?? [230, 230, 230];
      const [tr, tg, tb] = this.DAY_TEXT_COLORS[k] ?? [0, 0, 0];
      doc.setFillColor(br, bg, bb);
      doc.setDrawColor(200, 200, 200);
      doc.roundedRect(x, y, 42, 5, 1, 1, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(tr, tg, tb);
      doc.text(labels[k] ?? k, x + 21, y + 3.5, { align: 'center' });
      x += 44;
    });
  }

  // ────────────────────────────────────────────────────────────────────────
  private drawTable(
    doc: jsPDF,
    sheet: EmployeeSheetRow[],
    dayTypeKeys: DayType[],
    daysCount: number,
    year: number,
    month: number,
    startY: number,
    margin: number,
    pageW: number,
    pageH: number
  ): void {
    // Nombres de día de semana abreviados (L/M/X/J/V/S/D)
    const DAY_LETTER = ['D','L','M','X','J','V','S'];

    // ── Encabezados ──────────────────────────────────────────────────────
    const fixedHeaders = ['#', 'Personal', 'Cargo'];
    const dayHeaders   = Array.from({ length: daysCount }, (_, i) => {
      const d = i + 1;
      const dow = new Date(year, month - 1, d).getDay();
      return `${d}\n${DAY_LETTER[dow]}`;
    });
    const totHeaders   = dayTypeKeys.map(k => k);
    const head         = [[...fixedHeaders, ...dayHeaders, ...totHeaders]];

    // ── Filas ────────────────────────────────────────────────────────────
    const body = sheet.map((row, idx) => {
      const fixed = [
        String(idx + 1),
        row.fullName,
        row.position ?? '',
      ];
      const days = Array.from({ length: daysCount }, (_, i) => row.days[i]?.dayType ?? '');
      const totals = dayTypeKeys.map(k => String((row.totals as any)[k] ?? 0));
      return [...fixed, ...days, ...totals];
    });

    // ── Fila de TOTALES ──────────────────────────────────────────────────
    const totalRow: string[] = ['', 'TOTALES', ''];
    for (let d = 0; d < daysCount; d++) {
      const countForDay = sheet.filter(r => r.days[d]?.dayType === 'T').length;
      totalRow.push(countForDay > 0 ? String(countForDay) : '');
    }
    dayTypeKeys.forEach(k => {
      const sum = sheet.reduce((acc, r) => acc + ((r.totals as any)[k] ?? 0), 0);
      totalRow.push(String(sum));
    });
    body.push(totalRow);

    // ── Anchos de columna ─────────────────────────────────────────────────
    const usable    = pageW - margin * 2;
    const nameW     = 38;
    const posW      = 22;
    const indexW    = 5;
    const totW      = 5.5;
    const dayW      = Math.max(
      3.5,
      (usable - nameW - posW - indexW - totW * dayTypeKeys.length) / daysCount
    );
    const columnStyles: any = {
      0: { cellWidth: indexW, halign: 'center' },
      1: { cellWidth: nameW,  halign: 'left' },
      2: { cellWidth: posW,   halign: 'left' },
    };
    for (let i = 0; i < daysCount; i++) {
      columnStyles[3 + i] = { cellWidth: dayW, halign: 'center' };
    }
    for (let i = 0; i < dayTypeKeys.length; i++) {
      columnStyles[3 + daysCount + i] = { cellWidth: totW, halign: 'center' };
    }

    // ── Colorear celdas de días según tipo ────────────────────────────────
    autoTable(doc, {
      head,
      body,
      startY,
      margin: { left: margin, right: margin },
      tableWidth: 'auto',
      styles: {
        fontSize: 5.5,
        cellPadding: { top: 0.8, bottom: 0.8, left: 0.5, right: 0.5 },
        lineColor: [200, 210, 220],
        lineWidth: 0.15,
        overflow: 'linebreak',
        minCellHeight: 5,
      },
      headStyles: {
        fillColor:   [15, 23, 42],
        textColor:   [255, 255, 255],
        fontStyle:   'bold',
        fontSize:    5.5,
        halign:      'center',
        valign:      'middle',
        minCellHeight: 7,
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      columnStyles,
      didParseCell: (data: any) => {
        const { section, column, row: rowData, cell } = data;
        if (section !== 'body') return;

        // ── Fila de totales (última fila)
        if (rowData.index === body.length - 1) {
          cell.styles.fillColor   = [15, 23, 42];
          cell.styles.textColor   = [255, 255, 255];
          cell.styles.fontStyle   = 'bold';
          cell.styles.fontSize    = 6;
          return;
        }

        // ── Celdas de días (columna 3 … 3+daysCount-1)
        const colIdx = column.index;
        if (colIdx >= 3 && colIdx < 3 + daysCount) {
          const val = cell.raw as string;
          if (val && this.DAY_COLORS[val]) {
            const [br, bg, bb] = this.DAY_COLORS[val];
            const [tr, tg, tb] = this.DAY_TEXT_COLORS[val];
            cell.styles.fillColor = [br, bg, bb];
            cell.styles.textColor = [tr, tg, tb];
            cell.styles.fontStyle = 'bold';
          }
        }

        // ── Celdas de totales (últimas columnas)
        if (colIdx >= 3 + daysCount) {
          const keyIdx = colIdx - 3 - daysCount;
          const key    = dayTypeKeys[keyIdx];
          if (key && this.DAY_COLORS[key]) {
            const [br, bg, bb] = this.DAY_COLORS[key];
            cell.styles.fillColor = [br, bg, bb];
            cell.styles.textColor = this.DAY_TEXT_COLORS[key] ?? [0, 0, 0];
            cell.styles.fontStyle = 'bold';
          }
        }

        // ── Primera y segunda columna: texto más oscuro
        if (colIdx === 1) {
          cell.styles.fontStyle = 'bold';
          cell.styles.fontSize  = 6;
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
    }
  }
}
