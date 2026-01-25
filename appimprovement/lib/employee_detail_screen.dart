import 'package:flutter/material.dart';

import 'config/app_config.dart';
import 'services/auth_service.dart';
import 'services/employees_service.dart';
import 'package:url_launcher/url_launcher.dart';

class EmployeeDetailScreen extends StatelessWidget {
  final Map<String, dynamic> employee;
  const EmployeeDetailScreen({super.key, required this.employee});

  String _displayName(Map<String, dynamic> e) {
    final name = (e['name'] as String?)?.trim();
    final nombres = (e['nombres'] as String?)?.trim();
    final apellidos = (e['apellidos'] as String?)?.trim();
    if (name != null && name.isNotEmpty) return name;
    final combined = [nombres, apellidos].where((s) => s != null && s!.isNotEmpty).join(' ');
    return combined.isNotEmpty ? combined : (e['cedula']?.toString() ?? 'Empleado');
  }

  String? _photoUrl(Map<String, dynamic> e) {
    final raw = (e['profile_picture'] ?? e['imagePath'] ?? e['profilePicture'] ?? e['photo'] ?? e['foto'] ?? e['image'])?.toString();
    final path = raw?.trim();
    if (path == null || path.isEmpty) return null;
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    if (path.startsWith('/api/')) {
      final lastSlash = path.lastIndexOf('/');
      final prefix = path.substring(0, lastSlash + 1);
      final last = path.substring(lastSlash + 1);
      return '${AppConfig.baseUrl}$prefix${Uri.encodeComponent(last)}';
    }
    var normalized = path.replaceAll('\\', '/');
    while (normalized.startsWith('/')) normalized = normalized.substring(1);
    if (normalized.startsWith('uploads/')) normalized = normalized.substring('uploads/'.length);
    final hasSlash = normalized.contains('/');
    final filename = hasSlash ? (normalized.split('/').last) : normalized;
    final lower = normalized.toLowerCase();
    if (lower.startsWith('profiles/')) {
      final encoded = normalized.split('/').map(Uri.encodeComponent).join('/');
      return '${AppConfig.baseUrl}/api/files/$encoded';
    }
    if (!hasSlash) {
      return '${AppConfig.baseUrl}/api/files/profiles/${Uri.encodeComponent(filename)}';
    }
    final encoded = normalized.split('/').map(Uri.encodeComponent).join('/');
    return '${AppConfig.baseUrl}/api/files/$encoded';
  }

  Widget _infoRow(IconData icon, String label, String value) {
    if (value.trim().isEmpty) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 18, color: Colors.grey.shade700),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label, style: TextStyle(fontSize: 12, color: Colors.grey.shade600)),
                const SizedBox(height: 2),
                Text(value, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
              ],
            ),
          )
        ],
      ),
    );
  }

  

  @override
  Widget build(BuildContext context) {
    return _EmployeeDetailView(employee: employee);
  }
}

class _EmployeeDetailView extends StatefulWidget {
  final Map<String, dynamic> employee;
  const _EmployeeDetailView({required this.employee});

  @override
  State<_EmployeeDetailView> createState() => _EmployeeDetailViewState();
}

class _EmployeeDetailViewState extends State<_EmployeeDetailView> {
  late Future<List<Map<String, dynamic>>> _docsFuture;
  late Future<List<Map<String, dynamic>>> _certsFuture;
  String _activeTab = 'info';
  Map<String, dynamic>? _detail; // datos de producción si faltan
  Map<String, dynamic>? _emergency;
  bool _loadingDetail = true;

  @override
  void initState() {
    super.initState();
    final e = widget.employee;
    final id = e['id'] ?? e['employeeId'] ?? e['employee_id'] ?? e['businessEmployeeId'] ?? e['personaId'] ?? e['personId'] ?? e['person_id'] ?? (e['employee'] is Map ? (e['employee']['id'] ?? e['employee']['employeeId']) : null);
    _docsFuture = EmployeesService().getEmployeeDocuments(id);
    _certsFuture = EmployeesService().getEmployeeCertifications(id);
    _hydrateFromServer();
  }

