import { Injectable } from '@angular/core';
import { CambioEppFormSnapshot } from './cambio-epp-solicitud.service';

export interface CambioEppPdfDespacho {
  nombre?: string;
  cargo?: string;
  fecha?: string;
}

/**
 * Genera el PDF de Cambio EPP (validación / despacho) con casillas de firma
 * e incluye el nombre de quien despacha cuando se indica.
 */
@Injectable({ providedIn: 'root' })
export class CambioEppPdfService {
  private readonly navy = '#1e3a8a';
  private readonly grey = '#f0f0f0';

  async generateBlob(
    snap: CambioEppFormSnapshot,
    opts?: { despacho?: CambioEppPdfDespacho; logoDataUrl?: string; businessName?: string }
  ): Promise<{ blob: Blob; fileName: string }> {
    const pdfMakeImport: any = await import('pdfmake/build/pdfmake');
    const pdfFontsImport: any = await import('pdfmake/build/vfs_fonts');
    const pdfMake: any = pdfMakeImport?.default || pdfMakeImport;
    const pdfFonts: any = pdfFontsImport?.default || pdfFontsImport;
    const vfs = pdfFonts?.pdfMake?.vfs || pdfFonts?.vfs;
    if (vfs) pdfMake.vfs = vfs;

    const navy = this.navy;
    const grey = this.grey;
    const f = snap || ({} as CambioEppFormSnapshot);
    const despachoNombre = String(opts?.despacho?.nombre || (f as any).despachadorNombre || '').trim();
    const despachoCargo = String(opts?.despacho?.cargo || (f as any).despachadorCargo || '').trim();
    const despachoFecha = String(opts?.despacho?.fecha || (f as any).fechaEntregaDespacho || '').trim();
    const empresa = (f.empresa || opts?.businessName || '—').toUpperCase();
    const tipoTxt = [f.tipoAcontecimiento, f.sectionLabel].filter(Boolean).join(' · ') || '—';

    const border = {
      hLineWidth: () => 1,
      vLineWidth: () => 1,
      hLineColor: () => navy,
      vLineColor: () => navy
    };
    const headerCell = (text: string): any => ({
      text, bold: true, color: '#fff', fillColor: navy, fontSize: 8, alignment: 'center', margin: [2, 4]
    });
    const labelCell = (text: string): any => ({
      text, bold: true, fillColor: grey, fontSize: 8, alignment: 'left', margin: [4, 4]
    });
    const valueCell = (text: string, opts2: any = {}): any => ({
      text: text || '—', fontSize: 8, alignment: opts2.align || 'center', margin: [4, 4], bold: !!opts2.bold
    });

    const docDefinition: any = {
      pageSize: 'A4',
      pageMargins: [28, 28, 28, 28],
      defaultStyle: { fontSize: 9, color: '#111' },
      content: [
        {
          table: {
            widths: ['*'],
            body: [[{
              stack: [
                {
                  table: {
                    widths: [90, '*'],
                    heights: [70],
                    body: [[
                      opts?.logoDataUrl
                        ? { image: opts.logoDataUrl, fit: [70, 60], alignment: 'center', margin: [4, 5] }
                        : {
                            text: empresa.slice(0, 28),
                            alignment: 'center', bold: true, color: navy, fontSize: 8, margin: [4, 18]
                          },
                      {
                        text: 'REPORTE DE SOLICITUD DE CAMBIO DE ELEMENTOS DE PROTECCIÓN PERSONAL',
                        alignment: 'center', bold: true, color: navy, fontSize: 12, margin: [8, 18]
                      }
                    ]]
                  },
                  layout: border
                },
                {
                  table: {
                    widths: ['*'],
                    body: [[{
                      text: 'DATOS ESPECÍFICOS (VALIDACIÓN INVENTARIO)',
                      bold: true, color: '#fff', fillColor: navy, fontSize: 9, alignment: 'center', margin: [2, 4]
                    }]]
                  },
                  layout: border
                },
                {
                  table: {
                    widths: ['14%', '18%', '20%', '22%', '26%'],
                    body: [[
                      labelCell('EMPRESA'),
                      valueCell(empresa, { align: 'left', bold: true }),
                      labelCell('TIPO / SECCIÓN'),
                      valueCell(tipoTxt, { align: 'left' }),
                      {
                        text: [
                          { text: 'N° de Reporte  ', bold: true, fontSize: 8 },
                          { text: f.nReporte || '—', fontSize: 9, bold: true }
                        ],
                        alignment: 'right',
                        margin: [4, 4]
                      }
                    ]]
                  },
                  layout: border
                },
                {
                  table: {
                    widths: ['25%', '25%', '25%', '25%'],
                    body: [
                      [
                        headerCell('NOMBRE DEL TRABAJADOR'),
                        headerCell('N° DE CÉDULA'),
                        headerCell('CARGO'),
                        headerCell('ÁREA')
                      ],
                      [
                        valueCell((f.nombreTrabajador || '—').toUpperCase()),
                        valueCell(f.cedula || '—'),
                        valueCell((f.cargo || '—').toUpperCase()),
                        valueCell(f.area || '—')
                      ]
                    ]
                  },
                  layout: border,
                  margin: [0, 1, 0, 0]
                },
                {
                  table: {
                    widths: ['34%', '33%', '33%'],
                    body: [
                      [
                        headerCell('ESTADO DE EPI'),
                        headerCell('FECHA ELABORACIÓN'),
                        headerCell('FECHA NOTIFICACIÓN')
                      ],
                      [
                        valueCell(f.estadoEpi || '—'),
                        valueCell(f.fechaElaboracion || '—'),
                        valueCell(f.fechaNotificacion || '—')
                      ]
                    ]
                  },
                  layout: border,
                  margin: [0, 1, 0, 0]
                },
                {
                  table: {
                    widths: ['*'],
                    body: [[{
                      text: 'OBSERVACIONES',
                      bold: true, color: '#fff', fillColor: navy, fontSize: 8, alignment: 'center', margin: [2, 3]
                    }]]
                  },
                  layout: border,
                  margin: [0, 1, 0, 0]
                },
                {
                  table: {
                    widths: ['*'],
                    heights: [70],
                    body: [[{ text: f.observaciones || ' ', fontSize: 8, bold: true, margin: [6, 6] }]]
                  },
                  layout: border
                },
                {
                  table: {
                    widths: ['25%', '25%', '20%', '30%'],
                    body: [[
                      headerCell('FECHA DE DOTACIÓN'),
                      valueCell(f.fechaDotacion || '—'),
                      headerCell('TALLA'),
                      valueCell(f.talla || '—')
                    ]]
                  },
                  layout: border
                },
                {
                  table: {
                    widths: ['28%', '22%', '18%', '32%'],
                    body: [[
                      headerCell('PERSONA QUE REPORTA'),
                      valueCell((f.nombreEmisor || '—').toUpperCase(), { align: 'left' }),
                      headerCell('CARGO'),
                      valueCell((f.cargoEmisor || '—').toUpperCase(), { align: 'left' })
                    ]]
                  },
                  layout: border,
                  margin: [0, 1, 0, 0]
                },
                {
                  unbreakable: true,
                  table: {
                    widths: ['*', '*', '*'],
                    heights: [120],
                    body: [[
                      {
                        stack: [
                          { canvas: [{ type: 'rect', x: 0, y: 0, w: 160, h: 68, color: '#ffffff', lineColor: '#ffffff' }], alignment: 'center' },
                          { canvas: [{ type: 'line', x1: 20, y1: 0, x2: 150, y2: 0, lineWidth: 1, lineColor: navy }], alignment: 'center' },
                          { text: 'FIRMA', alignment: 'center', bold: true, fontSize: 7, color: navy, margin: [0, 8, 0, 0] },
                          { text: 'SUPERVISOR DE SSA', alignment: 'center', bold: true, fontSize: 7, color: navy, margin: [0, 2, 0, 6] }
                        ],
                        margin: [4, 4, 4, 4]
                      },
                      {
                        stack: [
                          { canvas: [{ type: 'rect', x: 0, y: 0, w: 160, h: 68, color: '#ffffff', lineColor: '#ffffff' }], alignment: 'center' },
                          { canvas: [{ type: 'line', x1: 20, y1: 0, x2: 150, y2: 0, lineWidth: 1, lineColor: navy }], alignment: 'center' },
                          { text: 'NOMBRE Y FIRMA', alignment: 'center', bold: true, fontSize: 7, color: navy, margin: [0, 8, 0, 0] },
                          { text: 'SUPERVISOR DE ÁREA', alignment: 'center', bold: true, fontSize: 7, color: navy, margin: [0, 2, 0, 6] }
                        ],
                        margin: [4, 4, 4, 4]
                      },
                      {
                        stack: [
                          { canvas: [{ type: 'rect', x: 0, y: 0, w: 160, h: 52, color: '#ffffff', lineColor: '#ffffff' }], alignment: 'center' },
                          { canvas: [{ type: 'line', x1: 20, y1: 0, x2: 150, y2: 0, lineWidth: 1, lineColor: navy }], alignment: 'center' },
                          { text: 'FIRMA', alignment: 'center', bold: true, fontSize: 7, color: navy, margin: [0, 8, 0, 0] },
                          { text: 'PERSONA QUE DESPACHA EPP', alignment: 'center', bold: true, fontSize: 7, color: navy, margin: [0, 2, 0, 0] },
                          ...(despachoNombre
                            ? [
                                { text: despachoNombre.toUpperCase(), alignment: 'center', bold: true, fontSize: 8, color: navy, margin: [0, 4, 0, 0] },
                                ...(despachoCargo
                                  ? [{ text: despachoCargo, alignment: 'center', fontSize: 7, color: navy, margin: [0, 1, 0, 0] }]
                                  : [])
                              ]
                            : []),
                          {
                            columns: [
                              { text: 'Fecha de entrega:', fontSize: 7, bold: true, color: navy, width: 'auto' },
                              despachoFecha
                                ? { text: despachoFecha, fontSize: 8, bold: true, color: navy, width: '*', margin: [4, 0, 0, 0] }
                                : {
                                    canvas: [{ type: 'line', x1: 0, y1: 8, x2: 70, y2: 8, lineWidth: 0.8, lineColor: navy }],
                                    width: '*'
                                  }
                            ],
                            margin: [10, 10, 10, 4]
                          }
                        ],
                        margin: [4, 4, 4, 4]
                      }
                    ]]
                  },
                  layout: {
                    hLineWidth: () => 1,
                    vLineWidth: () => 1,
                    hLineColor: () => navy,
                    vLineColor: () => navy,
                    paddingLeft: () => 2,
                    paddingRight: () => 2,
                    paddingTop: () => 2,
                    paddingBottom: () => 2
                  },
                  margin: [0, 2, 0, 0]
                },
                {
                  text: 'Documento para firmar (SSA · Área · Quien despacha). Suba el PDF con las 3 firmas en Historial de Salidas para cerrar la entrega.',
                  fontSize: 7,
                  color: '#64748b',
                  margin: [4, 10, 4, 4]
                }
              ]
            }]]
          },
          layout: {
            hLineWidth: () => 2,
            vLineWidth: () => 2,
            hLineColor: () => navy,
            vLineColor: () => navy
          }
        }
      ]
    };

    const safeName = (f.nombreTrabajador || 'trabajador').replace(/[^\w\-]+/g, '_').slice(0, 40);
    const fileName = `${f.nReporte || 'REP'}_${safeName}_validacion.pdf`;
    const pdf = pdfMake.createPdf(docDefinition);
    const blob: Blob = await new Promise((resolve, reject) => {
      try {
        pdf.getBlob((b: Blob) => resolve(b));
      } catch (e) {
        reject(e);
      }
    });
    return { blob, fileName };
  }

  downloadBlob(blob: Blob, fileName: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  toFile(blob: Blob, fileName: string): File {
    return new File([blob], fileName, { type: 'application/pdf' });
  }
}
