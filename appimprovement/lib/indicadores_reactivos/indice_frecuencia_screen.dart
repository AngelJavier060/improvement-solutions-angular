import 'package:flutter/material.dart';

import '../models/safety_indices_summary.dart';
import '../services/business_service.dart';
import '../services/safety_indices_service.dart';

/// IF = (lesiones / horas) × 200.000 — misma fuente que Angular `indice-frecuencia`.
class IndiceFrecuenciaScreen extends StatefulWidget {
  const IndiceFrecuenciaScreen({super.key});

  @override
  State<IndiceFrecuenciaScreen> createState() => _IndiceFrecuenciaScreenState();
}

class _IndiceFrecuenciaScreenState extends State<IndiceFrecuenciaScreen> {
  static const double _factorOsha = 200000;
  static const double _metaIf = 0.25;

  final _svc = SafetyIndicesService();
  bool _loading = true;
  String? _error;
  int _year = DateTime.now().year;
  SafetyIndicesSummary? _data;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    final id = await BusinessService().resolvePrimaryBusinessId();
    if (id == null) {
      setState(() {
        _loading = false;
        _error = 'No se pudo obtener el ID de la empresa. Verifique su sesión.';
      });
      return;
    }
    final data = await _svc.getSafetyIndices(id, _year);
    if (!mounted) return;
    setState(() {
      _data = data;
      _loading = false;
      _error = data == null ? 'Error al cargar índices' : null;
    });
  }

  String _fmtHours(double h) {
    if (h >= 1000000) return '${(h / 1000000).toStringAsFixed(1)}M';
    if (h >= 1000) return '${(h / 1000).toStringAsFixed(1)}K';
    return h.toStringAsFixed(0);
  }

  /// La API puede devolver solo meses con datos; el gráfico muestra siempre ENE–DIC.
  static List<SafetyIndicesMonth> _monthsForFullYear(List<SafetyIndicesMonth> api, int year) {
    const short = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
    final byMonth = {for (final m in api) m.month: m};
    return List.generate(12, (i) {
      final monthNum = i + 1;
      final ex = byMonth[monthNum];
      if (ex != null) return ex;
      return SafetyIndicesMonth(
        month: monthNum,
        label: short[i],
        mesAnio: '${short[i]} $year',
        lesiones: 0,
        diasPerdidos: 0,
        horasHombre: 0,
        ifVal: 0,
        trif: 0,
        ig: 0,
        tr: 0,
        incidentes: const [],
      );
    });
  }

  @override
  Widget build(BuildContext context) {
    final ytd = _data?.ytd;
    final apiMonths = _data?.months ?? [];
    final months = ytd != null ? _monthsForFullYear(apiMonths, _year) : apiMonths;
    final maxIf = months.fold<double>(_metaIf, (m, x) => x.ifVal > m ? x.ifVal : m);

    return Scaffold(
      backgroundColor: const Color(0xFFF5F7F9),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Color(0xFF2563EB)),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text('Índice de Frecuencia', style: TextStyle(color: Color(0xFF0050D4), fontWeight: FontWeight.bold)),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(4),
          child: Align(
            alignment: Alignment.centerRight,
            child: Container(width: 48, height: 4, margin: const EdgeInsets.only(right: 16), color: const Color(0xFF0050D4)),
          ),
        ),
      ),
      body: RefreshIndicator(
        onRefresh: _load,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Row(
              children: [
                const Text('Año: ', style: TextStyle(fontWeight: FontWeight.w600)),
                DropdownButton<int>(
                  value: _year,
                  items: [DateTime.now().year, DateTime.now().year - 1, DateTime.now().year - 2]
                      .map((y) => DropdownMenuItem(value: y, child: Text('$y')))
                      .toList(),
                  onChanged: (v) {
                    if (v != null) {
                      setState(() => _year = v);
                      _load();
                    }
                  },
                ),
              ],
            ),
            if (_loading)
              const Padding(padding: EdgeInsets.all(40), child: Center(child: CircularProgressIndicator()))
            else if (_error != null)
              Text(_error!, style: const TextStyle(color: Colors.red))
            else if (ytd != null) ...[
              Container(
                padding: const EdgeInsets.fromLTRB(16, 14, 16, 14),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFF0050D4), Color(0xFF5B7CFA)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(14),
                  boxShadow: const [BoxShadow(color: Color(0x280050D4), blurRadius: 10, offset: Offset(0, 4))],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('IF acumulado · $_year', style: TextStyle(color: Colors.white.withValues(alpha: 0.85), fontSize: 12, fontWeight: FontWeight.w600)),
                        Icon(Icons.query_stats, color: Colors.white.withValues(alpha: 0.9), size: 20),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.baseline,
                      textBaseline: TextBaseline.alphabetic,
                      children: [
                        Text(
                          ytd.ifVal.toStringAsFixed(2),
                          style: const TextStyle(color: Colors.white, fontSize: 36, fontWeight: FontWeight.w800, height: 1.05),
                        ),
                        const SizedBox(width: 6),
                        Text('IF', style: TextStyle(color: Colors.white.withValues(alpha: 0.75), fontSize: 15)),
                      ],
                    ),
                    const SizedBox(height: 10),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                      decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.18), borderRadius: BorderRadius.circular(8)),
                      child: Row(
                        children: [
                          const Icon(Icons.flag_outlined, color: Colors.white, size: 16),
                          const SizedBox(width: 6),
                          Text('Meta $_metaIf', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 12)),
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                            decoration: BoxDecoration(
                              color: ytd.ifVal > _metaIf ? const Color(0xFFB31B25) : const Color(0xFF00675E),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              ytd.ifVal > _metaIf ? 'Alto riesgo' : 'En meta',
                              style: const TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.bold),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: _MiniStat(
                      borderColor: const Color(0xFFB31B25),
                      label: 'Lesiones',
                      value: '${ytd.lesiones}',
                      icon: Icons.personal_injury,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: _MiniStat(
                      borderColor: const Color(0xFF00675E),
                      label: 'Horas H.',
                      value: _fmtHours(ytd.horasHombre),
                      icon: Icons.schedule,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),
              Row(
                children: [
                  const Text('Evolución mensual (IF)', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 14, color: Color(0xFF2C2F31))),
                  const SizedBox(width: 8),
                  Expanded(child: Container(height: 1, color: const Color(0xFFABADAF).withValues(alpha: 0.25))),
                ],
              ),
              const SizedBox(height: 2),
              Text(
                '12 meses · escala según máximo del año',
                style: TextStyle(fontSize: 10, color: const Color(0xFF595C5E).withValues(alpha: 0.9)),
              ),
              const SizedBox(height: 8),
              Container(
                height: 132,
                padding: const EdgeInsets.fromLTRB(6, 8, 6, 6),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  boxShadow: const [BoxShadow(color: Color(0x0D000000), blurRadius: 8, offset: Offset(0, 2))],
                ),
                child: LayoutBuilder(
                  builder: (context, constraints) {
                    final labelH = 14.0;
                    final gap = 3.0;
                    final maxBarH = (constraints.maxHeight - labelH - gap).clamp(24.0, 200.0);
                    return Column(
                      children: [
                        Expanded(
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: months.map((m) {
                              final rawH = m.ifVal <= 0 ? 0.0 : (m.ifVal / maxIf) * maxBarH;
                              final h = rawH <= 0 ? 2.0 : rawH.clamp(4.0, maxBarH);
                              final col = m.ifVal <= 0
                                  ? const Color(0xFFE5E9EB)
                                  : (m.ifVal > _metaIf ? const Color(0xFF2563EB) : const Color(0xFF00675E));
                              return Expanded(
                                child: Padding(
                                  padding: const EdgeInsets.symmetric(horizontal: 1),
                                  child: Align(
                                    alignment: Alignment.bottomCenter,
                                    child: Container(
                                      height: h,
                                      width: double.infinity,
                                      decoration: BoxDecoration(
                                        gradient: m.ifVal <= 0
                                            ? null
                                            : LinearGradient(
                                                begin: Alignment.bottomCenter,
                                                end: Alignment.topCenter,
                                                colors: [col, col.withValues(alpha: 0.75)],
                                              ),
                                        color: m.ifVal <= 0 ? col : null,
                                        borderRadius: const BorderRadius.vertical(top: Radius.circular(3)),
                                      ),
                                    ),
                                  ),
                                ),
                              );
                            }).toList(),
                          ),
                        ),
                        SizedBox(height: gap),
                        SizedBox(
                          height: labelH,
                          child: Row(
                            children: months
                                .map(
                                  (m) => Expanded(
                                    child: Text(
                                      m.label,
                                      textAlign: TextAlign.center,
                                      maxLines: 1,
                                      overflow: TextOverflow.clip,
                                      style: const TextStyle(fontSize: 7.5, fontWeight: FontWeight.w800, color: Color(0xFF595C5E), height: 1),
                                    ),
                                  ),
                                )
                                .toList(),
                          ),
                        ),
                      ],
                    );
                  },
                ),
              ),
              const SizedBox(height: 14),
              Container(
                padding: const EdgeInsets.fromLTRB(12, 10, 12, 10),
                decoration: BoxDecoration(
                  color: const Color(0xFFEEF1F3),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: const Color(0xFFABADAF).withValues(alpha: 0.35)),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Icon(Icons.functions, color: Color(0xFF0050D4), size: 20),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Fórmula', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: Color(0xFF595C5E), letterSpacing: 0.5)),
                          const SizedBox(height: 4),
                          Text(
                            'IF = (# Lesiones / # H-Trabajadas) × ${_factorOsha.toStringAsFixed(0)}',
                            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF0050D4), height: 1.25),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 14),
              Row(
                children: [
                  const Text('Histórico del año', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 14, color: Color(0xFF2C2F31))),
                  const SizedBox(width: 8),
                  Expanded(child: Container(height: 1, color: const Color(0xFFABADAF).withValues(alpha: 0.25))),
                ],
              ),
              const SizedBox(height: 6),
              _HistoryTable(months: months, factor: _factorOsha),
            ],
          ],
        ),
      ),
    );
  }
}

