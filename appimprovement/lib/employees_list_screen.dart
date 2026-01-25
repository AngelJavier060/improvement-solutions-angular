import 'dart:async';
import 'package:flutter/material.dart';

import 'services/auth_service.dart';
import 'services/employees_service.dart';
import 'config/app_config.dart';
import 'employee_detail_screen.dart';

class EmployeesListScreen extends StatefulWidget {
  final String? businessRuc;
  const EmployeesListScreen({super.key, this.businessRuc});

  @override
  State<EmployeesListScreen> createState() => _EmployeesListScreenState();
}

class _EmployeesListScreenState extends State<EmployeesListScreen> {
  late Future<List<Map<String, dynamic>>> _future;
  String? _ruc;
  List<Map<String, dynamic>> _cache = const [];
  String _searchQuery = '';
  String _filter = 'Todos';
  Timer? _debounce;

  @override
  void initState() {
    super.initState();
    final ruc = widget.businessRuc ?? AuthService().getPrimaryBusinessRuc();
    _ruc = ruc;
    _future = _load(ruc);
  }

  Future<List<Map<String, dynamic>>> _load(String? ruc) async {
    if (ruc == null || ruc.isEmpty) {
      throw Exception('No se encontró el RUC de la empresa del usuario.');
    }
    final data = await EmployeesService().getEmployeesByBusinessRuc(ruc);
    _cache = data;
    return data;
  }

  List<Map<String, dynamic>> _filterEmployees(List<Map<String, dynamic>> employees) {
    List<Map<String, dynamic>> list = employees;
    if (_filter == 'Hombres') {
      list = list.where((e) {
        final g = (e['genderName'] ?? e['genero'] ?? e['gender'] ?? '').toString().toLowerCase();
        return g.contains('mascul') || g == 'm' || g == 'male' || g == 'hombre';
      }).toList();
    } else if (_filter == 'Mujeres') {
      list = list.where((e) {
        final g = (e['genderName'] ?? e['genero'] ?? e['gender'] ?? '').toString().toLowerCase();
        return g.contains('femen') || g == 'f' || g == 'female' || g == 'mujer';
      }).toList();
    }
    if (_searchQuery.isEmpty) return list;
    final q = _searchQuery.toLowerCase();
    return list.where((e) {
      final name = _displayName(e).toLowerCase();
      final cedula = (e['cedula']?.toString() ?? '').toLowerCase();
      final email = (e['email']?.toString() ?? '').toLowerCase();
      return name.contains(q) || cedula.contains(q) || email.contains(q);
    }).toList();
  }

  int _countMale(List<Map<String, dynamic>> list) {
    int c = 0;
    for (final e in list) {
      final g = (e['genderName'] ?? e['genero'] ?? e['gender'] ?? '').toString().toLowerCase().trim();
      if (g.contains('mascul') || g == 'm' || g == 'male' || g == 'hombre') c++;
    }
    return c;
  }

  int _countFemale(List<Map<String, dynamic>> list) {
    int c = 0;
    for (final e in list) {
      final g = (e['genderName'] ?? e['genero'] ?? e['gender'] ?? '').toString().toLowerCase().trim();
      if (g.contains('femen') || g == 'f' || g == 'female' || g == 'mujer') c++;
    }
    return c;
  }

