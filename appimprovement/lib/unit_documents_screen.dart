import 'package:flutter/material.dart';

import 'pdf_viewer_page.dart';
import 'services/fleet_units_service.dart';

/// Documentación de una unidad — días de vigencia + ver PDF.
class UnitDocumentsScreen extends StatefulWidget {
  final FleetUnit unit;
  const UnitDocumentsScreen({super.key, required this.unit});

  @override
  State<UnitDocumentsScreen> createState() => _UnitDocumentsScreenState();
}

class _UnitDocumentsScreenState extends State<UnitDocumentsScreen> {
  static const _primary = Color(0xFF002045);
  static const _secondary = Color(0xFF5B5F61);
  static const _onSurfaceVariant = Color(0xFF43474E);
  static const _surface = Color(0xFFF9F9FF);
  static const _background = Color(0xFFF9F9FF);
  static const _outlineVariant = Color(0xFFC4C6CF);
  static const _error = Color(0xFFBA1A1A);
  static const _errorContainer = Color(0xFFFFDAD6);
  static const _green = Color(0xFF006D3A);
  static const _greenBg = Color(0xFFE6F4EA);
  static const _warn = Color(0xFF975A16);
  static const _warnBg = Color(0xFFFEF08A);

  late Future<List<FleetUnitDoc>> _docsFuture;
  final _searchCtrl = TextEditingController();
  String _query = '';