  Future<void> _hydrateFromServer() async {
    final e = widget.employee;
    final id = e['id'] ?? e['employeeId'] ?? e['employee_id'] ?? e['businessEmployeeId'] ?? e['personaId'] ?? e['personId'] ?? e['person_id'] ?? (e['employee'] is Map ? (e['employee']['id'] ?? e['employee']['employeeId']) : null);
    final cedula = (e['cedula'] ?? e['dni'] ?? e['document'])?.toString();
    try {
      final detail = await EmployeesService().getEmployeeDetail(id: id, cedula: cedula);
      final emergency = await EmployeesService().getEmergencyContact(id: id, cedula: cedula);
      if (!mounted) return;
      setState(() {
        _detail = detail;
        _emergency = emergency;
        _loadingDetail = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() { _loadingDetail = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    final e = widget.employee;
    final effective = <String, dynamic>{...e, ...?_detail};
    final title = _displayName(effective);
    final cedula = (effective['cedula'] ?? effective['dni'] ?? effective['document'])?.toString() ?? '';
    final phone = (effective['phone'] ?? effective['telefono'] ?? effective['mobile'] ?? effective['celular'])?.toString() ?? '';
    final email = (effective['email'] ?? effective['correo'])?.toString() ?? '';
    final position = (effective['positionName'] ?? effective['position'] ?? effective['cargo'])?.toString() ?? '';
    final department = (effective['departmentName'] ?? effective['department'] ?? effective['departamento'])?.toString() ?? '';
    final address = (effective['address'] ?? effective['direccion'])?.toString() ?? '';
    final city = (effective['city'] ?? effective['ciudad'])?.toString() ?? '';
    final birth = (effective['dateBirth'] ?? effective['birthDate'] ?? effective['dateOfBirth'] ?? effective['fechaNacimiento'] ?? effective['fecha_nacimiento'] ?? effective['fecha_de_nacimiento'] ?? effective['f_nacimiento'] ?? effective['nacimiento'])?.toString() ?? '';
    final photo = _photoUrl(effective);

    // Stats opcionales, si existen en backend
    final performance = (e['performance'] ?? e['desempeno'] ?? e['score']) as num?;
    final hours = (e['hoursWorked'] ?? e['hours'] ?? e['horas']) as num?;
    final projects = (e['projectsCompleted'] ?? e['projects'] ?? e['proyectos']) as num?;

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        foregroundColor: Colors.white,
        flexibleSpace: Container(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              colors: [Color(0xFF6B8CA6), Color(0xFFAFC7D9)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
          ),
        ),
        centerTitle: true,
        title: const Text(
          'Datos del trabajador',
          style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700),
        ),
      ),
      body: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Header con gradiente
            Container(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 20),
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  colors: [Color(0xFF6B8CA6), Color(0xFFAFC7D9)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
              ),
              child: Column(
                children: [
                  Container(
                    width: 132,
                    height: 132,
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(28),
                      boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.2), blurRadius: 16, offset: const Offset(0, 6))],
                    ),
                    child: Stack(
                      children: [
                        ClipRRect(
                          borderRadius: BorderRadius.circular(28),
                          child: Container(
                            color: Colors.white24,
                            child: photo != null
                                ? Image.network(photo, fit: BoxFit.cover, width: 132, height: 132,
                                    errorBuilder: (_, __, ___) => const Icon(Icons.person, size: 64, color: Colors.white))
                                : const Icon(Icons.person, size: 64, color: Colors.white),
                          ),
                        ),
                        Positioned(
                          right: -2,
                          bottom: -2,
                          child: Container(
                            width: 34,
                            height: 34,
                            decoration: BoxDecoration(color: Colors.green, borderRadius: BorderRadius.circular(20), border: Border.all(color: Colors.white, width: 4)),
                            child: const Icon(Icons.check_circle, color: Colors.white, size: 16),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),
                  Text(title, textAlign: TextAlign.center, style: const TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.w800)),
                  if (position.isNotEmpty) ...[
                    const SizedBox(height: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(color: Colors.white24, borderRadius: BorderRadius.circular(20), border: Border.all(color: Colors.white30)),
                      child: Text(position, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
                    ),
                  ],
                  if (department.isNotEmpty) ...[
                    const SizedBox(height: 6),
                    Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                      const Icon(Icons.business, size: 16, color: Colors.white70),
                      const SizedBox(width: 6),
                      Text(department, style: const TextStyle(color: Colors.white70, fontSize: 12)),
                    ]),
                  ],
                ],
              ),
            ),