class _MiniStat extends StatelessWidget {
  final Color borderColor;
  final String label;
  final String value;
  final IconData icon;

  const _MiniStat({required this.borderColor, required this.label, required this.value, required this.icon});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(10, 10, 10, 10),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(10),
        border: Border(left: BorderSide(color: borderColor, width: 3)),
        boxShadow: const [BoxShadow(color: Color(0x08000000), blurRadius: 6, offset: Offset(0, 2))],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text(label.toUpperCase(), style: const TextStyle(fontSize: 9, fontWeight: FontWeight.w800, color: Color(0xFF595C5E), letterSpacing: 0.3)),
              ),
              Icon(icon, color: borderColor, size: 18),
            ],
          ),
          const SizedBox(height: 4),
          Text(value, style: const TextStyle(fontSize: 19, fontWeight: FontWeight.w800, color: Color(0xFF2C2F31), height: 1.1)),
        ],
      ),
    );
  }
}

class _HistoryTable extends StatelessWidget {
  final List<SafetyIndicesMonth> months;
  final double factor;

  const _HistoryTable({required this.months, required this.factor});

  @override
  Widget build(BuildContext context) {
    final rows = List<SafetyIndicesMonth>.from(months)..sort((a, b) => a.month.compareTo(b.month));
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: const [BoxShadow(color: Color(0x08000000), blurRadius: 6, offset: Offset(0, 2))],
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 7),
            decoration: const BoxDecoration(
              color: Color(0xFFDFE3E6),
            ),
            child: const Row(
              children: [
                Expanded(flex: 2, child: Text('MES', style: TextStyle(fontSize: 9, fontWeight: FontWeight.w800, color: Color(0xFF595C5E)))),
                Expanded(child: Text('LES.', textAlign: TextAlign.center, style: TextStyle(fontSize: 9, fontWeight: FontWeight.w800, color: Color(0xFF595C5E)))),
                Expanded(child: Text('HORAS', textAlign: TextAlign.center, style: TextStyle(fontSize: 9, fontWeight: FontWeight.w800, color: Color(0xFF595C5E)))),
                Expanded(child: Text('IF', textAlign: TextAlign.right, style: TextStyle(fontSize: 9, fontWeight: FontWeight.w800, color: Color(0xFF595C5E)))),
              ],
            ),
          ),
          ...rows.map((m) {
            final ifv = m.horasHombre > 0 ? (m.lesiones / m.horasHombre) * factor : 0.0;
            final muted = m.horasHombre <= 0 && m.lesiones == 0;
            return Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
              decoration: const BoxDecoration(border: Border(top: BorderSide(color: Color(0xFFE5E9EB)))),
              child: Row(
                children: [
                  Expanded(
                    flex: 2,
                    child: Text(
                      m.label,
                      style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: muted ? const Color(0xFFABADAF) : const Color(0xFF2C2F31)),
                    ),
                  ),
                  Expanded(child: Text('${m.lesiones}', textAlign: TextAlign.center, style: TextStyle(fontSize: 10, color: muted ? const Color(0xFFABADAF) : null))),
                  Expanded(child: Text(_shortH(m.horasHombre), textAlign: TextAlign.center, style: TextStyle(fontSize: 10, color: muted ? const Color(0xFFABADAF) : null))),
                  Expanded(
                    child: Text(
                      muted ? '—' : ifv.toStringAsFixed(2),
                      textAlign: TextAlign.right,
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w800,
                        color: muted
                            ? const Color(0xFFABADAF)
                            : (ifv > 0.25 ? const Color(0xFFB31B25) : const Color(0xFF00675E)),
                      ),
                    ),
                  ),
                ],
              ),
            );
          }),
        ],
      ),
    );
  }

  static String _shortH(double h) {
    if (h >= 1000) return '${(h / 1000).toStringAsFixed(0)}k';
    return h.toStringAsFixed(0);
  }
}
