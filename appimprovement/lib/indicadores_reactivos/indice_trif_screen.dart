import 'package:flutter/material.dart';

import '../models/safety_indices_summary.dart';
import '../services/business_service.dart';
import '../services/safety_indices_service.dart';

/// TRIF = (lesiones / horas) × 1.000.000 — misma API que Angular.
class IndiceTrifScreen extends StatefulWidget {
  const IndiceTrifScreen({super.key});

  @override
  State<IndiceTrifScreen> createState() => _IndiceTrifScreenState();
}

class _IndiceTrifScreenState extends State<IndiceTrifScreen> {
  static const double _metaTrif = 0.8;

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
    final maxTrif = months.isEmpty ? 0.001 : months.map((x) => x.trif).reduce((a, b) => a > b ? a : b);
    final maxTrifBar = maxTrif > _metaTrif ? maxTrif : _metaTrif * 2;

    return Scaffold(
      backgroundColor: const Color(0xFFF5F7F9),
      appBar: AppBar(
        backgroundColor: const Color(0xFF0050D4),
        foregroundColor: Colors.white,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.white),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text('Índice TRIF', style: TextStyle(fontWeight: FontWeight.bold)),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 12),
            child: Center(
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(color: Colors.white24, borderRadius: BorderRadius.circular(20)),
                child: Text('Ene — Dic $_year', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
              ),
            ),
          ),
        ],
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
              Card(
                elevation: 2,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      decoration: const BoxDecoration(
                        color: Color(0xFF0050D4),
                        borderRadius: BorderRadius.vertical(top: Radius.circular(14)),
                      ),
                      child: const Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text('ÍNDICE TRIF ACTUAL', style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold)),
                          Icon(Icons.info_outline, color: Colors.white, size: 20),
                        ],
                      ),
                    ),
                    Padding(
                      padding: const EdgeInsets.all(20),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            crossAxisAlignment: CrossAxisAlignment.baseline,
                            textBaseline: TextBaseline.alphabetic,
                            children: [
                              Text(
                                ytd.trif.toStringAsFixed(2),
                                style: const TextStyle(fontSize: 36, fontWeight: FontWeight.w800),
                              ),
                              const SizedBox(width: 8),
                              Icon(Icons.trending_up, color: ytd.trif > _metaTrif ? const Color(0xFFB31B25) : const Color(0xFF00675E), size: 22),
                              const SizedBox(width: 4),
                              Text(
                                ytd.trif > _metaTrif ? 'Crítico' : 'En control',
                                style: TextStyle(
                                  fontWeight: FontWeight.bold,
                                  color: ytd.trif > _metaTrif ? const Color(0xFFB31B25) : const Color(0xFF00675E),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 16),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              const Text('Meta corporativa:', style: TextStyle(color: Color(0xFF595C5E))),
                              Text('$_metaTrif', style: const TextStyle(fontWeight: FontWeight.bold)),
                            ],
                          ),
                          const SizedBox(height: 8),
                          ClipRRect(
                            borderRadius: BorderRadius.circular(8),
                            child: LinearProgressIndicator(
                              value: (ytd.trif / maxTrifBar).clamp(0.0, 1.0),
                              minHeight: 10,
                              backgroundColor: const Color(0xFFDFE3E6),
                              color: ytd.trif > _metaTrif ? const Color(0xFFB31B25) : const Color(0xFF00675E),
                            ),
                          ),
                          if (ytd.trif > _metaTrif) ...[
                            const SizedBox(height: 12),
                            Container(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(color: const Color(0xFFFFEFEE), borderRadius: BorderRadius.circular(10)),
                              child: const Row(
                                children: [
                                  Icon(Icons.warning_amber_rounded, color: Color(0xFFB31B25)),
                                  SizedBox(width: 10),
                                  Expanded(
                                    child: Text(
                                      'Requiere plan de mitigación (TRIF por encima de meta).',
                                      style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFFB31B25)),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: _SmallBox(
                      title: 'Accidentes (YTD)',
                      value: '${ytd.lesiones}',
                      icon: Icons.personal_injury,
                      iconColor: const Color(0xFFB31B25),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _SmallBox(
                      title: 'Delta vs. meta',
                      value: (ytd.trif - _metaTrif).toStringAsFixed(2),
                      icon: Icons.straighten,
                      iconColor: const Color(0xFFB31B25),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              _SmallBox(
                title: 'Total horas hombre trabajadas',
                value: ytd.horasHombre.toStringAsFixed(1),
                icon: Icons.schedule,
                iconColor: const Color(0xFF0050D4),
                wide: true,
              ),
              const SizedBox(height: 20),
              const Text('Tendencia TRIF mensual', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
              const SizedBox(height: 12),
              SizedBox(
                height: 140,
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: months.map((m) {
                    final pct = (m.trif / maxTrif * 100).clamp(4.0, 100.0);
                    final hi = maxTrif > 0 && (m.trif - maxTrif).abs() < 0.0001;
                    return Expanded(
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 2),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.end,
                          children: [
                            Container(
                              height: pct,
                              decoration: BoxDecoration(
                                color: hi ? const Color(0xFF0050D4) : const Color(0xFF0050D4).withValues(alpha: 0.35),
                                borderRadius: const BorderRadius.vertical(top: Radius.circular(4)),
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(m.label, style: const TextStyle(fontSize: 9, fontWeight: FontWeight.bold)),
                          ],
                        ),
                      ),
                    );
                  }).toList(),
                ),
              ),
              const SizedBox(height: 20),
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(color: const Color(0xFFE5E9EB), borderRadius: BorderRadius.circular(12)),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('FÓRMULA DE CÁLCULO', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFF0050D4))),
                    const SizedBox(height: 8),
                    const Text(
                      'TRIF = (L.R. / H.T.) × 1.000.000',
                      style: TextStyle(fontStyle: FontStyle.italic, fontWeight: FontWeight.bold, color: Color(0xFF0050D4)),
                    ),
                    const SizedBox(height: 8),
                    const Text('L.R.: Lesiones registrables  |  H.T.: Horas trabajadas', style: TextStyle(fontSize: 11, color: Color(0xFF595C5E))),
                  ],
                ),
              ),
              const SizedBox(height: 20),
              const Text('Histórico reciente', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
              const SizedBox(height: 8),
              _TrifTable(months: months.reversed.take(6).toList(), meta: _metaTrif),
            ],
          ],
        ),
      ),
    );
  }
}

