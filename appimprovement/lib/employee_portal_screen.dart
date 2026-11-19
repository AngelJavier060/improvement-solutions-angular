import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import 'aula/aula_virtual_panel.dart';
import 'cartilla/cartilla_panel.dart';
import 'services/auth_service.dart';
import 'services/employee_panel_service.dart';

/// Portal del trabajador. Los números y el nombre salen del servidor.
class EmployeePortalScreen extends StatefulWidget {
  const EmployeePortalScreen({super.key});

  @override
  State<EmployeePortalScreen> createState() => _EmployeePortalScreenState();
}

class _NavTab {
  final String label;
  final IconData icon;
  final Color tint;
  const _NavTab(this.label, this.icon, this.tint);
}

class _EmployeePortalScreenState extends State<EmployeePortalScreen> {
  static const _bg = Color(0xFFF8FAFC);
  static const _ink = Color(0xFF0F172A);
  static const _muted = Color(0xFF64748B);
  static const _line = Color(0xFFE2E8F0);
  static const _blue = Color(0xFF1D4ED8);
  static const _blueDeep = Color(0xFF1E40AF);

  static const _soft = [
    BoxShadow(color: Color(0x0F0F172A), blurRadius: 20, offset: Offset(0, 4)),
    BoxShadow(color: Color(0x080F172A), blurRadius: 6, offset: Offset(0, 2)),
  ];

  final _panel = EmployeePanelService();

  int _tabIndex = 0;
  bool _loading = true;
  String? _error;

  Map<String, dynamic>? _profile;
  Map<String, dynamic>? _dashboard;
  List<Map<String, dynamic>> _documents = const [];
  List<Map<String, dynamic>> _courses = const [];
  List<Map<String, dynamic>> _cards = const [];
  int? _unirseCursoId;

  static const _tabs = <_NavTab>[
    _NavTab('Resumen', Icons.grid_view_rounded, _blue),
    _NavTab('Mi Perfil', Icons.person_outline, Color(0xFF475569)),
    _NavTab('Documentos', Icons.description_outlined, _blue),
    _NavTab('Cursos', Icons.school_outlined, Color(0xFF4F46E5)),
    _NavTab('Tarjetas', Icons.credit_card_outlined, Color(0xFFF59E0B)),
    _NavTab('Aula Virtual', Icons.desktop_windows_outlined, Color(0xFF7C3AED)),
    _NavTab('Cartilla', Icons.assignment_outlined, Color(0xFF0F766E)),
  ];

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

  Future<void> _openTab(int index) async {
    setState(() => _tabIndex = index);
    await _ensureTabData(index);
  }

