import 'package:flutter/material.dart';

import 'services/fleet_units_service.dart';
import 'unit_documents_screen.dart';

/// Listado básico de unidades (Flota) — diseño móvil del HTML entregado.
class UnitsListScreen extends StatefulWidget {
  const UnitsListScreen({super.key});

  @override
  State<UnitsListScreen> createState() => _UnitsListScreenState();
}

class _UnitsListScreenState extends State<UnitsListScreen> {
  static const _primary = Color(0xFF002045);
  static const _secondary = Color(0xFF5B5F61);
  static const _onSurfaceVariant = Color(0xFF43474E);
  static const _surface = Color(0xFFF9F9FF);
  static const _bodyBg = Color(0xFFDDE0E2);
  static const _outlineVariant = Color(0xFFC4C6CF);
  static const _surfaceLow = Color(0xFFF0F3FF);

  final _searchCtrl = TextEditingController();
  late Future<List<FleetUnit>> _future;
  String _query = '';

  @override
  void initState() {
    super.initState();
    _future = FleetUnitsService().getUnitsWithDocs();
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  void _reload() {
    setState(() {
      _future = FleetUnitsService().getUnitsWithDocs();
    });
  }

  List<FleetUnit> _filter(List<FleetUnit> all) {
    final q = _query.trim().toLowerCase();
    var list = [...all];
    if (q.isNotEmpty) {
      list = list.where((u) {
        final hay = [
          u.placa,
          u.codigoEquipo,
          u.marca,
          u.modelo,
          u.serieMotor,
          u.serieChasis,
          u.clase,
          u.tipoVehiculo,
        ].whereType<String>().join(' ').toLowerCase();
        return hay.contains(q);
      }).toList();
    }
    // Orden: días de vigencia menor a mayor (peor primero)
    list.sort((a, b) {
      final da = a.worstDays;
      final db = b.worstDays;
      if (da == null && db == null) return a.displayPlaca.compareTo(b.displayPlaca);
      if (da == null) return 1;
      if (db == null) return -1;
      return da.compareTo(db);
    });
    return list;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _bodyBg,
      appBar: AppBar(
        backgroundColor: _surface,
        elevation: 0,
        foregroundColor: _primary,
        title: const Text(
          'Flota de Vehículos',
          style: TextStyle(color: _primary, fontWeight: FontWeight.w700, fontSize: 18),
        ),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1),
          child: Container(height: 1, color: _outlineVariant.withValues(alpha: 0.5)),
        ),
        actions: [
          IconButton(
            tooltip: 'Actualizar',
            onPressed: _reload,
            icon: const Icon(Icons.sync),
          ),
        ],
      ),
      body: FutureBuilder<List<FleetUnit>>(
        future: _future,
        builder: (context, snap) {
          if (snap.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator(color: _primary));
          }
          if (snap.hasError) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text('${snap.error}', textAlign: TextAlign.center, style: const TextStyle(color: _secondary)),
                    const SizedBox(height: 12),
                    TextButton(onPressed: _reload, child: const Text('Reintentar')),
                  ],
                ),
              ),
            );
          }

          final all = snap.data ?? const <FleetUnit>[];
          final filtered = _filter(all);
          final total = all.length;
          final vigentes = all.where((u) => u.worstStatus == FleetDocStatus.vigente || u.worstStatus == FleetDocStatus.noCaduca).length;
          final proximos = all.where((u) => u.worstStatus == FleetDocStatus.proximo).length;
          final vencidos = all.where((u) => u.worstStatus == FleetDocStatus.vencido).length;
          final cumplimiento = total == 0 ? 0 : ((vigentes / total) * 100).round();

          return RefreshIndicator(
            color: _primary,
            onRefresh: () async => _reload(),
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
              children: [
                const Text(
                  'Control de permisos, seguros y revisiones técnicas de su flota.',
                  style: TextStyle(color: _onSurfaceVariant, fontSize: 14),
                ),
                const SizedBox(height: 16),
                _kpiGrid(total, vigentes, proximos, vencidos, cumplimiento),
                const SizedBox(height: 16),
                _searchField(),
                const SizedBox(height: 16),
                if (filtered.isEmpty)
                  const Padding(
                    padding: EdgeInsets.all(32),
                    child: Center(child: Text('No hay unidades', style: TextStyle(color: _secondary))),
                  )
                else
                  ...filtered.map(_unitCard),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _kpiGrid(int total, int vigentes, int proximos, int vencidos, int cumplimiento) {
    return GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      mainAxisSpacing: 8,
      crossAxisSpacing: 8,
      childAspectRatio: 2.15,
      children: [
        _kpiCard('TOTAL VEHÍCULOS', '$total', 'En flota', _primary),
        _kpiCard('VIGENTE', '$vigentes', 'Cumplimiento $cumplimiento%', const Color(0xFF16A34A)),
        _kpiCard('PRÓXIMO A VENCER', '$proximos', '< 30 días', const Color(0xFFCA8A04)),
        _kpiCard('VENCIDO', '$vencidos', 'Acción requerida', const Color(0xFFDC2626)),
      ],
    );
  }

  Widget _kpiCard(String label, String value, String hint, Color accent) {
    return Container(
      padding: const EdgeInsets.fromLTRB(12, 8, 10, 8),
      decoration: BoxDecoration(
        color: _surface,
        borderRadius: BorderRadius.circular(10),
        border: Border(left: BorderSide(color: accent, width: 4)),
        boxShadow: const [BoxShadow(color: Color(0x14000000), blurRadius: 4, offset: Offset(0, 1))],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(
            label,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.w600,
              letterSpacing: 0.4,
              color: _onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 2),
          Row(
            crossAxisAlignment: CrossAxisAlignment.baseline,
            textBaseline: TextBaseline.alphabetic,
            children: [
              Text(
                value,
                style: TextStyle(fontSize: 36, fontWeight: FontWeight.w800, color: accent, height: 1),
              ),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  hint,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontSize: 10, color: _onSurfaceVariant),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _searchField() {
    return TextField(
      controller: _searchCtrl,
      onChanged: (v) => setState(() => _query = v),
      decoration: InputDecoration(
        hintText: 'Buscar por placa, código, motor o chasis...',
        hintStyle: const TextStyle(fontSize: 13, color: _onSurfaceVariant),
        prefixIcon: const Icon(Icons.search, color: _onSurfaceVariant),
        filled: true,
        fillColor: _surface,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: _outlineVariant),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: _outlineVariant),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: _primary, width: 1.5),
        ),
      ),
    );
  }

  Widget _unitCard(FleetUnit u) {
    final status = u.worstStatus;
    final preview = u.previewDocs(max: 3);
    final photo = u.photoUrl;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: _surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: _outlineVariant.withValues(alpha: 0.3)),
        boxShadow: const [BoxShadow(color: Color(0x0F000000), blurRadius: 6, offset: Offset(0, 2))],
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 12, 12, 0),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(12),
              child: AspectRatio(
                aspectRatio: 16 / 9,
                child: photo != null
                    ? Image.network(
                        photo,
                        fit: BoxFit.cover,
                        errorBuilder: (_, __, ___) => _photoFallback(),
                      )
                    : _photoFallback(),
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: _surfaceLow.withValues(alpha: 0.6),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(4),
                            decoration: BoxDecoration(
                              color: _primary.withValues(alpha: 0.12),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: const Icon(Icons.local_shipping, size: 16, color: _primary),
                          ),
                          const SizedBox(width: 8),
                          const Text(
                            'VEHÍCULO',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                              letterSpacing: 0.6,
                              color: _primary,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Text(
                        u.displayPlaca,
                        style: const TextStyle(fontSize: 26, fontWeight: FontWeight.w700, color: _primary, height: 1.1),
                      ),
                      const SizedBox(height: 4),
                      Text(u.marcaModelo, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
                      if ((u.serieMotor ?? u.serieChasis)?.isNotEmpty == true)
                        Text(
                          [u.serieMotor, u.serieChasis].where((s) => (s ?? '').isNotEmpty).join(' · '),
                          style: const TextStyle(fontSize: 12, color: _onSurfaceVariant, fontWeight: FontWeight.w500),
                        ),
                      const SizedBox(height: 10),
                      const Text(
                        'CLASE / TIPO',
                        style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, letterSpacing: 0.5, color: _onSurfaceVariant),
                      ),
                      Text(
                        (u.clase?.isNotEmpty == true) ? u.clase! : '—',
                        style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
                      ),
                      if ((u.tipoVehiculo ?? '').isNotEmpty)
                        Text(u.tipoVehiculo!, style: const TextStyle(fontSize: 13, color: _onSurfaceVariant)),
                    ],
                  ),
                ),
                const SizedBox(height: 14),
                const Divider(height: 1, color: Color(0x80C4C6CF)),
                const SizedBox(height: 12),
                const Text(
                  'DOCUMENTACIÓN (DÍAS DE VIGENCIA)',
                  style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, letterSpacing: 0.5, color: _onSurfaceVariant),
                ),
                const SizedBox(height: 8),
                if (preview.isEmpty)
                  const Text('Sin documentos', style: TextStyle(color: _secondary, fontSize: 13))
                else
                  ...preview.map(_docDayRow),
                const SizedBox(height: 14),
                Row(
                  children: [
                    _statusChip(status),
                    const Spacer(),
                    IconButton(
                      tooltip: 'Ver documentación',
                      onPressed: () {
                        Navigator.of(context).push(
                          MaterialPageRoute(
                            builder: (_) => UnitDocumentsScreen(unit: u),
                          ),
                        );
                      },
                      icon: const Icon(Icons.visibility_outlined, color: _onSurfaceVariant),
                    ),
                    IconButton(
                      tooltip: 'Actualizar',
                      onPressed: _reload,
                      icon: const Icon(Icons.sync, color: _onSurfaceVariant),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _photoFallback() {
    return Container(
      color: const Color(0xFFE7EEFF),
      child: const Center(
        child: Icon(Icons.local_shipping, size: 48, color: _secondary),
      ),
    );
  }

  Widget _docDayRow(FleetUnitDoc d) {
    final st = d.status;
    final days = d.daysLeft;
    final Color bg;
    final Color fg;
    switch (st) {
      case FleetDocStatus.vencido:
        bg = const Color(0x0DFEE2E2);
        fg = const Color(0xFFDC2626);
        break;
      case FleetDocStatus.proximo:
        bg = const Color(0x0DFEF9C3);
        fg = const Color(0xFFCA8A04);
        break;
      default:
        bg = const Color(0x0DDCFCE7);
        fg = const Color(0xFF16A34A);
    }
    return Container(
      margin: const EdgeInsets.only(bottom: 6),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: fg.withValues(alpha: 0.2)),
      ),
      child: Row(
        children: [
          Expanded(
            child: Text(
              d.typeLabel,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500),
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(4),
              boxShadow: const [BoxShadow(color: Color(0x14000000), blurRadius: 2)],
            ),
            child: Text(
              FleetUnitsService.daysLabel(days),
              style: TextStyle(color: fg, fontWeight: FontWeight.w700, fontSize: 12),
            ),
          ),
        ],
      ),
    );
  }

  Widget _statusChip(FleetDocStatus status) {
    Color bg;
    Color fg;
    Color border;
    switch (status) {
      case FleetDocStatus.vencido:
        bg = const Color(0xFFFEF2F2);
        fg = const Color(0xFFDC2626);
        border = const Color(0xFFFECACA);
        break;
      case FleetDocStatus.proximo:
        bg = const Color(0xFFFEFCE8);
        fg = const Color(0xFFA16207);
        border = const Color(0xFFFEF08A);
        break;
      case FleetDocStatus.vigente:
      case FleetDocStatus.noCaduca:
        bg = const Color(0xFFF0FDF4);
        fg = const Color(0xFF15803D);
        border = const Color(0xFFBBF7D0);
        break;
      default:
        bg = const Color(0xFFF1F5F9);
        fg = _secondary;
        border = _outlineVariant;
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: border),
      ),
      child: Text(
        FleetUnitsService.statusLabel(status),
        style: TextStyle(color: fg, fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 0.4),
      ),
    );
  }
}