class _SmallBox extends StatelessWidget {
  final String title;
  final String value;
  final IconData icon;
  final Color iconColor;
  final bool wide;

  const _SmallBox({
    required this.title,
    required this.value,
    required this.icon,
    required this.iconColor,
    this.wide = false,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), boxShadow: const [BoxShadow(color: Color(0x0A000000), blurRadius: 8)]),
      child: wide
          ? Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(title.toUpperCase(), style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF595C5E))),
                      const SizedBox(height: 6),
                      Text(value, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
                    ],
                  ),
                ),
                CircleAvatar(backgroundColor: const Color(0x1A0050D4), child: Icon(icon, color: iconColor)),
              ],
            )
          : Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title.toUpperCase(), style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF595C5E))),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(value, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
                    Icon(icon, color: iconColor),
                  ],
                ),
              ],
            ),
    );
  }
}

class _TrifTable extends StatelessWidget {
  final List<SafetyIndicesMonth> months;
  final double meta;

  const _TrifTable({required this.months, required this.meta});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12)),
      child: Table(
        border: TableBorder.symmetric(inside: const BorderSide(color: Color(0xFFE5E9EB))),
        children: [
          const TableRow(
            decoration: BoxDecoration(color: Color(0xFFDFE3E6)),
            children: [
              _Th('Mes'),
              _Th('Lesiones', center: true),
              _Th('TRIF', right: true),
            ],
          ),
          ...months.map((m) => TableRow(
                children: [
                  Padding(
                    padding: const EdgeInsets.all(12),
                    child: Text(m.mesAnio, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                  ),
                  Padding(
                    padding: const EdgeInsets.all(12),
                    child: Text('${m.lesiones}', textAlign: TextAlign.center, style: const TextStyle(fontSize: 12)),
                  ),
                  Padding(
                    padding: const EdgeInsets.all(12),
                    child: Text(
                      m.trif.toStringAsFixed(2),
                      textAlign: TextAlign.right,
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 12,
                        color: m.trif > meta ? const Color(0xFFB31B25) : const Color(0xFF00675E),
                      ),
                    ),
                  ),
                ],
              )),
        ],
      ),
    );
  }
}

class _Th extends StatelessWidget {
  final String text;
  final bool center;
  final bool right;

  const _Th(this.text, {this.center = false, this.right = false});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(10),
      child: Text(
        text.toUpperCase(),
        textAlign: right ? TextAlign.right : (center ? TextAlign.center : TextAlign.left),
        style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF595C5E)),
      ),
    );
  }
}
