import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import 'config/app_config.dart';
import 'pdf_viewer_page.dart';
import 'services/auth_service.dart';
import 'services/employees_service.dart';

/// Detalle del trabajador — Perfil según diseño entregado (lógica de datos intacta).
class EmployeeDetailScreen extends StatefulWidget {
  final Map<String, dynamic> employee;
  const EmployeeDetailScreen({super.key, required this.employee});

  @override
  State<EmployeeDetailScreen> createState() => _EmployeeDetailScreenState();
}

class _EmployeeDetailScreenState extends State<EmployeeDetailScreen> {
  // Paleta del diseño HTML
  static const _primary = Color(0xFF002045);
  static const _secondary = Color(0xFF5B5F61);
  static const _onBackground = Color(0xFF111C2C);
  static const _surface = Color(0xFFF9F9FF);
  static const _surfaceContainer = Color(0xFFE7EEFF);
  static const _surfaceLow = Color(0xFFF0F3FF);
  static const _surfaceVariant = Color(0xFFD8E3FA);
  static const _onSurfaceVariant = Color(0xFF43474E);
  static const _outlineVariant = Color(0xFFC4C6CF);
  static const _bodyBg = Color(0xFFE0E3E5);
  static const _error = Color(0xFFBA1A1A);
  static const _errorContainer = Color(0xFFFFDAD6);

  String _activeTab = 'info';
  Map<String, dynamic>? _detail;
  Map<String, dynamic>? _emergency;
  bool _loadingDetail = true;
  bool _loadingEmergency = true;

  late Future<List<Map<String, dynamic>>> _docsFuture;
  late Future<List<Map<String, dynamic>>> _coursesFuture;
  late Future<List<Map<String, dynamic>>> _cardsFuture;

  @override
  void initState() {
    super.initState();
    final beId = EmployeesService.businessEmployeeIdOf(widget.employee);
    _docsFuture = EmployeesService().getEmployeeDocuments(beId);
    _coursesFuture = EmployeesService().getEmployeeCourses(beId);
    _cardsFuture = EmployeesService().getEmployeeCards(beId);
    _hydrateFromServer();
  }

  Future<void> _hydrateFromServer() async {
    final e = widget.employee;
    final id = EmployeesService.businessEmployeeIdOf(e);
    final cedula = (e['cedula'] ?? e['dni'] ?? e['document'])?.toString();
    final ruc = AuthService().getPrimaryBusinessRuc();
    try {
      Map<String, dynamic>? detail;
      try {
        detail = await EmployeesService().getEmployeeDetail(id: id, cedula: cedula, businessRuc: ruc);
      } catch (_) {}
      if (!mounted) return;
      setState(() {
        _detail = detail;
        _loadingDetail = false;
      });

      final resolvedId = EmployeesService.businessEmployeeIdOf({...e, ...?detail});
      if (resolvedId != null && resolvedId.toString() != id?.toString()) {
        setState(() {
          _docsFuture = EmployeesService().getEmployeeDocuments(resolvedId);
          _coursesFuture = EmployeesService().getEmployeeCourses(resolvedId);
          _cardsFuture = EmployeesService().getEmployeeCards(resolvedId);
        });
      }

      Map<String, dynamic>? emergency;
      try {
        emergency = await EmployeesService().getEmergencyContact(id: resolvedId ?? id, cedula: cedula);
      } catch (_) {}
      if (!mounted) return;
      setState(() {
        _emergency = emergency;
        _loadingEmergency = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _loadingDetail = false;
        _loadingEmergency = false;
      });
    }
  }

  Map<String, dynamic> get _effective => <String, dynamic>{...widget.employee, ...?_detail};