  @override
  void initState() {
    super.initState();
    _docsFuture = FleetUnitsService().getDocsForVehicle(widget.unit.id);
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  void _reload() {
    setState(() {
      _docsFuture = FleetUnitsService().getDocsForVehicle(widget.unit.id);
    });
  }

  @override
  Widget build(BuildContext context) {
    final u = widget.unit;
    return Scaffold(
      backgroundColor: _background,
      appBar: AppBar(
        backgroundColor: _surface,
        elevation: 0,
        foregroundColor: _primary,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Documentación', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 18, color: _primary)),
            Text(
              'Vehículo ${u.displayPlaca}',
              style: const TextStyle(fontSize: 12, color: _onSurfaceVariant, fontWeight: FontWeight.w500),
            ),
          ],
        ),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1),
          child: Container(height: 1, color: _outlineVariant.withValues(alpha: 0.5)),
        ),
        actions: [
          IconButton(onPressed: _reload, icon: const Icon(Icons.sync), tooltip: 'Actualizar'),
        ],
      ),
      body: FutureBuilder<List<FleetUnitDoc>>(
        future: _docsFuture,
        builder: (context, snap) {
          if (snap.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator(color: _primary));
          }
          final docs = snap.data ?? u.activeDocs;
          final q = _query.trim().toLowerCase();
          final filtered = q.isEmpty
              ? docs
              : docs.where((d) {
                  final hay = '${d.typeLabel} ${d.entidadRemitenteName ?? ''} ${d.docCategory ?? ''}'.toLowerCase();
                  return hay.contains(q);
                }).toList();

          final total = docs.length;
          final vigentes = docs.where((d) => d.status == FleetDocStatus.vigente || d.status == FleetDocStatus.noCaduca).length;
          final alertas = docs.where((d) => d.status == FleetDocStatus.vencido || d.status == FleetDocStatus.proximo).length;

          final grouped = <String, List<FleetUnitDoc>>{};
          for (final d in filtered) {
            final key = _categoryLabel(d.docCategory);
            grouped.putIfAbsent(key, () => []).add(d);
          }

          // Orden fijo solicitado
          const categoryOrder = [
            'Documentos Legales y Permisos',
            'Certificaciones Técnicas',
            'Liberaciones',
            'Documentos Adicionales',
          ];
          final orderedBlocks = <MapEntry<String, List<FleetUnitDoc>>>[
            for (final title in categoryOrder)
              if (grouped.containsKey(title) && grouped[title]!.isNotEmpty)
                MapEntry(title, grouped[title]!),
            // Cualquier otra categoría al final (p. ej. "Documentación")
            ...grouped.entries.where((e) => !categoryOrder.contains(e.key) && e.value.isNotEmpty),
          ];

          return RefreshIndicator(
            color: _primary,
            onRefresh: () async => _reload(),
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
              children: [
                if (u.photoUrl != null)
                  ClipRRect(
                    borderRadius: BorderRadius.circular(12),
                    child: AspectRatio(
                      aspectRatio: 16 / 9,
                      child: Image.network(
                        u.photoUrl!,
                        fit: BoxFit.cover,
                        errorBuilder: (_, __, ___) => _photoFallback(),
                      ),
                    ),
                  )
                else
                  ClipRRect(
                    borderRadius: BorderRadius.circular(12),
                    child: AspectRatio(aspectRatio: 16 / 9, child: _photoFallback()),
                  ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(child: _summaryTile('Total', '$total', _primary)),
                    const SizedBox(width: 10),
                    Expanded(child: _summaryTile('Vigentes', '$vigentes', _green)),
                    const SizedBox(width: 10),
                    Expanded(child: _summaryTile('Vencidos/Próximos', '$alertas', _error)),
                  ],
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: _searchCtrl,
                  onChanged: (v) => setState(() => _query = v),
                  decoration: InputDecoration(
                    hintText: 'Buscar tipo o descripción...',
                    prefixIcon: const Icon(Icons.search, color: _onSurfaceVariant),
                    filled: true,
                    fillColor: Colors.white,
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
                      borderSide: const BorderSide(color: _primary),
                    ),
                  ),
                ),
                const SizedBox(height: 20),
                if (filtered.isEmpty)
                  const Padding(
                    padding: EdgeInsets.all(24),
                    child: Center(child: Text('Sin documentos', style: TextStyle(color: _secondary))),
                  )
                else
                  ...orderedBlocks.map((e) => _categoryBlock(e.key, e.value)),
              ],
            ),
          );
        },
      ),
    );
  }

  String _categoryLabel(String? cat) {
    switch ((cat ?? '').toUpperCase()) {
      case 'DOCUMENTOS_PRINCIPALES':
        return 'Documentos Legales y Permisos';
      case 'CERTIFICACIONES':
        return 'Certificaciones Técnicas';
      case 'LIBERACIONES':
        return 'Liberaciones';
      case 'DOCUMENTOS_ADICIONALES':
        return 'Documentos Adicionales';
      default:
        return 'Documentación';
    }
  }

  Widget _summaryTile(String label, String value, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 8),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: const [BoxShadow(color: Color(0x141A365D), blurRadius: 12, offset: Offset(0, 4))],
      ),
      child: Column(
        children: [
          Text(
            label.toUpperCase(),
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 10, fontWeight: FontWeight.w500, color: color == _error ? _error : _onSurfaceVariant, letterSpacing: 0.4),
          ),
          const SizedBox(height: 4),
          Text(value, style: TextStyle(fontSize: 26, fontWeight: FontWeight.w700, color: color)),
        ],
      ),
    );
  }

  Widget _categoryBlock(String title, List<FleetUnitDoc> docs) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: const [BoxShadow(color: Color(0x141A365D), blurRadius: 12, offset: Offset(0, 4))],
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            decoration: const BoxDecoration(
              color: _surface,
              border: Border(bottom: BorderSide(color: _outlineVariant)),
            ),
            child: Text(title, style: const TextStyle(color: _primary, fontSize: 16, fontWeight: FontWeight.w600)),
          ),
          ...docs.map((d) => _docRow(d)),
        ],
      ),
    );
  }

  Widget _docRow(FleetUnitDoc d) {
    final st = d.status;
    final days = d.daysLeft;
    final Color iconBg;
    final Color iconFg;
    final Color? rowTint;
    IconData icon;
    String badge;
    Color badgeBg;
    Color badgeFg;

    switch (st) {
      case FleetDocStatus.vencido:
        iconBg = _errorContainer;
        iconFg = _error;
        rowTint = _errorContainer.withValues(alpha: 0.3);
        icon = Icons.error;
        badge = 'Caducado';
        badgeBg = _errorContainer;
        badgeFg = _error;
        break;
      case FleetDocStatus.proximo:
        iconBg = _warnBg;
        iconFg = _warn;
        rowTint = const Color(0x80FFFAF0);
        icon = Icons.description;
        badge = 'Próximo a caducar';
        badgeBg = _warnBg;
        badgeFg = _warn;
        break;
      case FleetDocStatus.noCaduca:
        iconBg = _greenBg;
        iconFg = _green;
        rowTint = null;
        icon = Icons.verified;
        badge = 'No caduca';
        badgeBg = _greenBg;
        badgeFg = _green;
        break;
      default:
        iconBg = _greenBg;
        iconFg = _green;
        rowTint = null;
        icon = Icons.description;
        badge = 'Vigente';
        badgeBg = _greenBg;
        badgeFg = _green;
    }

    String? daysText;
    if (days != null) {
      if (days < 0) {
        daysText = 'Vencido hace ${-days} días';
      } else if (days == 0) {
        daysText = 'Vence hoy';
      } else {
        daysText = '$days días';
      }
    }

    final pdfUrl = FleetUnitsService().pdfUrlForDoc(widget.unit.id, d);
    final canPdf = pdfUrl != null && pdfUrl.isNotEmpty;

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: rowTint,
        border: const Border(bottom: BorderSide(color: Color(0x33C4C6CF))),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(color: iconBg, borderRadius: BorderRadius.circular(8)),
                child: Icon(icon, color: iconFg, size: 22),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(d.typeLabel, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                    if ((d.entidadRemitenteName ?? '').isNotEmpty)
                      Text(
                        d.entidadRemitenteName!,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontSize: 12, color: _onSurfaceVariant),
                      ),
                  ],
                ),
              ),
              if (canPdf)
                IconButton(
                  tooltip: 'Ver PDF',
                  onPressed: () {
                    Navigator.of(context).push(
                      MaterialPageRoute(builder: (_) => PdfViewerPage(url: pdfUrl)),
                    );
                  },
                  icon: const Icon(Icons.picture_as_pdf, color: _primary),
                ),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Emisión', style: TextStyle(fontSize: 11, color: _onSurfaceVariant)),
                    Text(FleetUnitsService.formatDateDmy(d.issueDate), style: const TextStyle(fontSize: 13)),
                  ],
                ),
              ),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Vencimiento', style: TextStyle(fontSize: 11, color: _onSurfaceVariant)),
                    Text(
                      FleetUnitsService.formatDateDmy(d.expiryDate),
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: st == FleetDocStatus.vencido
                            ? _error
                            : (st == FleetDocStatus.proximo ? const Color(0xFFD97706) : _green),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Wrap(
            crossAxisAlignment: WrapCrossAlignment.center,
            spacing: 8,
            runSpacing: 4,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(color: badgeBg, borderRadius: BorderRadius.circular(999)),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(width: 6, height: 6, decoration: BoxDecoration(color: badgeFg, shape: BoxShape.circle)),
                    const SizedBox(width: 6),
                    Text(badge, style: TextStyle(color: badgeFg, fontSize: 11, fontWeight: FontWeight.w700)),
                  ],
                ),
              ),
              if (daysText != null)
                Text(
                  daysText,
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: st == FleetDocStatus.vencido ? FontWeight.w600 : FontWeight.w400,
                    color: st == FleetDocStatus.vencido ? _error : _onSurfaceVariant,
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _photoFallback() {
    return Container(
      color: const Color(0xFFE7EEFF),
      child: const Center(child: Icon(Icons.local_shipping, size: 48, color: _secondary)),
    );
  }
}