  Future<void> _ensureTabData(int index) async {
    try {
      if (index == 2 && _documents.isEmpty) {
        final list = await _panel.getMyDocuments();
        if (mounted) setState(() => _documents = list);
      } else if (index == 3 && _courses.isEmpty) {
        final list = await _panel.getMyCourses();
        if (mounted) setState(() => _courses = list);
      } else if (index == 4 && _cards.isEmpty) {
        final list = await _panel.getMyCards();
        if (mounted) setState(() => _cards = list);
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(e.toString().replaceFirst('Exception: ', '')),
          backgroundColor: const Color(0xFFB42318),
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

  List<Map<String, dynamic>> get _alerts {
    final raw = _dashboard?['alerts'];
    if (raw is! List) return const [];
    return raw.whereType<Map>().map((e) => e.cast<String, dynamic>()).toList();
  }

  TextStyle _font({
    double size = 14,
    FontWeight weight = FontWeight.w500,
    Color color = _ink,
    double height = 1.3,
    double spacing = 0,
  }) {
    return GoogleFonts.plusJakartaSans(
      fontSize: size,
      fontWeight: weight,
      color: color,
      height: height,
      letterSpacing: spacing,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Theme(
      data: Theme.of(context).copyWith(
        textTheme: GoogleFonts.plusJakartaSansTextTheme(Theme.of(context).textTheme),
      ),
      child: Scaffold(
        backgroundColor: _bg,
        body: SafeArea(
          child: Align(
            alignment: Alignment.topCenter,
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 448),
              child: Column(
                children: [
                  _buildAppBar(),
                  if (_loading)
                    const Expanded(child: Center(child: CircularProgressIndicator(color: _blue)))
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
        ),
      ),
    );
  }

  Widget _buildAppBar() {
    return Container(
      padding: const EdgeInsets.fromLTRB(12, 10, 8, 10),
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(bottom: BorderSide(color: _line)),
      ),
      child: Row(
        children: [
          _roundButton(Icons.arrow_back, 'Cerrar sesión', _logout),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              'Perfil del Empleado',
              style: _font(size: 17, weight: FontWeight.w800, spacing: -0.2),
            ),
          ),
          _roundButton(Icons.notifications_none, 'Notificaciones', _showAlerts),
          PopupMenuButton<String>(
            tooltip: 'Opciones',
            offset: const Offset(0, 40),
            onSelected: (value) {
              if (value == 'logout') _logout();
              if (value == 'refresh') _bootstrap();
            },
            itemBuilder: (_) => const [
              PopupMenuItem(value: 'refresh', child: Text('Actualizar')),
              PopupMenuItem(value: 'logout', child: Text('Cerrar sesión')),
            ],
            child: const SizedBox(
              width: 36,
              height: 36,
              child: Icon(Icons.more_horiz, color: _muted),
            ),
          ),
        ],
      ),
    );
  }

  Widget _roundButton(IconData icon, String tooltip, VoidCallback onTap) {
    return IconButton(
      onPressed: onTap,
      tooltip: tooltip,
      style: IconButton.styleFrom(
        foregroundColor: _ink,
        fixedSize: const Size(36, 36),
      ),
      icon: Icon(icon, size: 22),
    );
  }

  void _showAlerts() {
    final alerts = _alerts;
    if (alerts.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No tienes alertas pendientes.')),
      );
      return;
    }
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        return Padding(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Alertas', style: _font(size: 16, weight: FontWeight.w800)),
              const SizedBox(height: 12),
              ...alerts.map((map) {
                return Container(
                  width: double.infinity,
                  margin: const EdgeInsets.only(bottom: 8),
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFFF7ED),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    (map['message'] ?? '').toString(),
                    style: _font(size: 13, color: const Color(0xFF9A3412)),
                  ),
                );
              }),
            ],
          ),
        );
      },
    );
  }

  Widget _buildError() {
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.error_outline, color: Color(0xFFB42318), size: 48),
          const SizedBox(height: 12),
          Text(_error!, textAlign: TextAlign.center, style: _font(size: 14, color: _muted)),
          const SizedBox(height: 16),
          FilledButton(
            onPressed: _bootstrap,
            style: FilledButton.styleFrom(backgroundColor: _blue),
            child: const Text('Reintentar'),
          ),
          TextButton(onPressed: _logout, child: const Text('Cerrar sesión')),
        ],
      ),
    );
  }

  Widget _buildProfileHeader() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 22, 20, 8),
      child: Column(
        children: [
          SizedBox(
            width: 104,
            height: 108,
            child: Stack(
              alignment: Alignment.topCenter,
              children: [
                Container(
                  width: 96,
                  height: 96,
                  padding: const EdgeInsets.all(3),
                  decoration: const BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: [Color(0xFF1D4ED8), Color(0xFF6366F1), Color(0xFF38BDF8)],
                    ),
                  ),
                  child: Container(
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      border: Border.all(color: Colors.white, width: 2),
                      color: const Color(0xFFF1F5F9),
                    ),
                    clipBehavior: Clip.antiAlias,
                    child: _avatarUrl != null
                        ? Image.network(
                            _avatarUrl!,
                            fit: BoxFit.cover,
                            errorBuilder: (_, __, ___) => const Icon(Icons.person, size: 52, color: Color(0xFF94A3B8)),
                          )
                        : const Icon(Icons.person, size: 52, color: Color(0xFF94A3B8)),
                  ),
                ),
                Positioned(
                  bottom: 0,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 2),
                    decoration: BoxDecoration(
                      color: _isActive ? const Color(0xFF059669) : const Color(0xFF64748B),
                      borderRadius: BorderRadius.circular(999),
                      border: Border.all(color: Colors.white, width: 2),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Container(
                          width: 6,
                          height: 6,
                          decoration: const BoxDecoration(color: Colors.white, shape: BoxShape.circle),
                        ),
                        const SizedBox(width: 4),
                        Text(
                          _isActive ? 'ACTIVO' : 'INACTIVO',
                          style: _font(size: 10, weight: FontWeight.w800, color: Colors.white, spacing: 0.6),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 8),
          Text(
            _displayName,
            textAlign: TextAlign.center,
            style: _font(size: 18, weight: FontWeight.w800, height: 1.25),
          ),
          const SizedBox(height: 4),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 8,
                height: 8,
                decoration: const BoxDecoration(color: _blue, shape: BoxShape.circle),
              ),
              const SizedBox(width: 6),
              Flexible(
                child: Text(
                  _position,
                  textAlign: TextAlign.center,
                  style: _font(size: 14, weight: FontWeight.w600, color: _muted),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildTabs() {
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(top: 8),
      padding: const EdgeInsets.fromLTRB(12, 10, 12, 10),
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(bottom: BorderSide(color: Color(0xFFE2E8F0))),
        boxShadow: [BoxShadow(color: Color(0x0A0F172A), blurRadius: 8, offset: Offset(0, 2))],
      ),
      child: GridView.builder(
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        itemCount: _tabs.length,
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 4,
          mainAxisSpacing: 8,
          crossAxisSpacing: 8,
          childAspectRatio: 0.78,
        ),
        itemBuilder: (context, index) {
          final tab = _tabs[index];
          final selected = _tabIndex == index;
          return Material(
            color: selected ? _blue : const Color(0xFFF8FAFC),
            borderRadius: BorderRadius.circular(14),
            child: InkWell(
              borderRadius: BorderRadius.circular(14),
              onTap: () => _openTab(index),
              child: Container(
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: selected ? _blue : const Color(0xFFE2E8F0)),
                  boxShadow: selected
                      ? const [BoxShadow(color: Color(0x402563EB), blurRadius: 10, offset: Offset(0, 4))]
                      : null,
                ),
                padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 8),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Container(
                      width: 32,
                      height: 32,
                      decoration: BoxDecoration(
                        color: selected ? Colors.white.withValues(alpha: 0.2) : Colors.white,
                        borderRadius: BorderRadius.circular(8),
                        border: selected ? null : Border.all(color: const Color(0xFFF1F5F9)),
                      ),
                      child: Icon(tab.icon, size: 18, color: selected ? Colors.white : tab.tint),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      tab.label,
                      textAlign: TextAlign.center,
                      maxLines: 2,
                      style: _font(
                        size: 10.5,
                        weight: FontWeight.w700,
                        color: selected ? Colors.white : const Color(0xFF334155),
                        height: 1.1,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildTabBody() {
    switch (_tabIndex) {
      case 0:
        return _buildResumen();
      case 2:
        return _buildListTab(
          emptyIcon: Icons.folder_open,
          emptyText: 'No tienes documentos cargados aún.',
          items: _documents,
          titleOf: (m) => (m['name'] ?? 'Documento').toString(),
          subtitleOf: (m) => '${m['businessName'] ?? '—'} · ${m['status'] ?? '—'}',
        );
      case 3:
        return _buildListTab(
          emptyIcon: Icons.school_outlined,
          emptyText: 'No tienes cursos asignados aún.',
          items: _courses,
          titleOf: (m) => (m['name'] ?? 'Curso').toString(),
          subtitleOf: (m) =>
              '${m['businessName'] ?? '—'} · ${m['status'] ?? (m['completed'] == true ? 'VIGENTE' : 'PENDIENTE')}',
        );
      case 4:
        return _buildListTab(
          emptyIcon: Icons.badge_outlined,
          emptyText: 'No tienes tarjetas registradas aún.',
          items: _cards,
          titleOf: (m) => (m['name'] ?? 'Tarjeta').toString(),
          subtitleOf: (m) => '${m['businessName'] ?? '—'} · ${m['status'] ?? '—'}',
        );
      case 5:
        return AulaVirtualPanel(
          unirseCursoId: _unirseCursoId,
          onUnirseConsumido: () => _unirseCursoId = null,
        );
      case 6:
        return CartillaPanel(avatarUrl: _avatarUrl, activo: _isActive);
      default:
        return _buildPerfil();
    }
  }

  Widget _buildResumen() {
    final d = _dashboard ?? {};
    final stats = <_StatItem>[
      _StatItem('Documentos', '${d['totalDocuments'] ?? 0}', Icons.description_outlined, _blue, const Color(0xFFEFF6FF), 2),
      _StatItem('Vigentes', '${d['documentsVigentes'] ?? 0}', Icons.check_circle_outline, const Color(0xFF059669), const Color(0xFFECFDF5), 2),
      _StatItem('Por vencer', '${d['documentsPorVencer'] ?? 0}', Icons.warning_amber_rounded, const Color(0xFFD97706), const Color(0xFFFFFBEB), 2),
      _StatItem('Vencidos', '${d['documentsVencidos'] ?? 0}', Icons.cancel_outlined, const Color(0xFFE11D48), const Color(0xFFFFF1F2), 2),
      _StatItem('Cursos', '${d['totalCourses'] ?? 0}', Icons.school_outlined, const Color(0xFF4F46E5), const Color(0xFFEEF2FF), 3),
      _StatItem('Completados', '${d['coursesCompleted'] ?? 0}', Icons.workspace_premium_outlined, const Color(0xFF0F766E), const Color(0xFFF0FDFA), 3),
    ];

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 18, 16, 28),
      children: [
        GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          itemCount: stats.length,
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 2,
            mainAxisSpacing: 12,
            crossAxisSpacing: 12,
            childAspectRatio: 1.05,
          ),
          itemBuilder: (_, i) => _statCard(stats[i]),
        ),
        const SizedBox(height: 16),
        _shortcut(),
        const SizedBox(height: 16),
        if (_alerts.isEmpty)
          _statusOk()
        else
          _sectionCard(
            icon: Icons.notifications_outlined,
            title: 'Alertas',
            child: Column(
              children: _alerts.map((map) {
                return Container(
                  width: double.infinity,
                  margin: const EdgeInsets.only(bottom: 8),
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFFF7ED),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    (map['message'] ?? '').toString(),
                    style: _font(size: 13, color: const Color(0xFF9A3412)),
                  ),
                );
              }).toList(),
            ),
          ),
      ],
    );
  }

  Widget _statCard(_StatItem item) {
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(18),
      child: InkWell(
        borderRadius: BorderRadius.circular(18),
        onTap: () => _openTab(item.tab),
        child: Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: const Color(0xFFF1F5F9)),
            boxShadow: _soft,
          ),
          padding: const EdgeInsets.all(14),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: item.tint,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(item.icon, color: item.color, size: 24),
              ),
              const SizedBox(height: 10),
              Text(item.value, style: _font(size: 30, weight: FontWeight.w800, height: 1)),
              const SizedBox(height: 4),
              Text(
                item.label.toUpperCase(),
                textAlign: TextAlign.center,
                style: _font(size: 11, weight: FontWeight.w800, color: item.color, spacing: 0.4),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _shortcut() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(18),
        gradient: const LinearGradient(colors: [_blue, Color(0xFF4F46E5)]),
        boxShadow: _soft,
      ),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.2),
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Icon(Icons.school_outlined, color: Colors.white, size: 22),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Aula Virtual y Cartilla', style: _font(size: 14, weight: FontWeight.w800, color: Colors.white)),
                const SizedBox(height: 2),
                Text(
                  'Accede a tus materiales de inducción',
                  style: _font(size: 12, color: const Color(0xFFDBEAFE)),
                ),
              ],
            ),
          ),
          TextButton(
            onPressed: () => _openTab(5),
            style: TextButton.styleFrom(
              backgroundColor: Colors.white,
              foregroundColor: _blueDeep,
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            child: Text('Ir', style: _font(size: 12, weight: FontWeight.w800, color: _blueDeep)),
          ),
        ],
      ),
    );
  }

  Widget _statusOk() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 28),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFFF1F5F9)),
        boxShadow: _soft,
      ),
      child: Column(
        children: [
          Container(
            width: 56,
            height: 56,
            decoration: const BoxDecoration(color: Color(0xFFF1F5F9), shape: BoxShape.circle),
            alignment: Alignment.center,
            child: Container(
              width: 40,
              height: 40,
              decoration: const BoxDecoration(color: Color(0xFF475569), shape: BoxShape.circle),
              child: const Icon(Icons.check, color: Colors.white, size: 22),
            ),
          ),
          const SizedBox(height: 12),
          Text('No tienes alertas pendientes.', style: _font(size: 14, weight: FontWeight.w700, color: _muted)),
          const SizedBox(height: 4),
          Text('Todo en orden con tu documentación.', style: _font(size: 12, color: const Color(0xFF94A3B8))),
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
        final item = items[i];
        return Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: const Color(0xFFF1F5F9)),
            boxShadow: _soft,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(titleOf(item), style: _font(size: 14, weight: FontWeight.w700)),
              const SizedBox(height: 4),
              Text(subtitleOf(item), style: _font(size: 12, color: _muted)),
            ],
          ),
        );
      },
    );
  }

  Widget _buildPerfil() {
    final profile = _profile ?? {};
    final businesses = (profile['businesses'] as List?) ?? const [];
    final empresa = businesses.isNotEmpty
        ? businesses.map((b) => (b is Map ? (b['name'] ?? '—') : '—').toString()).join(', ')
        : (profile['businessName'] ?? '—').toString();

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        CharlasDelPerfil(
          onUnirme: (cursoId) {
            setState(() {
              _unirseCursoId = cursoId;
              _tabIndex = 5;
            });
          },
        ),
        _sectionCard(
          icon: Icons.person_outline,
          title: 'Información personal',
          child: Column(
            children: [
              _dataCell('NOMBRE COMPLETO', _displayName),
              _dataCell('CÉDULA', (profile['cedula'] ?? '—').toString()),
              _dataCell('CORREO ELECTRÓNICO', (profile['email'] ?? '—').toString()),
              _dataCell('TELÉFONO', (profile['phone'] ?? '—').toString()),
              _dataCell('TIPO DE SANGRE', (profile['tipoSangre'] ?? '—').toString()),
            ],
          ),
        ),
        const SizedBox(height: 16),
        _sectionCard(
          icon: Icons.work_outline,
          title: 'Detalles de empleo',
          child: Column(
            children: [
              _dataCell('EMPRESA', empresa, accent: true),
              _dataCell('DEPARTAMENTO', (profile['department'] ?? '—').toString()),
              _dataCell('CARGO', (profile['position'] ?? '—').toString()),
              _dataCell('FECHA DE INGRESO', (profile['fechaIngreso'] ?? '—').toString()),
            ],
          ),
        ),
        const SizedBox(height: 12),
        OutlinedButton.icon(
          onPressed: () {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Para actualizar datos, contacta a Talento Humano.')),
            );
          },
          style: OutlinedButton.styleFrom(
            foregroundColor: _ink,
            backgroundColor: Colors.white,
            side: const BorderSide(color: _line),
            padding: const EdgeInsets.symmetric(vertical: 16),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
          ),
          icon: const Icon(Icons.edit_outlined),
          label: Text('Solicitar actualización de datos', style: _font(size: 14, weight: FontWeight.w700)),
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
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFFF1F5F9)),
        boxShadow: _soft,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, color: _blue, size: 20),
              const SizedBox(width: 8),
              Text(title, style: _font(size: 16, weight: FontWeight.w800)),
            ],
          ),
          const SizedBox(height: 12),
          child,
        ],
      ),
    );
  }

  Widget _dataCell(String label, String value, {bool accent = false}) {
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: _bg,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: _font(size: 10, weight: FontWeight.w800, color: _muted, spacing: 0.4)),
          const SizedBox(height: 4),
          Text(
            value,
            style: _font(size: 14, weight: accent ? FontWeight.w800 : FontWeight.w600, color: accent ? _blue : _ink),
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
          Icon(icon, size: 48, color: const Color(0xFF94A3B8)),
          const SizedBox(height: 12),
          Text(text, textAlign: TextAlign.center, style: _font(size: 14, color: _muted)),
        ],
      ),
    );
  }
}

class _StatItem {
  final String label;
  final String value;
  final IconData icon;
  final Color color;
  final Color tint;
  final int tab;
  const _StatItem(this.label, this.value, this.icon, this.color, this.tint, this.tab);
}
