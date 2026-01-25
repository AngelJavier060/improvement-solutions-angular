import 'package:flutter/material.dart';

import 'services/auth_service.dart';
import 'services/legal_service.dart';

class LegalCompliancePage extends StatefulWidget {
  const LegalCompliancePage({super.key});

  @override
  State<LegalCompliancePage> createState() => _LegalCompliancePageState();
}

class _LegalCard extends StatelessWidget {
  final Map<String, dynamic> it;
  const _LegalCard({required this.it});

  @override
  Widget build(BuildContext context) {
    final name = (it['name'] ?? '').toString();
    final completed = (it['completed'] ?? false) == true;
    final pdfs = (it['pdfs'] as List?)?.cast<Map<String, dynamic>>() ?? const [];
    final due = _parseDate(it['dueDate']);
    final days = _daysRemaining(due);
    final status = _statusLabel(days, completed);
    final priority = (it['priority'] ?? 'MEDIA').toString();
    final borderColor = completed
        ? Colors.green
        : (days.isNaN
            ? Theme.of(context).dividerColor
            : (days < 0 ? Colors.red : Theme.of(context).colorScheme.outline));

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: const Color(0xFF6E7E89),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: borderColor.withOpacity(0.5), width: 1.5),
        boxShadow: [
          BoxShadow(color: Color(0x33000000), blurRadius: 8, offset: Offset(0, 4)),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(14.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: 40,
                  height: 40,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: const Color(0xFFAFC7D9).withOpacity(0.3),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(Icons.gavel, color: Color(0xFFAFC7D9)),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(name, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16, color: Colors.white)),
                      const SizedBox(height: 8),
                      Wrap(
                        spacing: 6,
                        runSpacing: 6,
                        children: [
                          _SoftBadge(icon: Icons.speed, text: status, color: _statusColor(context, status)),
                          if (!days.isNaN) _SoftBadge(icon: Icons.calendar_today, text: _daysLabel(days), color: Theme.of(context).colorScheme.secondary),
                        ],
                      ),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: const Color(0xFFAFC7D9).withOpacity(0.3),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(priority, style: const TextStyle(color: Color(0xFFC8D5DE), fontWeight: FontWeight.w600)),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Wrap(
              spacing: 6,
              runSpacing: 6,
              children: [
                if (pdfs.isEmpty)
                  const Text('— Sin archivos PDF —', style: TextStyle(color: Color(0xFFC8D5DE)))
                else
                  for (int i = 0; i < pdfs.length; i++)
                    InkWell(
                      onTap: () {
                        final url = (pdfs[i]['downloadUrl'] ?? '').toString();
                        if (url.isEmpty) return;
                        Navigator.pushNamed(context, '/pdf-viewer', arguments: url);
                      },
                      borderRadius: BorderRadius.circular(8),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                        decoration: BoxDecoration(
                          color: const Color(0xFFAFC7D9).withOpacity(0.3),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.picture_as_pdf, size: 16, color: Color(0xFFC8D5DE)),
                            const SizedBox(width: 6),
                            Text(pdfs[i]['name']?.toString().isNotEmpty == true ? pdfs[i]['name'].toString() : 'PDF ${i + 1}', style: const TextStyle(fontSize: 12, color: Colors.white)),
                          ],
                        ),
                      ),
                    ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _LegalCompliancePageState extends State<LegalCompliancePage> {
  late Future<List<Map<String, dynamic>>> _future;
  late Future<Map<String, dynamic>?> _summaryFuture;
  String? _ruc;
  String? _businessName;
  String _filter = 'Todos';

  @override
  void initState() {
    super.initState();
    _ruc = AuthService().getPrimaryBusinessRuc();
    _businessName = AuthService().getPrimaryBusinessName();
    _future = (_ruc != null && _ruc!.isNotEmpty)
        ? LegalService().getLegalSummaryByRuc(_ruc!)
        : Future.value(<Map<String, dynamic>>[]);
    _summaryFuture = (_ruc != null && _ruc!.isNotEmpty)
        ? LegalService().getComplianceSummaryByRuc(_ruc!)
        : Future.value(null);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF6B8CA6),
      appBar: AppBar(
        backgroundColor: const Color(0xFF6B8CA6),
        foregroundColor: Colors.white,
        elevation: 0,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Cumplimiento legal', style: TextStyle(color: Colors.white)),
            if (_businessName != null && _businessName!.isNotEmpty)
              Text(_businessName!, style: const TextStyle(color: Color(0xFFC8D5DE), fontSize: 12)),
          ],
        ),
      ),
      body: FutureBuilder<List<Map<String, dynamic>>>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Text(
                  snapshot.error.toString().replaceFirst('Exception: ', ''),
                  textAlign: TextAlign.center,
                ),
              ),
            );
          }
          final items = snapshot.data ?? [];
          if (items.isEmpty) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(24.0),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.inbox, size: 64, color: Colors.grey[400]),
                    const SizedBox(height: 16),
                    const Text('No hay requisitos legales registrados.'),
                    const SizedBox(height: 8),
                    Text(
                      'Empresa: ${_businessName ?? 'N/A'}\nRUC: ${_ruc ?? 'N/A'}',
                      textAlign: TextAlign.center,
                      style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                    ),
                  ],
                ),
              ),
            );
          }
          return RefreshIndicator(
            color: Colors.white,
            onRefresh: () async {
              if (_ruc != null && _ruc!.isNotEmpty) {
                setState(() {
                  _future = LegalService().getLegalSummaryByRuc(_ruc!);
                  _summaryFuture = LegalService().getComplianceSummaryByRuc(_ruc!);
                });
                await _future;
              }
            },
            child: ListView(
              padding: const EdgeInsets.all(12),
              children: [
                FutureBuilder<Map<String, dynamic>?>(
                  future: _summaryFuture,
                  builder: (context, snap) {
                    final data = snap.data;
                    final total = (data?['total'] as num?)?.toInt() ?? items.length;
                    final completed = (data?['completed'] as num?)?.toInt() ?? items.where((e) => (e['completed'] ?? false) == true).length;
                    final pending = total - completed;
                    final pct = total > 0 ? ((completed / total) * 100).round() : 0;
                    return Container(
                      margin: const EdgeInsets.only(bottom: 12),
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(
                          colors: [
                            Color(0xFF6E7E89),
                            Color(0xFFAFC7D9),
                          ],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                        borderRadius: BorderRadius.circular(16),
                        boxShadow: [
                          BoxShadow(color: Color(0x33000000), blurRadius: 8, offset: Offset(0, 4)),
                        ],
                      ),
                      child: Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text('Nivel de Cumplimiento', style: TextStyle(color: Colors.white.withOpacity(0.9), fontSize: 12, fontWeight: FontWeight.w500)),
                                const SizedBox(height: 6),
                                Row(
                                  crossAxisAlignment: CrossAxisAlignment.end,
                                  children: [
                                    Text('$pct%', style: const TextStyle(color: Colors.white, fontSize: 32, fontWeight: FontWeight.w700)),
                                    const SizedBox(width: 4),
                                    Text('completado', style: TextStyle(color: Colors.white.withOpacity(0.9), fontSize: 12)),
                                  ],
                                ),
                                const SizedBox(height: 8),
                                Wrap(
                                  spacing: 8,
                                  runSpacing: 6,
                                  children: [
                                    _miniStat('Cumplidos', completed.toString()),
                                    _miniStat('Pendientes', pending.toString()),
                                    _miniStat('Total', total.toString()),
                                  ],
                                ),
                              ],
                            ),
                          ),
                          SizedBox(
                            width: 52,
                            height: 52,
                            child: Stack(
                              fit: StackFit.expand,
                              children: [
                                CircularProgressIndicator(
                                  value: total > 0 ? completed / total : 0,
                                  strokeWidth: 5,
                                  color: Colors.white,
                                  backgroundColor: Colors.white24,
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    );
                  },
                ),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  children: [
                    ChoiceChip(
                      label: const Text('Todos'),
                      labelPadding: const EdgeInsets.symmetric(horizontal: 8),
                      labelStyle: const TextStyle(fontSize: 12, color: Colors.white),
                      selectedColor: const Color(0xFF6E7E89),
                      backgroundColor: const Color(0xFFAFC7D9),
                      selected: _filter == 'Todos',
                      onSelected: (_) => setState(() => _filter = 'Todos'),
                    ),
                    ChoiceChip(
                      label: const Text('Cumplido'),
                      labelPadding: const EdgeInsets.symmetric(horizontal: 8),
                      labelStyle: const TextStyle(fontSize: 12, color: Colors.white),
                      selectedColor: const Color(0xFF6E7E89),
                      backgroundColor: const Color(0xFFAFC7D9),
                      selected: _filter == 'Cumplido',
                      onSelected: (_) => setState(() => _filter = 'Cumplido'),
                    ),
                    ChoiceChip(
                      label: const Text('Pendiente'),
                      labelPadding: const EdgeInsets.symmetric(horizontal: 8),
                      labelStyle: const TextStyle(fontSize: 12, color: Colors.white),
                      selectedColor: const Color(0xFF6E7E89),
                      backgroundColor: const Color(0xFFAFC7D9),
                      selected: _filter == 'Pendiente',
                      onSelected: (_) => setState(() => _filter = 'Pendiente'),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                ..._applyFilter(items).map((it) => _LegalCard(it: it)).toList(),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _miniStat(String label, String value) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.18),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.white24),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(value, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 12)),
          const SizedBox(width: 6),
          Text(label, style: const TextStyle(color: Colors.white, fontSize: 12)),
        ],
      ),
    );
  }

  List<Map<String, dynamic>> _applyFilter(List<Map<String, dynamic>> items) {
    if (_filter == 'Cumplido') {
      return items.where((e) => (e['completed'] ?? false) == true).toList();
    }
    if (_filter == 'Pendiente') {
      return items.where((e) => (e['completed'] ?? false) != true).toList();
    }
    return items;
  }
}