  Widget _statsHeader(BuildContext context, List<Map<String, dynamic>> employees) {
    final total = employees.length;
    final males = _countMale(employees);
    final females = _countFemale(employees);
    final malePct = total > 0 ? males / total : 0.0;
    final femalePct = total > 0 ? females / total : 0.0;

    return Container(
      margin: const EdgeInsets.fromLTRB(12, 12, 12, 8),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF6B8CA6), Color(0xFFAFC7D9)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(color: Color(0x33000000), blurRadius: 14, offset: Offset(0, 6)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('Resumen de Talento Humano', style: TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w600)),
              Text('Total: $total', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w500, fontSize: 12)),
            ],
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 6,
            children: [
              _miniPill('Hombres', males.toString()),
              _miniPill('Mujeres', females.toString()),
            ],
          ),
          const SizedBox(height: 8),
          _genderBar(context, 'Hombres', males, malePct, const Color(0xFFFFFFFF)),
          const SizedBox(height: 6),
          _genderBar(context, 'Mujeres', females, femalePct, const Color(0xFFFFFFFF)),
        ],
      ),
    );
  }

  Widget _miniPill(String label, String value) {
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

  String _displayName(Map<String, dynamic> e) {
    final name = (e['name'] as String?)?.trim();
    final nombres = (e['nombres'] as String?)?.trim();
    final apellidos = (e['apellidos'] as String?)?.trim();
    if (name != null && name.isNotEmpty) return name;
    final combined = [nombres, apellidos].where((s) => s != null && s!.isNotEmpty).join(' ');
    return combined.isNotEmpty ? combined : (e['cedula']?.toString() ?? 'Empleado');
  }

  String _initials(String name) {
    final parts = name.trim().split(RegExp(r"\s+"));
    final first = parts.isNotEmpty ? parts.first : '';
    final last = parts.length > 1 ? parts.last : '';
    final initials = ((first.isNotEmpty ? first[0] : '') + (last.isNotEmpty ? last[0] : '')).toUpperCase();
    return initials.isNotEmpty ? initials : 'E';
  }

  String? _photoUrl(Map<String, dynamic> e) {
    final raw = (e['profile_picture'] ?? e['imagePath'] ?? e['profilePicture'] ?? e['photo'] ?? e['foto'] ?? e['image'])?.toString();
    final path = raw?.trim();
    if (path == null || path.isEmpty) return null;
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }
    if (path.startsWith('/api/')) {
      final lastSlash = path.lastIndexOf('/');
      final prefix = path.substring(0, lastSlash + 1);
      final last = path.substring(lastSlash + 1);
      final encodedLast = Uri.encodeComponent(last);
      final apiPath = '$prefix$encodedLast';
      return '${AppConfig.baseUrl}$apiPath';
    }
    var normalized = path.replaceAll('\\', '/');
    while (normalized.startsWith('/')) {
      normalized = normalized.substring(1);
    }
    if (normalized.startsWith('uploads/')) {
      normalized = normalized.substring('uploads/'.length);
    }
    final hasSlash = normalized.contains('/');
    final filename = hasSlash ? (normalized.split('/').last) : normalized;
    final lower = normalized.toLowerCase();
    if (lower.startsWith('profiles/')) {
      final normalizedEncoded = normalized.split('/').map(Uri.encodeComponent).join('/');
      return '${AppConfig.baseUrl}/api/files/$normalizedEncoded';
    }
    if (!hasSlash) {
      final encoded = Uri.encodeComponent(filename);
      return '${AppConfig.baseUrl}/api/files/profiles/$encoded';
    }
    final normalizedEncoded = normalized.split('/').map(Uri.encodeComponent).join('/');
    return '${AppConfig.baseUrl}/api/files/$normalizedEncoded';
  }

  Widget _genderBar(BuildContext context, String label, int count, double pct, Color color) {
    return Row(
      children: [
        Text(label, style: const TextStyle(color: Colors.white, fontSize: 12)),
        const SizedBox(width: 8),
        Expanded(
          child: ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: LinearProgressIndicator(
              value: pct,
              minHeight: 8,
              backgroundColor: Color(0xFFC8D5DE),
              valueColor: AlwaysStoppedAnimation<Color>(color),
            ),
          ),
        ),
        const SizedBox(width: 8),
        Text('$count', style: const TextStyle(color: Colors.white, fontSize: 12)),
      ],
    );
  }

  Widget _searchBar() {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      padding: const EdgeInsets.symmetric(horizontal: 12),
      decoration: BoxDecoration(
        color: const Color(0xFF6E7E89),
        borderRadius: BorderRadius.circular(12),
        boxShadow: [BoxShadow(color: Color(0x33000000), blurRadius: 8, offset: Offset(0, 4))],
      ),
      child: TextField(
        onChanged: (value) {
          _debounce?.cancel();
          _debounce = Timer(const Duration(milliseconds: 250), () {
            if (!mounted) return;
            setState(() => _searchQuery = value);
          });
        },
        decoration: InputDecoration(
          hintText: 'Buscar nombre, cédula o email...',
          hintStyle: const TextStyle(color: Color(0xFFFFFFFF), fontWeight: FontWeight.w400),
          border: InputBorder.none,
          icon: const Icon(Icons.search, color: Color(0xFFC8D5DE)),
          suffixIcon: _searchQuery.isNotEmpty
              ? IconButton(icon: const Icon(Icons.clear, color: Color(0xFFC8D5DE)), onPressed: () => setState(() => _searchQuery = ''))
              : null,
        ),
        style: const TextStyle(color: Colors.white),
      ),
    );
  }

  Widget _filters() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(12, 0, 12, 8),
      child: Wrap(
        spacing: 8,
        children: [
          ChoiceChip(
            label: const Text('Todos'),
            selected: _filter == 'Todos',
            labelStyle: const TextStyle(fontSize: 12, color: Colors.white),
            selectedColor: const Color(0xFF6E7E89),
            backgroundColor: const Color(0xFFAFC7D9),
            onSelected: (_) => setState(() => _filter = 'Todos'),
          ),
          ChoiceChip(
            label: const Text('Hombres'),
            selected: _filter == 'Hombres',
            labelStyle: const TextStyle(fontSize: 12, color: Colors.white),
            selectedColor: const Color(0xFF6E7E89),
            backgroundColor: const Color(0xFFAFC7D9),
            onSelected: (_) => setState(() => _filter = 'Hombres'),
          ),
          ChoiceChip(
            label: const Text('Mujeres'),
            selected: _filter == 'Mujeres',
            labelStyle: const TextStyle(fontSize: 12, color: Colors.white),
            selectedColor: const Color(0xFF6E7E89),
            backgroundColor: const Color(0xFFAFC7D9),
            onSelected: (_) => setState(() => _filter = 'Mujeres'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF6B8CA6),
      appBar: AppBar(
        elevation: 0,
        backgroundColor: const Color(0xFF6B8CA6),
        foregroundColor: Colors.white,
        title: const Row(
          children: [
            Icon(Icons.people, color: Color(0xFFFFFFFF)),
            SizedBox(width: 8),
            Text('Talento Humano', style: TextStyle(color: Color(0xFFFFFFFF), fontWeight: FontWeight.bold)),
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
          final allEmployees = snapshot.data ?? [];
          final employees = _filterEmployees(allEmployees);
          return RefreshIndicator(
            onRefresh: () async {
              setState(() { _future = _load(_ruc); });
              await _future;
            },
            color: const Color(0xFFFFFFFF),
            child: ListView.builder(
              padding: const EdgeInsets.only(bottom: 16),
              itemCount: (employees.isEmpty ? 1 : employees.length) + 2,
              itemBuilder: (context, index) {
                if (index == 0) return _statsHeader(context, allEmployees);
                if (index == 1) return Column(children: [_searchBar(), _filters()]);
                if (employees.isEmpty && index == 2) {
                  return _emptyState();
                }
                final e = employees[index - 2];
                return _employeeCard(context, e);
              },
            ),
          );
        },
      ),
    );
  }

  Widget _emptyState() {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 40),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            padding: const EdgeInsets.all(24),
            decoration: const BoxDecoration(color: Colors.white, shape: BoxShape.circle),
            child: Icon(Icons.people_outline, size: 64, color: Colors.grey[400]),
          ),
          const SizedBox(height: 12),
          const Text('No se encontraron empleados', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
          const SizedBox(height: 4),
          Text('Intenta con otros términos de búsqueda', style: TextStyle(color: Colors.grey[600])),
        ],
      ),
    );
  }

  @override
  void dispose() {
    _debounce?.cancel();
    super.dispose();
  }

  Widget _employeeCard(BuildContext context, Map<String, dynamic> e) {
    final title = _displayName(e);
    final cedula = e['cedula']?.toString() ?? '';
    final phone = e['phone']?.toString() ?? '';
    final email = e['email']?.toString() ?? '';
    final photo = _photoUrl(e);

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: const Color(0xFF6E7E89),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFAFC7D9)),
        boxShadow: [BoxShadow(color: Color(0x33000000), blurRadius: 8, offset: Offset(0, 4))],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(16),
          onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => EmployeeDetailScreen(employee: e))),
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Row(
              children: [
                Container(
                  width: 56,
                  height: 56,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(14),
                    gradient: const LinearGradient(colors: [Color(0xFF6E7E89), Color(0xFFAFC7D9)]),
                  ),
                  child: photo != null
                      ? ClipRRect(
                          borderRadius: BorderRadius.circular(14),
                          child: Image.network(
                            photo,
                            fit: BoxFit.cover,
                            width: 56,
                            height: 56,
                            loadingBuilder: (context, child, loadingProgress) => loadingProgress == null
                                ? child
                                : Center(child: Text(_initials(title), style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold))),
                            errorBuilder: (context, error, stackTrace) => Center(child: Text(_initials(title), style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold))),
                          ),
                        )
                      : Center(child: Text(_initials(title), style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold))),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(title, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: Color(0xFFFFFFFF))),
                      const SizedBox(height: 6),
                      if (cedula.isNotEmpty) _infoRow(Icons.badge_outlined, 'Cédula: $cedula'),
                      if (phone.isNotEmpty) _infoRow(Icons.phone_outlined, 'Tel: $phone'),
                      if (email.isNotEmpty) _infoRow(Icons.email_outlined, email),
                    ],
                  ),
                ),
                const Icon(Icons.chevron_right_rounded, color: Color(0xFFFFFFFF), size: 26),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _infoRow(IconData icon, String text) {
    return Padding(
      padding: const EdgeInsets.only(top: 2),
      child: Row(
        children: [
          Icon(icon, size: 14, color: const Color(0xFFC8D5DE)),
          const SizedBox(width: 6),
          Expanded(child: Text(text, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 12.5, color: Colors.white))),
        ],
      ),
    );
  }
}