            // Stats opcionales
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 12, 12, 8),
              child: Row(
                children: [
                  if (performance != null) Expanded(child: _statCard(context, Icons.trending_up, '${performance.toInt()}%', 'Desempeño', Colors.green)),
                  if (performance != null && (hours != null || projects != null)) const SizedBox(width: 8),
                  if (hours != null) Expanded(child: _statCard(context, Icons.schedule, '${hours.toInt()}', 'Horas', Colors.blue)),
                  if (hours != null && projects != null) const SizedBox(width: 8),
                  if (projects != null) Expanded(child: _statCard(context, Icons.emoji_events, '${projects.toInt()}', 'Proyectos', Colors.deepPurple)),
                ],
              ),
            ),

            // Pestañas
            // Tabs estilo segmentado (como imagen 2)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              child: Container(
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: [BoxShadow(color: Color(0x33405362), blurRadius: 6, offset: const Offset(0, 2))],
                ),
                child: Row(
                  children: [
                    _segmentedTab('Información', 'info'),
                    _segmentedTab('Documentos Personales', 'docs'),
                    _segmentedTab('Cursos', 'cert'),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 8),

            if (_activeTab == 'info') ...[
              _infoPersonalSection(cedula, _formatLongDateText(birth)),
              _infoContactoSection(phone, email, address, city),
              _emergencySection(),
            ] else if (_activeTab == 'docs') ...[
              _docsSection(),
            ] else ...[
              _certsSection(),
            ],
            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }

  Widget _segmentedTab(String label, String key) {
    final selected = _activeTab == key;
    return Expanded(
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: () => setState(() => _activeTab = key),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 10),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            color: selected ? const Color(0xFF6E7E89) : null,
            border: Border(
              bottom: BorderSide(
                color: selected ? const Color(0xFF6E7E89) : Colors.transparent,
                width: 2,
              ),
            ),
          ),
          alignment: Alignment.center,
          child: Text(
            label,
            textAlign: TextAlign.center,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              fontSize: 13,
              height: 1.1,
              fontWeight: FontWeight.w600,
              color: selected ? const Color(0xFFFFFFFF) : const Color(0xFF405362),
            ),
          ),
        ),
      ),
    );
  }

  Widget _statCard(BuildContext context, IconData icon, String value, String label, Color color) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 8, offset: const Offset(0, 4))]),
      child: Column(
        children: [
          Container(width: 40, height: 40, decoration: BoxDecoration(color: color.withOpacity(0.12), borderRadius: BorderRadius.circular(10)), child: Icon(icon, color: color)),
          const SizedBox(height: 6),
          Text(value, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
          const SizedBox(height: 2),
          Text(label, style: TextStyle(fontSize: 12, color: Colors.grey.shade600)),
        ],
      ),
    );
  }

  Widget _infoPersonalSection(String cedula, String birthDateText) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Padding(
            padding: EdgeInsets.only(left: 4, bottom: 6),
            child: Text('Información Personal', style: TextStyle(fontWeight: FontWeight.w800)),
          ),
          Container(
            decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), border: Border.all(color: const Color(0x6691B7D0))),
            child: Column(children: [
              _tileInfo(icon: Icons.badge_outlined, label: 'Cédula de Identidad', value: cedula),
              _tileInfo(icon: Icons.calendar_month_outlined, label: 'Fecha de Nacimiento', value: birthDateText),
            ]),
          ),
          const SizedBox(height: 14),
        ],
      ),
    );
  }

  Widget _infoContactoSection(String phone, String email, String address, String city) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Padding(
            padding: EdgeInsets.only(left: 4, bottom: 6),
            child: Text('Información de Contacto', style: TextStyle(fontWeight: FontWeight.w800)),
          ),
          Container(
            decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), border: Border.all(color: const Color(0x6691B7D0))),
            child: Column(children: [
              _tileInfo(icon: Icons.phone_outlined, label: 'Teléfono', value: phone),
              _tileInfo(icon: Icons.email_outlined, label: 'Correo Electrónico', value: email),
              _tileInfo(icon: Icons.place_outlined, label: 'Dirección Domiciliaria', value: address.isNotEmpty ? address : '—'),
              if (city.isNotEmpty) _tileInfo(icon: Icons.location_city_outlined, label: '', value: city, subtle: true),
            ]),
          ),
          const SizedBox(height: 14),
        ],
      ),
    );
  }

  Widget _emergencySection() {
    final em = _extractEmergency();
    final name = em['name'] ?? '';
    final relation = em['relation'] ?? '';
    final phone = em['phone'] ?? '';
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 12),
      child: Container(
        decoration: BoxDecoration(
          gradient: const LinearGradient(colors: [Color(0xFFFFF1F2), Color(0xFFFFE4E6)]),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFFFCA5A5), width: 1.5),
        ),
        padding: const EdgeInsets.all(12),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: const [
            Icon(Icons.emergency, color: Color(0xFFDC2626)),
            SizedBox(width: 8),
            Text('Contacto de Emergencia', style: TextStyle(fontWeight: FontWeight.w800, color: Color(0xFF991B1B))),
          ]),
          const SizedBox(height: 8),
          Container(
            decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12)),
            child: Column(children: [
              _tileInfo(icon: Icons.person_outline, label: 'Nombre del Contacto', value: name.isNotEmpty ? name : '—', extra: relation.isNotEmpty ? '($relation)' : ''),
              Row(children: [
                Expanded(child: _tileInfo(icon: Icons.phone_outlined, label: 'Teléfono de Emergencia', value: phone.isNotEmpty ? phone : '—')),
                if (phone.isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF6E7E89),
                        foregroundColor: Colors.white,
                        shadowColor: const Color(0x66405362),
                        elevation: 4,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                      onPressed: () => _launchTel(phone),
                      child: const Text('Llamar'),
                    ),
                  ),
              ]),
            ]),
          ),
        ]),
      ),
    );
  }

  Future<void> _launchTel(String phone) async {
    final uri = Uri(scheme: 'tel', path: phone);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri);
    }
  }

  Map<String, String> _extractEmergency() {
    Map<String, dynamic> base = {};
    if (_emergency is Map<String, dynamic>) base = {...?_emergency};
    final nested = (_detail?['emergencyContact'] ?? _detail?['contactoEmergencia'] ?? _detail?['emergency_contact']);
    if (nested is Map<String, dynamic>) base = {...nested, ...base};
    final contactsList = (_detail?['contacts'] ?? _detail?['contactos'] ?? _detail?['employeeContacts']);
    if (contactsList is List) {
      for (final raw in contactsList) {
        if (raw is! Map) continue;
        final m = raw.cast<String, dynamic>();
        final type = (m['type'] ?? m['category'] ?? m['contactType'] ?? m['tipo'])?.toString().toUpperCase();
        final isEmergency = type == 'EMERGENCY' || type == 'EMERGENCIA' || (m['emergency'] == true);
        if (isEmergency) { base = {...m, ...base}; break; }
      }
    }
    final name = (base['name'] ?? base['nombre'] ?? base['fullName'] ??
            _detail?['contactName'] ?? _detail?['emergencyContactName'] ?? _detail?['emergency_name'] ?? _detail?['contactoEmergenciaNombre'])
        ?.toString();
    final relation = (base['relation'] ?? base['relacion'] ?? base['parentesco'] ??
            _detail?['contactKinship'] ?? _detail?['emergencyContactRelation'] ?? _detail?['emergency_relation'] ?? _detail?['contactoEmergenciaParentesco'])
        ?.toString();
    final phone = (base['phone'] ?? base['telefono'] ?? base['mobile'] ?? base['celular'] ?? base['emergencyPhone'] ?? base['telefono_emergencia'] ??
            _detail?['contactPhone'] ?? _detail?['emergencyContactPhone'] ?? _detail?['emergency_phone'] ?? _detail?['contactoEmergenciaTelefono'])
        ?.toString();
    return {
      'name': name ?? '',
      'relation': relation ?? '',
      'phone': phone ?? '',
    };
  }

  Widget _tileInfo({required IconData icon, required String label, required String value, String extra = '', bool subtle = false}) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(color: subtle ? const Color(0xFFF8FAFF) : Colors.white, borderRadius: BorderRadius.circular(12), boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 4, offset: const Offset(0, 2))]),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Container(width: 36, height: 36, decoration: BoxDecoration(color: const Color(0xFFF1F5F9), borderRadius: BorderRadius.circular(10)), child: Icon(icon, color: const Color(0xFF475569))),
        const SizedBox(width: 12),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          if (label.isNotEmpty) Text(label, style: const TextStyle(fontSize: 12, color: Color(0xFF64748B), fontWeight: FontWeight.w600)),
          const SizedBox(height: 2),
          Row(children: [
            Expanded(child: Text(value, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: Color(0xFF0F172A)))),
            if (extra.isNotEmpty) Text(extra, style: const TextStyle(fontSize: 12, color: Color(0xFF64748B))),
          ]),
        ])),
      ]),
    );
  }

  Widget _docsSection() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 12),
      child: FutureBuilder<List<Map<String, dynamic>>>(
        future: _docsFuture,
        builder: (context, snap) {
          final list = snap.data ?? const <Map<String, dynamic>>[];
          if (snap.connectionState == ConnectionState.waiting) {
            return const Center(child: Padding(padding: EdgeInsets.all(16), child: CircularProgressIndicator()));
          }
          if (list.isEmpty) {
            return const Padding(padding: EdgeInsets.all(16), child: Text('Sin documentos personales'));
          }
          return Column(
            children: list.map((doc) {
              final name = (doc['name'] ?? doc['documentName'] ?? doc['title'] ?? doc['fileName'] ?? 'Documento').toString();
              final date = _parseDate(doc['updatedAt'] ?? doc['createdAt']);
              final when = date != null ? _timeAgo(date) : '';
              return Container(
                margin: const EdgeInsets.only(bottom: 8),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(color: Theme.of(context).colorScheme.surface, borderRadius: BorderRadius.circular(12), border: Border.all(color: Theme.of(context).dividerColor)),
                child: Row(children: [
                  Container(width: 36, height: 36, decoration: BoxDecoration(color: Colors.blue.withOpacity(0.12), borderRadius: BorderRadius.circular(8)), child: const Icon(Icons.description, color: Colors.blue)),
                  const SizedBox(width: 12),
                  Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(name, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w600)),
                    if (when.isNotEmpty) Text(when, style: TextStyle(fontSize: 12, color: Colors.grey.shade600)),
                  ])),
                ]),
              );
            }).toList(),
          );
        },
      ),
    );
  }

  Widget _certsSection() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 12),
      child: FutureBuilder<List<Map<String, dynamic>>>(
        future: _certsFuture,
        builder: (context, snap) {
          final list = snap.data ?? const <Map<String, dynamic>>[];
          if (snap.connectionState == ConnectionState.waiting) {
            return const Center(child: Padding(padding: EdgeInsets.all(16), child: CircularProgressIndicator()));
          }
          if (list.isEmpty) {
            return const Padding(padding: EdgeInsets.all(16), child: Text('Sin cursos/certificaciones'));
          }
          return Column(
            children: list.map((c) {
              final name = (c['name'] ?? c['courseName'] ?? c['certificationName'] ?? 'Curso').toString();
              final completed = _parseDate(c['completedAt'] ?? c['date'] ?? c['createdAt']);
              final label = completed != null ? 'Completado: ${_formatMonthYear(completed)}' : '';
              return Container(
                margin: const EdgeInsets.only(bottom: 8),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(colors: [Color(0xFFFFFBEB), Color(0xFFFEF3C7)]),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFFFDE68A)),
                ),
                child: Row(children: [
                  Container(width: 40, height: 40, decoration: BoxDecoration(color: const Color(0xFFF59E0B), borderRadius: BorderRadius.circular(10)), child: const Icon(Icons.emoji_events, color: Colors.white)),
                  const SizedBox(width: 12),
                  Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(name, maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w700, color: Color(0xFF7C2D12))),
                    if (label.isNotEmpty) Text(label, style: const TextStyle(fontSize: 12, color: Color(0xFF92400E))),
                  ])),
                  Container(padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4), decoration: BoxDecoration(color: const Color(0xFFF59E0B), borderRadius: BorderRadius.circular(8)), child: const Text('Completado ✓', style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w700))),
                ]),
              );
            }).toList(),
          );
        },
      ),
    );
  }

  // Helpers reutilizados
  String _displayName(Map<String, dynamic> e) {
    final name = (e['name'] as String?)?.trim();
    final nombres = (e['nombres'] as String?)?.trim();
    final apellidos = (e['apellidos'] as String?)?.trim();
    if (name != null && name.isNotEmpty) return name;
    final combined = [nombres, apellidos].where((s) => s != null && s!.isNotEmpty).join(' ');
    return combined.isNotEmpty ? combined : (e['cedula']?.toString() ?? 'Empleado');
  }

  String? _photoUrl(Map<String, dynamic> e) {
    final raw = (e['profile_picture'] ?? e['imagePath'] ?? e['profilePicture'] ?? e['photo'] ?? e['foto'] ?? e['image'])?.toString();
    final path = raw?.trim();
    if (path == null || path.isEmpty) return null;
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    if (path.startsWith('/api/')) {
      final lastSlash = path.lastIndexOf('/');
      final prefix = path.substring(0, lastSlash + 1);
      final last = path.substring(lastSlash + 1);
      return '${AppConfig.baseUrl}$prefix${Uri.encodeComponent(last)}';
    }
    var normalized = path.replaceAll('\\', '/');
    while (normalized.startsWith('/')) normalized = normalized.substring(1);
    if (normalized.startsWith('uploads/')) normalized = normalized.substring('uploads/'.length);
    final hasSlash = normalized.contains('/');
    final filename = hasSlash ? (normalized.split('/').last) : normalized;
    final lower = normalized.toLowerCase();
    if (lower.startsWith('profiles/')) {
      final encoded = normalized.split('/').map(Uri.encodeComponent).join('/');
      return '${AppConfig.baseUrl}/api/files/$encoded';
    }
    if (!hasSlash) {
      return '${AppConfig.baseUrl}/api/files/profiles/${Uri.encodeComponent(filename)}';
    }
    final encoded = normalized.split('/').map(Uri.encodeComponent).join('/');
    return '${AppConfig.baseUrl}/api/files/$encoded';
  }

  Widget _infoRow(IconData icon, String label, String value) {
    if (value.trim().isEmpty) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(children: [
        Icon(icon, size: 18, color: Colors.grey.shade700),
        const SizedBox(width: 8),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(label, style: TextStyle(fontSize: 12, color: Colors.grey.shade600)),
          const SizedBox(height: 2),
          Text(value, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
        ])),
      ]),
    );
  }

  DateTime? _parseDate(dynamic v) {
    if (v == null) return null;
    try { return DateTime.tryParse(v.toString()); } catch (_) { return null; }
  }

  DateTime? _parseFlexibleDate(String s) {
    try {
      final trimmed = s.trim();
      if (trimmed.isEmpty) return null;
      final basic = DateTime.tryParse(trimmed);
      if (basic != null) return basic;
      final parts = trimmed.split(' ');
      final datePart = parts.first;
      final norm = datePart.replaceAll('/', '-');
      final ymd = RegExp(r'^(\d{4})-(\d{2})-(\d{2})$');
      final dmy = RegExp(r'^(\d{2})-(\d{2})-(\d{4})$');
      var m = ymd.firstMatch(norm);
      if (m != null) {
        final y = int.parse(m.group(1)!);
        final mo = int.parse(m.group(2)!);
        final d = int.parse(m.group(3)!);
        return DateTime(y, mo, d);
      }
      m = dmy.firstMatch(norm);
      if (m != null) {
        final d = int.parse(m.group(1)!);
        final mo = int.parse(m.group(2)!);
        final y = int.parse(m.group(3)!);
        return DateTime(y, mo, d);
      }
    } catch (_) {}
    return null;
  }

  String _formatLongDateText(String s) {
    if (s.trim().isEmpty) return '—';
    final dt = _parseFlexibleDate(s);
    if (dt == null) return s;
    const months = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
    return '${dt.day} de ${months[dt.month - 1]} de ${dt.year}';
  }

  String _timeAgo(DateTime date) {
    final now = DateTime.now();
    final diff = now.difference(date).inDays;
    if (diff <= 0) return 'Hoy';
    if (diff == 1) return 'Hace 1 día';
    if (diff < 30) return 'Hace $diff días';
    final months = (diff / 30).floor();
    if (months == 1) return 'Hace 1 mes';
    return 'Hace $months meses';
  }

  String _formatMonthYear(DateTime d) {
    const months = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    return '${months[d.month - 1]} ${d.year}';
  }
}