class _LegalRow extends StatelessWidget {
  final Map<String, dynamic> it;
  const _LegalRow({required this.it});

  @override
  Widget build(BuildContext context) {
    final name = (it['name'] ?? '').toString();
    final pdfs = (it['pdfs'] as List?)?.cast<Map<String, dynamic>>() ?? const [];
    final due = _parseDate(it['dueDate']);
    final start = _parseDate(it['startDate'] ?? it['createdAt']);
    final days = _daysRemaining(due);
    final status = _statusLabel(days, it['completed'] == true);
    final priority = (it['priority'] ?? 'MEDIA').toString();
    return ListTile(
      leading: Container(
        width: 40,
        height: 40,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.primary.withOpacity(0.12),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Icon(Icons.gavel, color: Theme.of(context).colorScheme.primary),
      ),
      title: Text(name, style: const TextStyle(fontWeight: FontWeight.w600)),
      subtitle: Padding(
        padding: const EdgeInsets.only(top: 6),
        child: Wrap(
          spacing: 6,
          runSpacing: 6,
          children: [
            _SoftBadge(icon: Icons.speed, text: status, color: _statusColor(context, status)),
            if (!days.isNaN) _SoftBadge(icon: Icons.calendar_today, text: _daysLabel(days), color: Theme.of(context).colorScheme.secondary),
            _SoftBadge(icon: Icons.flag, text: priority, color: Theme.of(context).colorScheme.tertiary),
            if (pdfs.isEmpty)
              const Text('— Sin archivos PDF —')
            else
              for (int i = 0; i < pdfs.length; i++)
                InkWell(
                  onTap: () {
                    final url = (pdfs[i]['downloadUrl'] ?? '').toString();
                    if (url.isEmpty) return;
                    Navigator.pushNamed(context, '/pdf-viewer', arguments: url);
                  },
                  borderRadius: BorderRadius.circular(8),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: Theme.of(context).colorScheme.primary.withOpacity(0.08),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.picture_as_pdf, size: 16, color: Theme.of(context).colorScheme.primary),
                        const SizedBox(width: 4),
                        Text('PDF ${i + 1}', style: TextStyle(fontSize: 12, color: Theme.of(context).colorScheme.primary)),
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

DateTime? _parseDate(dynamic v) {
  try {
    if (v == null) return null;
    return DateTime.tryParse(v.toString());
  } catch (_) {
    return null;
  }
}

double _daysRemaining(DateTime? due) {
  if (due == null) return double.nan;
  final today = DateTime.now();
  final a = DateTime(today.year, today.month, today.day);
  final b = DateTime(due.year, due.month, due.day);
  return b.difference(a).inDays.toDouble();
}

String _daysLabel(double days) {
  if (days.isNaN) return '—';
  if (days > 0) return '${days.toInt()} días';
  if (days == 0) return 'Hoy';
  return 'Hace ${days.abs().toInt()} días';
}

String _statusLabel(double days, bool completed) {
  if (completed) return 'CUMPLIDO';
  if (days.isNaN) return 'PENDIENTE';
  if (days < 0) return 'VENCIDA';
  if (days <= 5) return 'URGENTE';
  return 'EN PROCESO';
}

Color _statusColor(BuildContext context, String status) {
  final s = status.toUpperCase();
  if (s == 'CUMPLIDO' || s == 'CUMPLIDA') return Colors.green;
  if (s == 'VENCIDA' || s == 'URGENTE') return Colors.red;
  if (s == 'EN PROCESO') return Colors.orange;
  return Theme.of(context).colorScheme.primary;
}

class _SoftBadge extends StatelessWidget {
  final IconData icon;
  final String text;
  final Color color;
  const _SoftBadge({required this.icon, required this.text, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.12),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: color),
          const SizedBox(width: 4),
          Text(text, style: TextStyle(fontSize: 12, color: color)),
        ],
      ),
    );
  }
}
