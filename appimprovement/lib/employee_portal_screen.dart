import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import 'services/auth_service.dart';
import 'services/employee_panel_service.dart';

/// Portal del trabajador (móvil) — diseño TalentPulse / perfil empleado.
class EmployeePortalScreen extends StatefulWidget {
  const EmployeePortalScreen({super.key});

  @override
  State<EmployeePortalScreen> createState() => _EmployeePortalScreenState();
}

class _EmployeePortalScreenState extends State<EmployeePortalScreen> {
  static const _bg = Color(0xFFF8F9FA);
  static const _surfaceLowest = Color(0xFFFFFFFF);
  static const _primary = Color(0xFF0059BB);
  static const _onSurface = Color(0xFF191C1D);
  static const _onSurfaceVariant = Color(0xFF414754);
  static const _outlineVariant = Color(0xFFC1C6D7);
  static const _tertiaryContainer = Color(0xFF008730);
  static const _onTertiaryContainer = Color(0xFFF7FFF2);
  static const _surface = Color(0xFFF8F9FA);
  static const _surfaceContainer = Color(0xFFEDEEEF);

  final _panel = EmployeePanelService();

  int _tabIndex = 4; // Mi Perfil por defecto (como el mock)
  bool _loading = true;
  String? _error;

  Map<String, dynamic>? _profile;
  Map<String, dynamic>? _dashboard;
  List<Map<String, dynamic>> _documents = const [];
  List<Map<String, dynamic>> _courses = const [];
  List<Map<String, dynamic>> _cards = const [];

  static const _tabs = ['Resumen', 'Documentos', 'Cursos', 'Tarjetas', 'Mi Perfil'];

  @override
  void initState() {
    super.initState();
    _bootstrap();
  }

