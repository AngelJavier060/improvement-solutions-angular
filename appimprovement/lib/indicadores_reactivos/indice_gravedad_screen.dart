import 'package:flutter/material.dart';

import '../models/safety_indices_summary.dart';
import '../services/business_service.dart';
import '../services/safety_indices_service.dart';

/// IG = (días perdidos / horas) × 200.000 — normalización mensual como Angular `indice-gravedad`.
class IndiceGravedadScreen extends StatefulWidget {
  const IndiceGravedadScreen({super.key});

  @override
  State<IndiceGravedadScreen> createState() => _IndiceGravedadScreenState();
}

class _NormMonth {
  final SafetyIndicesMonth raw;
  final int diasPerdidos;
  final double ig;

  _NormMonth({required this.raw, required this.diasPerdidos, required this.ig});
}

class _IndiceGravedadScreenState extends State<IndiceGravedadScreen> {
  static const double _factorIg = 200000;

  final _svc = SafetyIndicesService();
  bool _loading = true;
  String? _error;
  int _year = DateTime.now().year;
  SafetyIndicesSummary? _data;
  List<_NormMonth> _norm = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  List<_NormMonth> _normalize(SafetyIndicesSummary data) {
    return data.months.map((m) {
      final sumInc = m.incidentes.fold<int>(0, (s, i) => s + i.lostDays);
      final dp = m.diasPerdidos > sumInc ? m.diasPerdidos : sumInc;
      final ig = m.horasHombre > 0 ? ((dp / m.horasHombre) * _factorIg * 1000).round() / 1000 : 0.0;
      return _NormMonth(raw: m, diasPerdidos: dp, ig: ig);
    }).toList();
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
      _norm = data == null ? [] : _normalize(data);
      _loading = false;
      _error = data == null ? 'Error al cargar índices' : null;
    });
  }

  String _etiquetaIg(double v) {
    if (v < 0.35) return 'Bajo';
    if (v < 0.6) return 'Moderado';
    return 'Alto';
  }

  @override
  Widget build(BuildContext context) {
    final ytd = _data?.ytd;
    final diasYtd = _norm.fold<int>(0, (s, n) => s + n.diasPerdidos);
    final horasYtd = ytd?.horasHombre ?? 0;
    final igActual = horasYtd > 0 ? (diasYtd / horasYtd) * _factorIg : 0.0;
    final maxIg = _norm.isEmpty ? 0.001 : _norm.map((n) => n.ig).reduce((a, b) => a > b ? a : b);

    return Scaffold(
      backgroundColor: const Color(0xFFF5F7F9),
      appBar: AppBar(
        backgroundColor: const Color(0xFFF5F7F9),
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Color(0xFF2563EB)),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text('Índice de Gravedad', style: TextStyle(color: Color(0xFF2C2F31), fontWeight: FontWeight.w600)),
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
                padding: const EdgeInsets.all(22),
                decoration: BoxDecoration(
                  color: const Color(0xFF0050D4),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'ÍNDICE DE GRAVEDAD ACTUAL',
                          style: TextStyle(color: Colors.white70, fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 1),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(color: const Color(0xFFB31B25), borderRadius: BorderRadius.circular(20)),
                          child: Text(
                            _etiquetaIg(igActual).toUpperCase(),
                            style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w800),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Text(
                      igActual.toStringAsFixed(3),
                      style: const TextStyle(color: Colors.white, fontSize: 42, fontWeight: FontWeight.w800),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: _GBox(
                      border: const Color(0xFF0050D4),
                      label: 'Días perdidos YTD',
                      value: '$diasYtd',
                      icon: Icons.event_busy,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _GBox(
                      border: const Color(0xFF00675E),
                      label: 'Horas trabajadas',
                      value: horasYtd.toStringAsFixed(0),
                      icon: Icons.schedule,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),
              const Text('Evolución mensual IG', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
              const SizedBox(height: 10),
              SizedBox(
                height: 160,
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: _norm.map((n) {
                    final h = n.ig <= 0 ? 8.0 : (n.ig / maxIg * 120).clamp(8.0, 120.0);
                    return Expanded(
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 2),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.end,
                          children: [
                            Container(
                              height: h,
                              decoration: BoxDecoration(
                                color: const Color(0xFF0050D4).withValues(alpha: 0.85),
                                borderRadius: const BorderRadius.vertical(top: Radius.circular(4)),
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(n.raw.label, style: const TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: Color(0xFF595C5E))),
                          ],
                        ),
                      ),
                    );
                  }).toList(),
                ),
              ),
              const SizedBox(height: 20),
              const Text('Parámetros por mes', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
              const SizedBox(height: 8),
              Container(
                decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12)),
                child: Table(
                  border: TableBorder.symmetric(inside: const BorderSide(color: Color(0xFFE5E9EB))),
                  children: [
                    const TableRow(
                      decoration: BoxDecoration(color: Color(0xFFEEF1F3)),
                      children: [
                        _Gh('Mes'),
                        _Gh('Días'),
                        _Gh('Horas'),
                        _Gh('IG'),
                      ],
                    ),
                    ..._norm.reversed.take(6).map((n) => TableRow(
                          children: [
                            _Gc(n.raw.mesAnio, bold: true),
                            _Gc('${n.diasPerdidos}'),
                            _Gc(n.raw.horasHombre.toStringAsFixed(0)),
                            _Gc(n.ig.toStringAsFixed(1), color: const Color(0xFF0050D4), bold: true, right: true),
                          ],
                        )),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              const Text(
                'El detalle por incidente (persona, días) está en el módulo web al abrir el mes.',
                style: TextStyle(fontSize: 11, color: Color(0xFF595C5E)),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _GBox extends StatelessWidget {
  final Color border;
  final String label;
  final String value;
  final IconData icon;

  const _GBox({required this.border, required this.label, required this.value, required this.icon});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border(left: BorderSide(color: border, width: 4)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label.toUpperCase(), style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF595C5E))),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(value, style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w800)),
              Icon(icon, color: border),
            ],
          ),
        ],
      ),
    );
  }
}

class _Gh extends StatelessWidget {
  final String t;
  const _Gh(this.t);
  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.all(10),
        child: Text(t.toUpperCase(), style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF595C5E))),
      );
}

class _Gc extends StatelessWidget {
  final String t;
  final bool bold;
  final Color? color;
  final bool right;

  const _Gc(this.t, {this.bold = false, this.color, this.right = false});

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.all(12),
        child: Text(
          t,
          textAlign: right ? TextAlign.right : TextAlign.left,
          style: TextStyle(
            fontSize: 12,
            fontWeight: bold ? FontWeight.bold : FontWeight.normal,
            color: color ?? const Color(0xFF2C2F31),
          ),
        ),
      );
}
