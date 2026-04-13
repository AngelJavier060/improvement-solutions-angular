import 'package:flutter/material.dart';

import '../models/safety_indices_summary.dart';
import '../services/business_service.dart';
import '../services/safety_indices_service.dart';

/// TR = IG / IF (misma definición que backend y Angular `indice-riesgo`).
class IndiceRiesgoScreen extends StatefulWidget {
  const IndiceRiesgoScreen({super.key});

  @override
  State<IndiceRiesgoScreen> createState() => _IndiceRiesgoScreenState();
}

class _IndiceRiesgoScreenState extends State<IndiceRiesgoScreen> {
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

  @override
  Widget build(BuildContext context) {
    final ytd = _data?.ytd;
    final months = _data?.months ?? [];

    return Scaffold(
      backgroundColor: const Color(0xFFF5F7F9),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Color(0xFF2563EB)),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text('Tasa de Riesgo (TR)', style: TextStyle(color: Color(0xFF2C2F31), fontWeight: FontWeight.bold)),
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
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(colors: [Color(0xFF00675E), Color(0xFF00A396)], begin: Alignment.topLeft, end: Alignment.bottomRight),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('TR consolidado (YTD)', style: TextStyle(color: Colors.white70, fontSize: 13)),
                    const SizedBox(height: 8),
                    Text(
                      ytd.ifVal > 0 ? ytd.tr.toStringAsFixed(2) : '—',
                      style: const TextStyle(color: Colors.white, fontSize: 40, fontWeight: FontWeight.w800),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      ytd.ifVal > 0 ? 'TR = IG / IF (valores año acumulado)' : 'Sin frecuencia (IF=0): TR no aplica',
                      style: const TextStyle(color: Colors.white70, fontSize: 12),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  _KpiMini('IF (YTD)', ytd.ifVal.toStringAsFixed(2)),
                  const SizedBox(width: 10),
                  _KpiMini('IG (YTD)', ytd.ig.toStringAsFixed(2)),
                ],
              ),
              const SizedBox(height: 20),
              const Text('TR por mes (IGm / IFm)', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
              const SizedBox(height: 8),
              Container(
                decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12)),
                child: Table(
                  border: TableBorder.symmetric(inside: const BorderSide(color: Color(0xFFE5E9EB))),
                  children: [
                    const TableRow(
                      decoration: BoxDecoration(color: Color(0xFFDFE3E6)),
                      children: [
                        _Th2('Mes'),
                        _Th2('IF', right: true),
                        _Th2('IG', right: true),
                        _Th2('TR', right: true),
                      ],
                    ),
                    ...months.reversed.take(8).map((m) {
                      final tr = m.ifVal > 0 ? m.tr : 0.0;
                      return TableRow(
                        children: [
                          _Td2(m.mesAnio, bold: true),
                          _Td2(m.ifVal.toStringAsFixed(2), right: true),
                          _Td2(m.ig.toStringAsFixed(2), right: true),
                          _Td2(m.ifVal > 0 ? tr.toStringAsFixed(2) : '—', right: true, bold: true),
                        ],
                      );
                    }),
                  ],
                ),
              ),
              const SizedBox(height: 20),
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(color: const Color(0xFFEEF1F3), borderRadius: BorderRadius.circular(12)),
                child: const Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(Icons.lightbulb_outline, color: Color(0xFF0050D4)),
                    SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        'Interpretación: TR relaciona la gravedad acumulada con la frecuencia. '
                        'Los valores mensuales usan IF e IG del mismo mes calculados en servidor (HHTT + incidentes).',
                        style: TextStyle(fontSize: 12, color: Color(0xFF595C5E), height: 1.35),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _KpiMini extends StatelessWidget {
  final String label;
  final String value;

  const _KpiMini(this.label, this.value);

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12)),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: const TextStyle(fontSize: 11, color: Color(0xFF595C5E))),
            Text(value, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
          ],
        ),
      ),
    );
  }
}

class _Th2 extends StatelessWidget {
  final String t;
  final bool right;
  const _Th2(this.t, {this.right = false});
  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.all(10),
        child: Text(
          t.toUpperCase(),
          textAlign: right ? TextAlign.right : TextAlign.left,
          style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF595C5E)),
        ),
      );
}

class _Td2 extends StatelessWidget {
  final String t;
  final bool bold;
  final bool right;

  const _Td2(this.t, {this.bold = false, this.right = false});

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.all(12),
        child: Text(
          t,
          textAlign: right ? TextAlign.right : TextAlign.left,
          style: TextStyle(fontSize: 12, fontWeight: bold ? FontWeight.bold : FontWeight.normal),
        ),
      );
}