  @override
  Widget build(BuildContext context) {
    final e = _effective;
    final title = _displayName(e).toUpperCase();
    final position = _str(e, ['positionName', 'position', 'cargo']);
    final department = _str(e, ['departmentName', 'department', 'departamento']);
    final photo = _photoUrl(e);
    final active = e['active'] == true || e['active'] == 1 || e['activo'] == true;

    return Scaffold(
      backgroundColor: _bodyBg,
      appBar: AppBar(
        backgroundColor: _primary,
        elevation: 0,
        foregroundColor: Colors.white,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => Navigator.of(context).maybePop(),
        ),
        title: const Text(
          'Detalle del trabajador',
          style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w600),
        ),
        titleSpacing: 0,
      ),
      body: Column(
        children: [
          // Header perfil (diseño)
          Container(
            width: double.infinity,
            padding: const EdgeInsets.fromLTRB(16, 28, 16, 32),
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [_primary, _surfaceContainer],
              ),
              borderRadius: BorderRadius.vertical(bottom: Radius.circular(12)),
              boxShadow: [BoxShadow(color: Color(0x1A1A365D), blurRadius: 8, offset: Offset(0, 2))],
            ),
            child: Column(
              children: [
                _avatar(photo, active),
                const SizedBox(height: 16),
                Text(
                  title,
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    color: _onBackground,
                    fontSize: 18,
                    fontWeight: FontWeight.w600,
                    height: 1.3,
                  ),
                ),
                if (position.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  Container(
                    constraints: const BoxConstraints(maxWidth: 320),
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                    decoration: BoxDecoration(
                      color: _surfaceVariant,
                      borderRadius: BorderRadius.circular(999),
                    ),
                    child: Text(
                      position,
                      textAlign: TextAlign.center,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: _onSurfaceVariant,
                        fontSize: 12,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                ],
                if (department.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.domain, size: 16, color: _secondary),
                      const SizedBox(width: 4),
                      Text(
                        department,
                        style: const TextStyle(color: _secondary, fontSize: 14, fontWeight: FontWeight.w400),
                      ),
                    ],
                  ),
                ],
              ],
            ),
          ),

          // Tabs pill
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 20, 16, 0),
            child: _tabsBar(),
          ),

          Expanded(
            child: _loadingDetail && _detail == null && _activeTab == 'info'
                ? const Center(child: CircularProgressIndicator(color: _primary))
                : SingleChildScrollView(
                    padding: const EdgeInsets.fromLTRB(16, 24, 16, 32),
                    child: _buildTabBody(e),
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildTabBody(Map<String, dynamic> e) {
    switch (_activeTab) {
      case 'docs':
        return _recordsSection(
          future: _docsFuture,
          emptyLabel: 'Sin documentos personales',
          itemBuilder: (doc) {
            final name = _nestedName(doc['type_document'] ?? doc['typeDocument'], fallbackKeys: ['name', 'documentName', 'title']) ??
                _str(doc, ['name', 'documentName', 'title', 'fileName'], fallback: 'Documento');
            final issue = _str(doc, ['start_date', 'startDate', 'issue_date', 'issueDate']);
            final expiry = _str(doc, ['end_date', 'endDate', 'expiry_date', 'expiryDate']);
            return _recordCard(
              icon: Icons.description_outlined,
              iconColor: _primary,
              title: name,
              issue: issue,
              expiry: expiry,
              file: EmployeesService.firstPdfFile(doc),
            );
          },
        );
      case 'courses':
        return _recordsSection(
          future: _coursesFuture,
          emptyLabel: 'Sin cursos',
          itemBuilder: (c) {
            final name = _nestedName(c['course'] ?? c['courseCertification'], fallbackKeys: ['name']) ??
                _str(c, ['name', 'courseName', 'certificationName'], fallback: 'Curso');
            final issue = _str(c, ['issue_date', 'issueDate', 'start_date']);
            final expiry = _str(c, ['expiry_date', 'expiryDate', 'end_date']);
            return _recordCard(
              icon: Icons.school_outlined,
              iconColor: _primary,
              title: name,
              issue: issue,
              expiry: expiry,
              file: EmployeesService.firstPdfFile(c),
            );
          },
        );
      case 'cards':
        return _recordsSection(
          future: _cardsFuture,
          emptyLabel: 'Sin tarjetas',
          itemBuilder: (card) {
            final name = _nestedName(card['card'], fallbackKeys: ['name']) ??
                _str(card, ['name', 'cardName'], fallback: 'Tarjeta');
            final number = _str(card, ['card_number', 'cardNumber', 'numero']);
            final issue = _str(card, ['issue_date', 'issueDate']);
            final expiry = _str(card, ['expiry_date', 'expiryDate']);
            final title = number.isEmpty ? name : '$name · $number';
            return _recordCard(
              icon: Icons.credit_card_outlined,
              iconColor: _primary,
              title: title,
              issue: issue,
              expiry: expiry,
              file: EmployeesService.firstPdfFile(card),
            );
          },
        );
      default:
        return _profileSection(e);
    }
  }

  /// Solo campos del diseño HTML.
  Widget _profileSection(Map<String, dynamic> e) {
    final cedula = _str(e, ['cedula', 'dni', 'document']);
    final birth = _formatDateDmy(_str(e, ['dateBirth', 'birthDate', 'dateOfBirth', 'fechaNacimiento', 'fecha_nacimiento']));
    final phone = _str(e, ['phone', 'telefono', 'mobile', 'celular']);
    final email = _str(e, ['email', 'correo']);
    final blood = _str(e, ['tipoSangre', 'bloodType']);
    final gender = _str(e, ['genderName', 'genero', 'gender']);
    final civil = _str(e, ['civilStatusName', 'estadoCivil']);
    final education = _str(e, ['nivelEducacion', 'degreeName', 'educationLevel']);
    final homeAddress = _str(e, ['direccionDomiciliaria', 'homeAddress', 'address', 'direccion']);
    final prov = _str(e, ['lugarNacimientoProvincia']);
    final cityBirth = _str(e, ['lugarNacimientoCiudad']);
    final ingreso = _formatDateDmy(_str(e, ['fechaIngreso', 'hireDate', 'fecha_ingreso']));
    final codigo = _str(e, ['codigoTrabajador', 'codigo']);

    final provinciaText = [
      if (prov.isNotEmpty) prov,
      if (cityBirth.isNotEmpty) cityBirth,
    ].join(' - ');

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _sectionTitle('Información Personal'),
        const SizedBox(height: 12),
        _card(
          children: [
            _dataRow(Icons.calendar_today, 'Fecha de Ingreso', ingreso.isEmpty ? '—' : ingreso),
            _divider(),
            _dataRow(Icons.badge_outlined, 'Código del Trabajador', codigo.isEmpty ? '—' : codigo),
            _divider(),
            _dataRow(Icons.credit_card, 'Cédula', cedula.isEmpty ? '—' : cedula),
            _divider(),
            _dataRow(Icons.cake_outlined, 'Fecha Nacimiento', birth.isEmpty ? '—' : birth),
            _divider(),
            _twoColRow(
              leftIcon: Icons.water_drop_outlined,
              leftLabel: 'Tipo Sangre',
              leftValue: blood.isEmpty ? '—' : blood,
              rightIcon: Icons.wc_outlined,
              rightLabel: 'Género',
              rightValue: gender.isEmpty ? '—' : gender,
            ),
            _divider(),
            _twoColRow(
              leftIcon: Icons.favorite_border,
              leftLabel: 'Estado Civil',
              leftValue: civil.isEmpty ? '—' : civil,
              rightIcon: Icons.school_outlined,
              rightLabel: 'Educación',
              rightValue: education.isEmpty ? '—' : education,
            ),
            _divider(),
            _dataRow(Icons.map_outlined, 'Provincia', provinciaText.isEmpty ? '—' : provinciaText),
            _divider(),
            _dataRow(Icons.home_outlined, 'Dirección Domiciliaria', homeAddress.isEmpty ? '—' : homeAddress),
          ],
        ),
        const SizedBox(height: 28),
        _sectionTitle('Contacto'),
        const SizedBox(height: 12),
        _card(
          children: [
            _dataRow(Icons.call_outlined, 'Teléfono', phone.isEmpty ? '—' : phone),
            _divider(),
            _dataRow(Icons.mail_outline, 'Correo Electrónico', email.isEmpty ? '—' : email),
          ],
        ),
        const SizedBox(height: 28),
        _emergencySection(),
      ],
    );
  }

  Widget _sectionTitle(String text) {
    return Padding(
      padding: const EdgeInsets.only(left: 4),
      child: Text(
        text,
        style: const TextStyle(
          color: _onBackground,
          fontSize: 18,
          fontWeight: FontWeight.w600,
          height: 1.3,
        ),
      ),
    );
  }

  Widget _card({required List<Widget> children}) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: const [
          BoxShadow(color: Color(0x141A365D), blurRadius: 12, offset: Offset(0, 4)),
        ],
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(children: children),
    );
  }

  Widget _divider() => const Divider(height: 1, thickness: 1, color: Color(0x33C4C6CF));

  Widget _dataRow(IconData icon, String label, String value) {
    return Padding(
      padding: const EdgeInsets.all(20),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: _surfaceLow,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon, color: _primary, size: 22),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: const TextStyle(color: _secondary, fontSize: 12, fontWeight: FontWeight.w500, height: 1.3),
                ),
                const SizedBox(height: 2),
                Text(
                  value,
                  style: const TextStyle(color: _primary, fontSize: 14, fontWeight: FontWeight.w600, height: 1.4),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _twoColRow({
    required IconData leftIcon,
    required String leftLabel,
    required String leftValue,
    required IconData rightIcon,
    required String rightLabel,
    required String rightValue,
  }) {
    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Expanded(child: _compactCell(leftIcon, leftLabel, leftValue)),
          Container(width: 1, color: const Color(0x33C4C6CF)),
          Expanded(child: _compactCell(rightIcon, rightLabel, rightValue)),
        ],
      ),
    );
  }

  Widget _compactCell(IconData icon, String label, String value) {
    return Padding(
      padding: const EdgeInsets.all(20),
      child: Row(
        children: [
          Icon(icon, color: _primary.withValues(alpha: 0.7), size: 20),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label, style: const TextStyle(color: _secondary, fontSize: 12, fontWeight: FontWeight.w500)),
                const SizedBox(height: 2),
                Text(
                  value,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(color: _primary, fontSize: 14, fontWeight: FontWeight.w600),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _emergencySection() {
    final em = _extractEmergency();
    final name = em['name'] ?? '';
    final relation = em['relation'] ?? '';
    final phone = em['phone'] ?? '';
    final hasAny = name.isNotEmpty || relation.isNotEmpty || phone.isNotEmpty;
    final nameText = _loadingEmergency && !hasAny ? 'Cargando...' : (name.isNotEmpty ? name : '—');
    final phoneText = _loadingEmergency && !hasAny ? 'Cargando...' : (phone.isNotEmpty ? phone : '—');
    final relationText = relation.isNotEmpty ? '(${relation.toUpperCase()})' : '';

    return Container(
      decoration: BoxDecoration(
        color: _errorContainer.withValues(alpha: 0.3),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: _error.withValues(alpha: 0.2)),
      ),
      padding: const EdgeInsets.all(4),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Padding(
            padding: EdgeInsets.fromLTRB(12, 10, 12, 8),
            child: Row(
              children: [
                Icon(Icons.medical_services, color: _error, size: 22),
                SizedBox(width: 8),
                Text(
                  'Contacto de Emergencia',
                  style: TextStyle(color: _error, fontSize: 18, fontWeight: FontWeight.w600),
                ),
              ],
            ),
          ),
          Container(
            margin: const EdgeInsets.fromLTRB(4, 0, 4, 4),
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(8),
              boxShadow: const [
                BoxShadow(color: Color(0x141A365D), blurRadius: 12, offset: Offset(0, 4)),
              ],
            ),
            child: Column(
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: _surfaceLow,
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: const Icon(Icons.person_outline, color: _secondary, size: 22),
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text(
                                  'Nombre del Contacto',
                                  style: TextStyle(color: _secondary, fontSize: 12, fontWeight: FontWeight.w500),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  nameText,
                                  style: const TextStyle(
                                    color: _onBackground,
                                    fontSize: 14,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                    if (relationText.isNotEmpty)
                      Text(
                        relationText,
                        style: const TextStyle(
                          color: _secondary,
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          letterSpacing: 0.6,
                        ),
                      ),
                  ],
                ),
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 16),
                  child: Divider(height: 1, color: Color(0x33C4C6CF)),
                ),
                Row(
                  children: [
                    Expanded(
                      child: Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: _surfaceLow,
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: const Icon(Icons.phone_iphone, color: _secondary, size: 22),
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text(
                                  'Teléfono de Emergencia',
                                  style: TextStyle(color: _secondary, fontSize: 12, fontWeight: FontWeight.w500),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  phoneText,
                                  style: const TextStyle(
                                    color: _onBackground,
                                    fontSize: 14,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                    if (phone.isNotEmpty)
                      TextButton(
                        onPressed: () => _launchTel(phone),
                        style: TextButton.styleFrom(
                          backgroundColor: _secondary,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 10),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                        ),
                        child: const Text('Llamar', style: TextStyle(fontWeight: FontWeight.w500)),
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

  Widget _tabsBar() {
    final tabs = <MapEntry<String, String>>[
      const MapEntry('info', 'Perfil'),
      const MapEntry('docs', 'Documentos'),
      const MapEntry('courses', 'Cursos'),
      const MapEntry('cards', 'Tarjetas'),
    ];
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: _outlineVariant.withValues(alpha: 0.3)),
        boxShadow: const [BoxShadow(color: Color(0x0A000000), blurRadius: 4, offset: Offset(0, 1))],
      ),
      child: Row(
        children: tabs.map((t) {
          final selected = _activeTab == t.key;
          return Expanded(
            child: GestureDetector(
              onTap: () => setState(() => _activeTab = t.key),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 180),
                padding: const EdgeInsets.symmetric(vertical: 10),
                decoration: BoxDecoration(
                  color: selected ? _secondary : Colors.transparent,
                  borderRadius: BorderRadius.circular(999),
                  boxShadow: selected
                      ? const [BoxShadow(color: Color(0x1A000000), blurRadius: 4, offset: Offset(0, 1))]
                      : null,
                ),
                alignment: Alignment.center,
                child: Text(
                  t.value,
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                    color: selected ? Colors.white : _secondary,
                  ),
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget _avatar(String? photo, bool active) {
    return SizedBox(
      width: 96,
      height: 96,
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          Container(
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              border: Border.all(color: _surface, width: 4),
              boxShadow: const [BoxShadow(color: Color(0x1A000000), blurRadius: 6, offset: Offset(0, 2))],
            ),
            child: ClipOval(
              child: Container(
                width: 96,
                height: 96,
                color: _surfaceVariant,
                child: photo != null
                    ? Image.network(
                        photo,
                        fit: BoxFit.cover,
                        width: 96,
                        height: 96,
                        errorBuilder: (_, __, ___) => const Icon(Icons.person, size: 48, color: _secondary),
                      )
                    : const Icon(Icons.person, size: 48, color: _secondary),
              ),
            ),
          ),
          Positioned(
            right: 2,
            bottom: 2,
            child: Container(
              width: 24,
              height: 24,
              decoration: BoxDecoration(
                color: active ? const Color(0xFF22C55E) : Colors.grey,
                shape: BoxShape.circle,
                border: Border.all(color: _surface, width: 2),
              ),
              child: Icon(active ? Icons.check : Icons.remove, color: Colors.white, size: 14),
            ),
          ),
        ],
      ),
    );
  }

  Widget _recordsSection({
    required Future<List<Map<String, dynamic>>> future,
    required String emptyLabel,
    required Widget Function(Map<String, dynamic>) itemBuilder,
  }) {
    return FutureBuilder<List<Map<String, dynamic>>>(
      future: future,
      builder: (context, snap) {
        if (snap.connectionState == ConnectionState.waiting) {
          return const Padding(
            padding: EdgeInsets.all(24),
            child: Center(child: CircularProgressIndicator(color: _primary)),
          );
        }
        final list = snap.data ?? const <Map<String, dynamic>>[];
        if (list.isEmpty) {
          return Padding(
            padding: const EdgeInsets.all(24),
            child: Center(child: Text(emptyLabel, style: const TextStyle(color: _secondary))),
          );
        }
        return Column(children: list.map(itemBuilder).toList());
      },
    );
  }

  Widget _recordCard({
    required IconData icon,
    required Color iconColor,
    required String title,
    required String issue,
    required String expiry,
    Map<String, dynamic>? file,
  }) {
    final status = _expiryStatus(expiry);
    final days = _daysLeft(expiry);
    final pdfUrl = file != null ? EmployeesService.fileAbsoluteUrl(file['file']) : null;
    final canOpenPdf = pdfUrl != null && EmployeesService.isPdfFile(file);

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: const [
          BoxShadow(color: Color(0x141A365D), blurRadius: 12, offset: Offset(0, 4)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(color: _surfaceLow, borderRadius: BorderRadius.circular(8)),
                child: Icon(icon, color: iconColor, size: 22),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  title,
                  style: const TextStyle(color: _primary, fontWeight: FontWeight.w600, fontSize: 14),
                ),
              ),
              if (canOpenPdf)
                IconButton(
                  tooltip: 'Ver PDF',
                  onPressed: () => _openPdf(pdfUrl, title),
                  icon: const Icon(Icons.picture_as_pdf, color: _error),
                ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(child: _dateCol('Emisión', _formatDateDmy(issue))),
              Expanded(child: _dateCol('Vencimiento', _formatDateDmy(expiry))),
              Column(
                children: [
                  _expiryBadge(status),
                  if (days != null) ...[
                    const SizedBox(height: 4),
                    Text('$days', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16, color: _primary)),
                    const Text('Días', style: TextStyle(fontSize: 10, color: _secondary)),
                  ],
                ],
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _dateCol(String label, String value) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(fontSize: 11, color: _secondary, fontWeight: FontWeight.w500)),
        const SizedBox(height: 2),
        Text(value.isEmpty ? '—' : value, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: _primary)),
      ],
    );
  }

  Widget _expiryBadge(String status) {
    Color bg;
    Color fg;
    switch (status) {
      case 'Caducado':
        bg = const Color(0xFFFEE2E2);
        fg = const Color(0xFFB91C1C);
        break;
      case 'Próximo a vencer':
        bg = const Color(0xFFFEF3C7);
        fg = const Color(0xFFB45309);
        break;
      case 'Vigente':
        bg = const Color(0xFFDCFCE7);
        fg = const Color(0xFF15803D);
        break;
      default:
        bg = _surfaceLow;
        fg = _secondary;
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(8)),
      child: Text(status, style: TextStyle(color: fg, fontSize: 11, fontWeight: FontWeight.w700)),
    );
  }

  void _openPdf(String url, String title) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => PdfViewerPage(url: url),
        settings: RouteSettings(name: '/pdf-viewer', arguments: url),
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
    final name = (base['name'] ??
            base['nombre'] ??
            base['fullName'] ??
            _detail?['contactName'] ??
            _detail?['emergencyContactName'])
        ?.toString();
    final relation = (base['relation'] ??
            base['relacion'] ??
            base['parentesco'] ??
            _detail?['contactKinship'] ??
            _detail?['emergencyContactRelation'])
        ?.toString();
    final phone = (base['phone'] ??
            base['telefono'] ??
            base['mobile'] ??
            base['celular'] ??
            _detail?['contactPhone'] ??
            _detail?['emergencyContactPhone'])
        ?.toString();
    return {
      'name': name ?? '',
      'relation': relation ?? '',
      'phone': phone ?? '',
    };
  }

  String _displayName(Map<String, dynamic> e) {
    final name = (e['name'] as String?)?.trim();
    final nombres = (e['nombres'] as String?)?.trim();
    final apellidos = (e['apellidos'] as String?)?.trim();
    if (name != null && name.isNotEmpty && (apellidos == null || apellidos.isEmpty)) return name;
    final combined = [nombres ?? name, apellidos].where((s) => (s ?? '').isNotEmpty).join(' ');
    return combined.isNotEmpty ? combined : (e['cedula']?.toString() ?? 'Empleado');
  }

  String? _photoUrl(Map<String, dynamic> e) {
    final raw = (e['profile_picture'] ?? e['imagePath'] ?? e['profilePicture'] ?? e['photo'] ?? e['foto'] ?? e['image'])
        ?.toString();
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
    while (normalized.startsWith('/')) {
      normalized = normalized.substring(1);
    }
    if (normalized.startsWith('uploads/')) normalized = normalized.substring('uploads/'.length);
    final hasSlash = normalized.contains('/');
    final filename = hasSlash ? normalized.split('/').last : normalized;
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

  String _str(Map<String, dynamic> m, List<String> keys, {String fallback = ''}) {
    for (final k in keys) {
      final v = m[k];
      if (v == null) continue;
      final s = v.toString().trim();
      if (s.isNotEmpty && s.toLowerCase() != 'null') return s;
    }
    return fallback;
  }

  String? _nestedName(dynamic nested, {required List<String> fallbackKeys}) {
    if (nested is Map) {
      final m = nested.cast<String, dynamic>();
      for (final k in fallbackKeys) {
        final v = m[k]?.toString().trim();
        if (v != null && v.isNotEmpty) return v;
      }
    }
    return null;
  }

  DateTime? _parseDate(String? s) {
    if (s == null || s.trim().isEmpty) return null;
    final trimmed = s.trim();
    final basic = DateTime.tryParse(trimmed);
    if (basic != null) return DateTime(basic.year, basic.month, basic.day);
    final norm = trimmed.split(' ').first.replaceAll('/', '-');
    final ymd = RegExp(r'^(\d{4})-(\d{2})-(\d{2})$').firstMatch(norm);
    if (ymd != null) {
      return DateTime(int.parse(ymd.group(1)!), int.parse(ymd.group(2)!), int.parse(ymd.group(3)!));
    }
    final dmy = RegExp(r'^(\d{2})-(\d{2})-(\d{4})$').firstMatch(norm);
    if (dmy != null) {
      return DateTime(int.parse(dmy.group(3)!), int.parse(dmy.group(2)!), int.parse(dmy.group(1)!));
    }
    return null;
  }

  String _formatDateDmy(String raw) {
    if (raw.trim().isEmpty) return '';
    final dt = _parseDate(raw);
    if (dt == null) return raw;
    final d = dt.day.toString().padLeft(2, '0');
    final m = dt.month.toString().padLeft(2, '0');
    return '$d/$m/${dt.year}';
  }

  String _expiryStatus(String expiryRaw) {
    final dt = _parseDate(expiryRaw);
    if (dt == null) return '—';
    final today = DateTime.now();
    final startToday = DateTime(today.year, today.month, today.day);
    final days = dt.difference(startToday).inDays;
    if (days < 0) return 'Caducado';
    if (days <= 30) return 'Próximo a vencer';
    return 'Vigente';
  }

  int? _daysLeft(String expiryRaw) {
    final dt = _parseDate(expiryRaw);
    if (dt == null) return null;
    final today = DateTime.now();
    final startToday = DateTime(today.year, today.month, today.day);
    return dt.difference(startToday).inDays;
  }
}
