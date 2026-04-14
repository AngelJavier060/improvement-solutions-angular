import 'package:flutter/material.dart';

import '../services/auth_service.dart';
import '../services/business_service.dart';
import '../services/safety_indices_service.dart';
import '../models/safety_indices_summary.dart';
import 'indice_frecuencia_screen.dart';
import 'indice_trif_screen.dart';
import 'indice_gravedad_screen.dart';
import 'indice_riesgo_screen.dart';

/// Panel principal alineado con `/seguridad-industrial/indicadores-reactivos` (Angular).
class IndicadoresReactivosDashboardScreen extends StatefulWidget {
  const IndicadoresReactivosDashboardScreen({super.key});

  @override
  State<IndicadoresReactivosDashboardScreen> createState() => _IndicadoresReactivosDashboardScreenState();
}

class _IndicadoresReactivosDashboardScreenState extends State<IndicadoresReactivosDashboardScreen> {
  final _svc = SafetyIndicesService();
  final _auth = AuthService();

  bool _loading = true;
  String? _error;
  late int _year;
  SafetyIndicesSummary? _data;
  int _activeEmployees = 0;

  static const _metaIf = 0.25;
  static const _metaIg = 5.0;
  static const _metaTrif = 0.8;

  @override
  void initState() {
    super.initState();
    _year = DateTime.now().year;
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
        _error =
            'No se pudo obtener el ID de la empresa. Cierre sesión y vuelva a entrar, o verifique que su usuario tenga empresas asignadas y que el RUC esté disponible si usa resolución por catálogo público.';
      });
      return;
    }
    final results = await Future.wait([
      _svc.getSafetyIndices(id, _year),
      _svc.getActiveEmployeesYtd(id, _year),
    ]);
    final data = results[0] as SafetyIndicesSummary?;
    final active = results[1] as int?;
    if (!mounted) return;
    setState(() {
      _data = data;
      if (active != null && active > 0) _activeEmployees = active;
      _loading = false;
      _error = data == null ? 'No se pudieron cargar los índices (verifique sesión y datos de asistencia).' : null;
    });
  }

  String _quarterLabel() {
    final m = DateTime.now().month;
    if (m <= 3) return 'Q1';
    if (m <= 6) return 'Q2';
    if (m <= 9) return 'Q3';
    return 'Q4';
  }

  String _fmtNum(double v, [int dec = 2]) {
    final s = v.toStringAsFixed(dec);
    final parts = s.split('.');
    final intPart = parts[0];
    final buf = StringBuffer();
    for (int i = 0; i < intPart.length; i++) {
      final fromEnd = intPart.length - i;
      if (i > 0 && fromEnd % 3 == 0) buf.write(',');
      buf.write(intPart[i]);
    }
    if (dec > 0 && parts.length > 1) {
      buf.write('.${parts[1]}');
    }
    return buf.toString();
  }

  String _badgeIf(double v) => v <= _metaIf ? 'En meta' : 'Alto riesgo';
  String _badgeTrif(double v) => v <= _metaTrif ? 'En meta' : 'Crítico';
  String _badgeIg(double v) {
    if (v == 0) return 'Óptimo';
    if (v < _metaIg) return 'Dentro meta';
    return 'Supera meta';
  }

  String _badgeTr(double v) {
    if (v <= 0) return '—';
    if (v <= 1.0) return 'Aceptable';
    return 'Revisar';
  }

  Color _colorIf(double v) => v <= _metaIf ? const Color(0xFF00675E) : const Color(0xFFB31B25);
  Color _colorTrif(double v) => v <= _metaTrif ? const Color(0xFF00675E) : const Color(0xFFB31B25);
  Color _colorIg(double v) {
    if (v == 0) return const Color(0xFF00675E);
    if (v < _metaIg) return const Color(0xFF00675E);
    return const Color(0xFF702AE1);
  }

  Color _colorTr(double v) {
    if (v <= 0) return const Color(0xFF595C5E);
    if (v <= 1.0) return const Color(0xFF00675E);
    return const Color(0xFFB31B25);
  }

  @override
  Widget build(BuildContext context) {
    final ytd = _data?.ytd;
    final empresa = _auth.getPrimaryBusinessName() ?? 'Empresa';

    return Scaffold(
      backgroundColor: const Color(0xFFF5F7F9),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Color(0xFF2563EB)),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text(
          'Safety Indicators',
          style: TextStyle(color: Color(0xFF2C2F31), fontSize: 18, fontWeight: FontWeight.bold),
        ),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(4),
          child: Container(height: 4, color: const Color(0xFF0050D4)),
        ),
      ),
      body: RefreshIndicator(
        onRefresh: _load,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.fromLTRB(20, 20, 20, 100),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                children: [
                  Container(
                    width: 8,
                    height: 8,
                    decoration: const BoxDecoration(color: Color(0xFF0050D4), shape: BoxShape.circle),
                  ),
                  const SizedBox(width: 10),
                  const Text(
                    'PERIODO ACTUAL',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 1.2,
                      color: Color(0xFF595C5E),
                    ),
                  ),
                  const Spacer(),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: const Color(0xFFABADAF).withValues(alpha: 0.25)),
                    ),
                    child: Text(
                      '$_year ${_quarterLabel()} Activo',
                      style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF0050D4), fontSize: 13),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                empresa,
                style: const TextStyle(fontSize: 14, color: Color(0xFF595C5E)),
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  const Text('Año fiscal: ', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF595C5E))),
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
              if (_activeEmployees > 0)
                Padding(
                  padding: const EdgeInsets.only(top: 4),
                  child: Text(
                    'Trabajadores activos (consolidado HHTT): $_activeEmployees',
                    style: const TextStyle(fontSize: 12, color: Color(0xFF595C5E)),
                  ),
                ),
              const SizedBox(height: 20),
              if (_loading)
                const Padding(
                  padding: EdgeInsets.all(48),
                  child: Center(child: CircularProgressIndicator(color: Color(0xFF0050D4))),
                )
              else if (_error != null)
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFFF7ED),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFFFED7AA)),
                  ),
                  child: Text(_error!, style: const TextStyle(color: Color(0xFF9A3412))),
                )
              else if (ytd != null) ...[
                GridView.count(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  crossAxisCount: 2,
                  crossAxisSpacing: 12,
                  mainAxisSpacing: 12,
                  childAspectRatio: 0.92,
                  children: [
                    _KpiCard(
                      topColor: const Color(0xFF0050D4),
                      icon: Icons.analytics,
                      title: 'Índice de Frecuencia',
                      value: _fmtNum(ytd.ifVal),
                      badge: _badgeIf(ytd.ifVal),
                      badgeColor: _colorIf(ytd.ifVal).withValues(alpha: 0.12),
                      badgeTextColor: _colorIf(ytd.ifVal),
                      onTap: () => Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => const IndiceFrecuenciaScreen()),
                      ),
                    ),
                    _KpiCard(
                      topColor: const Color(0xFFB31B25),
                      icon: Icons.emergency,
                      title: 'Índice TRIF',
                      value: _fmtNum(ytd.trif),
                      badge: _badgeTrif(ytd.trif),
                      badgeColor: _colorTrif(ytd.trif).withValues(alpha: 0.12),
                      badgeTextColor: _colorTrif(ytd.trif),
                      onTap: () => Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => const IndiceTrifScreen()),
                      ),
                    ),
                    _KpiCard(
                      topColor: const Color(0xFF702AE1),
                      icon: Icons.monitor_heart,
                      title: 'Índice de Gravedad',
                      value: _fmtNum(ytd.ig),
                      badge: _badgeIg(ytd.ig),
                      badgeColor: _colorIg(ytd.ig).withValues(alpha: 0.12),
                      badgeTextColor: _colorIg(ytd.ig),
                      onTap: () => Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => const IndiceGravedadScreen()),
                      ),
                    ),
                    _KpiCard(
                      topColor: const Color(0xFF00675E),
                      icon: Icons.verified_user,
                      title: 'Tasa de Riesgo (TR)',
                      value: ytd.ifVal > 0 && ytd.ig > 0 ? _fmtNum(ytd.tr) : '—',
                      badge: _badgeTr(ytd.tr),
                      badgeColor: _colorTr(ytd.tr).withValues(alpha: 0.12),
                      badgeTextColor: _colorTr(ytd.tr),
                      onTap: () => Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => const IndiceRiesgoScreen()),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 28),
                Row(
                  children: [
                    const Text(
                      'Gestión preventiva',
                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: Color(0xFF2C2F31)),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Container(height: 1, color: const Color(0xFFABADAF).withValues(alpha: 0.2)),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                const Text(
                  'Porcentajes de referencia alineados con el tablero web; los KPI preventivos se administran en administración.',
                  style: TextStyle(fontSize: 12, color: Color(0xFF595C5E), height: 1.35),
                ),
                const SizedBox(height: 14),
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: const Color(0xFFEEF1F3),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Column(
                    children: const [
                      _PreventiveBar(label: 'Análisis de Riesgo de Tarea', pct: 92.98, barColor: Color(0xFF0050D4)),
                      SizedBox(height: 18),
                      _PreventiveBar(label: 'Observaciones Planeadas', pct: 99.2, barColor: Color(0xFF00675E)),
                      SizedBox(height: 18),
                      _PreventiveBar(label: 'Diálogo Periódico', pct: 98.0, barColor: Color(0xFF702AE1)),
                      SizedBox(height: 18),
                      _PreventiveBar(label: 'Demanda de Seguridad', pct: 99.6, barColor: Color(0xFF1E3A8A)),
                    ],
                  ),
                ),
                const SizedBox(height: 24),
                ClipRRect(
                  borderRadius: BorderRadius.circular(16),
                  child: SizedBox(
                    height: 180,
                    child: Stack(
                      fit: StackFit.expand,
                      children: [
                        Container(
                          decoration: const BoxDecoration(
                            gradient: LinearGradient(
                              begin: Alignment.topCenter,
                              end: Alignment.bottomCenter,
                              colors: [Color(0xFF1E3A8A), Color(0xFF0F172A)],
                            ),
                          ),
                        ),
                        Positioned(
                          right: -20,
                          top: 20,
                          child: Icon(Icons.analytics, size: 120, color: Colors.white.withValues(alpha: 0.08)),
                        ),
                        Positioned(
                          left: 16,
                          right: 16,
                          bottom: 16,
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'GLOBAL SAFETY STATUS',
                                style: TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.w600,
                                  letterSpacing: 1.2,
                                  color: Colors.white.withValues(alpha: 0.8),
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                'Optimización de protocolos ${_quarterLabel()}',
                                style: const TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.white,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _PreventiveBar extends StatelessWidget {
  final String label;
  final double pct;
  final Color barColor;

  const _PreventiveBar({required this.label, required this.pct, required this.barColor});

  static String _fmtPct(double p) {
    if (p == p.roundToDouble()) return '${p.toInt()}';
    final rounded1 = (p * 10).roundToDouble() / 10;
    if (rounded1 == p) return rounded1.toString();
    return p.toStringAsFixed(2);
  }

  @override
  Widget build(BuildContext context) {
    final w = (pct / 100).clamp(0.0, 1.0);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Expanded(
              child: Text(
                label,
                style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFF2C2F31)),
              ),
            ),
            Text(
              '${_fmtPct(pct)}%',
              style: TextStyle(fontSize: 13, fontWeight: FontWeight.w900, color: barColor),
            ),
          ],
        ),
        const SizedBox(height: 8),
        ClipRRect(
          borderRadius: BorderRadius.circular(999),
          child: SizedBox(
            height: 10,
            child: Stack(
              fit: StackFit.expand,
              children: [
                const ColoredBox(color: Color(0xFFD9DDE0)),
                FractionallySizedBox(
                  widthFactor: w,
                  alignment: Alignment.centerLeft,
                  child: ColoredBox(color: barColor),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _KpiCard extends StatelessWidget {
  final Color topColor;
  final IconData icon;
  final String title;
  final String value;
  final String badge;
  final Color badgeColor;
  final Color badgeTextColor;
  final VoidCallback onTap;

  const _KpiCard({
    required this.topColor,
    required this.icon,
    required this.title,
    required this.value,
    required this.badge,
    required this.badgeColor,
    required this.badgeTextColor,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Container(
              height: 6,
              decoration: BoxDecoration(
                color: topColor,
                borderRadius: const BorderRadius.vertical(top: Radius.circular(14)),
              ),
            ),
            Expanded(
              child: Container(
                padding: const EdgeInsets.all(14),
                decoration: const BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.vertical(bottom: Radius.circular(14)),
                  boxShadow: [BoxShadow(color: Color(0x0D000000), blurRadius: 8, offset: Offset(0, 2))],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Icon(icon, color: topColor, size: 26),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(color: badgeColor, borderRadius: BorderRadius.circular(20)),
                          child: Text(
                            badge.toUpperCase(),
                            style: TextStyle(
                              fontSize: 9,
                              fontWeight: FontWeight.w800,
                              color: badgeTextColor,
                              letterSpacing: 0.3,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const Spacer(),
                    Text(
                      title.toUpperCase(),
                      style: const TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF595C5E),
                        letterSpacing: 0.5,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      value,
                      style: const TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.w800,
                        color: Color(0xFF2C2F31),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