  Future<void> _bootstrap() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final results = await Future.wait([
        _panel.getMyProfile(),
        _panel.getMyDashboard(),
      ]);
      if (!mounted) return;
      setState(() {
        _profile = results[0];
        _dashboard = results[1];
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString().replaceFirst('Exception: ', '');
        _loading = false;
      });
    }
  }

  Future<void> _ensureTabData(int index) async {
    try {
      if (index == 1 && _documents.isEmpty) {
        final list = await _panel.getMyDocuments();
        if (mounted) setState(() => _documents = list);
      } else if (index == 2 && _courses.isEmpty) {
        final list = await _panel.getMyCourses();
        if (mounted) setState(() => _courses = list);
      } else if (index == 3 && _cards.isEmpty) {
        final list = await _panel.getMyCards();
        if (mounted) setState(() => _cards = list);
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(e.toString().replaceFirst('Exception: ', '')),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  Future<void> _logout() async {
    await AuthService().logout();
    if (!mounted) return;
    Navigator.pushNamedAndRemoveUntil(context, '/login', (_) => false);
  }

  String get _displayName {
    final p = _profile;
    if (p == null) return AuthService().userDetail?['name']?.toString() ?? 'Trabajador';
    return (p['fullName'] ?? '${p['nombres'] ?? ''} ${p['apellidos'] ?? ''}').toString().trim();
  }

  String get _position {
    return (_profile?['position'] ?? _dashboard?['position'] ?? 'Trabajador').toString();
  }

  bool get _isActive {
    final a = _profile?['active'] ?? _dashboard?['active'];
    if (a is bool) return a;
    final s = (_profile?['status'] ?? '').toString().toUpperCase();
    return s != 'INACTIVO';
  }

  String? get _avatarUrl {
    final path = _profile?['imagePath']?.toString();
    final url = _panel.resolveImageUrl(path);
    return url.isEmpty ? null : url;
  }

  @override
  Widget build(BuildContext context) {
    final textTheme = GoogleFonts.manropeTextTheme(Theme.of(context).textTheme);

    return Theme(
      data: Theme.of(context).copyWith(textTheme: textTheme),
      child: Scaffold(
        backgroundColor: _bg,
        body: SafeArea(
          child: Column(
            children: [
              _buildAppBar(),
              if (_loading)
                const Expanded(child: Center(child: CircularProgressIndicator(color: _primary)))
              else if (_error != null)
                Expanded(child: _buildError())
              else ...[
                _buildProfileHeader(),
                _buildTabs(),
                Expanded(child: _buildTabBody()),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildAppBar() {
    return Container(
      height: 64,
      padding: const EdgeInsets.symmetric(horizontal: 16),
      decoration: const BoxDecoration(
        color: _surfaceLowest,
        border: Border(bottom: BorderSide(color: _outlineVariant)),
        boxShadow: [BoxShadow(color: Color(0x0A000000), blurRadius: 4, offset: Offset(0, 1))],
      ),
      child: Row(
        children: [
          IconButton(
            onPressed: _logout,
            icon: const Icon(Icons.arrow_back, color: _onSurfaceVariant),
            tooltip: 'Cerrar sesión',
          ),
          Expanded(
            child: Text(
              'Perfil del Empleado',
              style: GoogleFonts.manrope(
                fontSize: 20,
                fontWeight: FontWeight.w700,
                color: _primary,
                height: 1.4,
              ),
            ),
          ),
          PopupMenuButton<String>(
            icon: const Icon(Icons.more_vert, color: _onSurfaceVariant),
            onSelected: (v) {
              if (v == 'logout') _logout();
              if (v == 'refresh') _bootstrap();
            },
            itemBuilder: (_) => const [
              PopupMenuItem(value: 'refresh', child: Text('Actualizar')),
              PopupMenuItem(value: 'logout', child: Text('Cerrar sesión')),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildError() {
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.error_outline, color: Color(0xFFBA1A1A), size: 48),
          const SizedBox(height: 12),
          Text(
            _error!,
            textAlign: TextAlign.center,
            style: GoogleFonts.manrope(fontSize: 14, color: _onSurfaceVariant),
          ),
          const SizedBox(height: 16),
          FilledButton(
            onPressed: _bootstrap,
            style: FilledButton.styleFrom(backgroundColor: _primary),
            child: const Text('Reintentar'),
          ),
          TextButton(onPressed: _logout, child: const Text('Cerrar sesión')),
        ],
      ),
    );
  }

  Widget _buildProfileHeader() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(16, 24, 16, 16),
      decoration: const BoxDecoration(
        color: _surfaceLowest,
        border: Border(bottom: BorderSide(color: _outlineVariant)),
      ),
      child: Column(
        children: [
          Stack(
            clipBehavior: Clip.none,
            children: [
              Container(
                width: 128,
                height: 128,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(color: _surfaceLowest, width: 4),
                  boxShadow: const [
                    BoxShadow(color: Color(0x14000000), blurRadius: 6, offset: Offset(0, 1)),
                  ],
                  color: const Color(0xFFE1E3E4),
                ),
                clipBehavior: Clip.antiAlias,
                child: _avatarUrl != null
                    ? Image.network(
                        _avatarUrl!,
                        fit: BoxFit.cover,
                        errorBuilder: (_, __, ___) => const Icon(Icons.person, size: 64, color: Color(0xFF717786)),
                      )
                    : const Icon(Icons.person, size: 64, color: Color(0xFF717786)),
              ),
              Positioned(
                right: 8,
                bottom: 0,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: _isActive ? _tertiaryContainer : const Color(0xFFE1E3E4),
                    borderRadius: BorderRadius.circular(999),
                    border: Border.all(color: _surfaceLowest, width: 2),
                  ),
                  child: Text(
                    _isActive ? 'ACTIVO' : 'INACTIVO',
                    style: GoogleFonts.manrope(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 0.55,
                      color: _isActive ? _onTertiaryContainer : _onSurfaceVariant,
                    ),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Text(
            _displayName,
            textAlign: TextAlign.center,
            style: GoogleFonts.manrope(
              fontSize: 20,
              fontWeight: FontWeight.w700,
              height: 1.4,
              color: _onSurface,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            _position,
            textAlign: TextAlign.center,
            style: GoogleFonts.manrope(
              fontSize: 14,
              fontWeight: FontWeight.w500,
              height: 1.4,
              color: _onSurfaceVariant,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTabs() {
    return Container(
      decoration: const BoxDecoration(
        color: _surfaceLowest,
        border: Border(bottom: BorderSide(color: _outlineVariant)),
      ),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        child: Row(
          children: List.generate(_tabs.length, (i) {
            final selected = _tabIndex == i;
            return Padding(
              padding: const EdgeInsets.only(right: 24),
              child: InkWell(
                onTap: () async {
                  setState(() => _tabIndex = i);
                  await _ensureTabData(i);
                },
                child: Container(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  decoration: BoxDecoration(
                    border: Border(
                      bottom: BorderSide(
                        color: selected ? _primary : Colors.transparent,
                        width: 2,
                      ),
                    ),
                  ),
                  child: Text(
                    _tabs[i],
                    style: GoogleFonts.manrope(
                      fontSize: 14,
                      fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
                      color: selected ? _primary : _onSurfaceVariant,
                    ),
                  ),
                ),
              ),
            );
          }),
        ),
      ),
    );
  }

  Widget _buildTabBody() {
    switch (_tabIndex) {
      case 0:
        return _buildResumen();
      case 1:
        return _buildListTab(
          emptyIcon: Icons.folder_open,
          emptyText: 'No tienes documentos cargados aún.',
          items: _documents,
          titleOf: (m) => (m['name'] ?? 'Documento').toString(),
          subtitleOf: (m) =>
              '${m['businessName'] ?? '—'} · ${m['status'] ?? '—'}',
        );
      case 2:
        return _buildListTab(
          emptyIcon: Icons.school_outlined,
          emptyText: 'No tienes cursos asignados aún.',
          items: _courses,
          titleOf: (m) => (m['name'] ?? 'Curso').toString(),
          subtitleOf: (m) =>
              '${m['businessName'] ?? '—'} · ${m['status'] ?? (m['completed'] == true ? 'VIGENTE' : 'PENDIENTE')}',
        );
      case 3:
        return _buildListTab(
          emptyIcon: Icons.badge_outlined,
          emptyText: 'No tienes tarjetas registradas aún.',
          items: _cards,
          titleOf: (m) => (m['name'] ?? 'Tarjeta').toString(),
          subtitleOf: (m) =>
              '${m['businessName'] ?? '—'} · ${m['status'] ?? '—'}',
        );
      default:
        return _buildPerfil();
    }
  }

  Widget _buildResumen() {
    final d = _dashboard ?? {};
    final stats = <_StatItem>[
      _StatItem('Documentos', '${d['totalDocuments'] ?? 0}', Icons.description_outlined),
      _StatItem('Vigentes', '${d['documentsVigentes'] ?? 0}', Icons.check_circle_outline),
      _StatItem('Por vencer', '${d['documentsPorVencer'] ?? 0}', Icons.warning_amber_outlined),
      _StatItem('Vencidos', '${d['documentsVencidos'] ?? 0}', Icons.cancel_outlined),
      _StatItem('Cursos', '${d['totalCourses'] ?? 0}', Icons.school_outlined),
      _StatItem('Completados', '${d['coursesCompleted'] ?? 0}', Icons.workspace_premium_outlined),
    ];
    final alerts = (d['alerts'] as List?) ?? const [];

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Wrap(
          spacing: 12,
          runSpacing: 12,
          children: stats
              .map(
                (s) => SizedBox(
                  width: (MediaQuery.of(context).size.width - 44) / 2,
                  child: _statCard(s),
                ),
              )
              .toList(),
        ),
        const SizedBox(height: 16),
        if (alerts.isEmpty)
          _emptyBox(Icons.check_circle, 'No tienes alertas pendientes. ¡Todo en orden!')
        else
          _sectionCard(
            icon: Icons.notifications_outlined,
            title: 'Alertas',
            child: Column(
              children: alerts.map((a) {
                final map = a is Map ? a.cast<String, dynamic>() : <String, dynamic>{};
                return Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFFF4D6),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      (map['message'] ?? '').toString(),
                      style: GoogleFonts.manrope(fontSize: 13, color: const Color(0xFF9A6B00)),
                    ),
                  ),
                );
              }).toList(),
            ),
          ),
      ],
    );
  }

  Widget _statCard(_StatItem s) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: _surfaceLowest,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: _outlineVariant),
      ),
      child: Column(
        children: [
          Icon(s.icon, color: _primary),
          const SizedBox(height: 8),
          Text(
            s.value,
            style: GoogleFonts.manrope(fontSize: 24, fontWeight: FontWeight.w800, color: _onSurface),
          ),
          Text(
            s.label.toUpperCase(),
            style: GoogleFonts.manrope(
              fontSize: 11,
              fontWeight: FontWeight.w700,
              letterSpacing: 0.5,
              color: const Color(0xFF717786),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildListTab({
    required IconData emptyIcon,
    required String emptyText,
    required List<Map<String, dynamic>> items,
    required String Function(Map<String, dynamic>) titleOf,
    required String Function(Map<String, dynamic>) subtitleOf,
  }) {
    if (items.isEmpty) {
      return Center(child: _emptyBox(emptyIcon, emptyText));
    }
    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: items.length,
      separatorBuilder: (_, __) => const SizedBox(height: 10),
      itemBuilder: (_, i) {
        final m = items[i];
        return Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: _surfaceLowest,
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: _outlineVariant),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                titleOf(m),
                style: GoogleFonts.manrope(fontSize: 14, fontWeight: FontWeight.w600, color: _onSurface),
              ),
              const SizedBox(height: 4),
              Text(
                subtitleOf(m),
                style: GoogleFonts.manrope(fontSize: 12, color: _onSurfaceVariant),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildPerfil() {
    final p = _profile ?? {};
    final businesses = (p['businesses'] as List?) ?? const [];
    final empresa = businesses.isNotEmpty
        ? businesses.map((b) => (b is Map ? (b['name'] ?? '—') : '—').toString()).join(', ')
        : (p['businessName'] ?? '—').toString();

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        _sectionCard(
          icon: Icons.person_outline,
          title: 'Información Personal',
          child: Column(
            children: [
              _dataCell('NOMBRE COMPLETO', _displayName),
              _dataCell('CÉDULA', (p['cedula'] ?? '—').toString()),
              _dataCell('CORREO ELECTRÓNICO', (p['email'] ?? '—').toString()),
              Row(
                children: [
                  Expanded(child: _dataCell('TELÉFONO', (p['phone'] ?? '—').toString())),
                  const SizedBox(width: 12),
                  SizedBox(
                    width: MediaQuery.of(context).size.width * 0.28,
                    child: _dataCell('TIPO DE SANGRE', (p['tipoSangre'] ?? '—').toString()),
                  ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        _sectionCard(
          icon: Icons.work_outline,
          title: 'Detalles de Empleo',
          child: Column(
            children: [
              _dataCell('EMPRESA', empresa, accent: true),
              _dataCell('DEPARTAMENTO', (p['department'] ?? '—').toString()),
              _dataCell('CARGO', (p['position'] ?? '—').toString()),
              _dataCell('FECHA DE INGRESO', (p['fechaIngreso'] ?? '—').toString()),
            ],
          ),
        ),
        const SizedBox(height: 12),
        OutlinedButton.icon(
          onPressed: () {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('Para actualizar datos, contacta a Talento Humano.'),
              ),
            );
          },
          style: OutlinedButton.styleFrom(
            foregroundColor: _onSurface,
            backgroundColor: _surfaceContainer,
            side: const BorderSide(color: _outlineVariant),
            padding: const EdgeInsets.symmetric(vertical: 16),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
          ),
          icon: const Icon(Icons.edit_outlined),
          label: Text(
            'Solicitar Actualización de Datos',
            style: GoogleFonts.manrope(fontSize: 14, fontWeight: FontWeight.w500),
          ),
        ),
        const SizedBox(height: 24),
      ],
    );
  }

  Widget _sectionCard({
    required IconData icon,
    required String title,
    required Widget child,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: _surfaceLowest,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: _outlineVariant),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.only(bottom: 8),
            margin: const EdgeInsets.only(bottom: 8),
            decoration: const BoxDecoration(
              border: Border(bottom: BorderSide(color: _outlineVariant)),
            ),
            child: Row(
              children: [
                Icon(icon, color: _primary, size: 22),
                const SizedBox(width: 8),
                Text(
                  title,
                  style: GoogleFonts.manrope(
                    fontSize: 18,
                    fontWeight: FontWeight.w600,
                    color: _onSurface,
                  ),
                ),
              ],
            ),
          ),
          child,
        ],
      ),
    );
  }

  Widget _dataCell(String label, String value, {bool accent = false}) {
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        color: _surface,
        borderRadius: BorderRadius.circular(4),
        border: Border.all(color: _outlineVariant),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: GoogleFonts.manrope(
              fontSize: 11,
              fontWeight: FontWeight.w700,
              letterSpacing: 0.55,
              color: _onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            value,
            style: GoogleFonts.manrope(
              fontSize: 14,
              fontWeight: accent ? FontWeight.w700 : FontWeight.w500,
              color: accent ? _primary : _onSurface,
            ),
          ),
        ],
      ),
    );
  }

  Widget _emptyBox(IconData icon, String text) {
    return Padding(
      padding: const EdgeInsets.all(32),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, size: 48, color: const Color(0xFF717786)),
          const SizedBox(height: 12),
          Text(
            text,
            textAlign: TextAlign.center,
            style: GoogleFonts.manrope(fontSize: 14, color: _onSurfaceVariant),
          ),
        ],
      ),
    );
  }
}

class _StatItem {
  final String label;
  final String value;
  final IconData icon;
  const _StatItem(this.label, this.value, this.icon);
}
