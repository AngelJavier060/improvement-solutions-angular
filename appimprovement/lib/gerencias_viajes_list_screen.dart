import 'package:flutter/material.dart';
import 'services/gerencia_viaje_service.dart';
import 'services/employee_service.dart';
import 'widgets/cierre_gerencia_km_panel.dart';

class GerenciasViajesListScreen extends StatefulWidget {
  const GerenciasViajesListScreen({super.key});

  @override
  State<GerenciasViajesListScreen> createState() => _GerenciasViajesListScreenState();
}

class _GerenciasViajesListScreenState extends State<GerenciasViajesListScreen> {
  final GerenciaViajeService _service = GerenciaViajeService();
  String _filtroActivo = 'Todos';
  final TextEditingController _searchController = TextEditingController();

  List<GerenciaViajeDto> _gerencias = [];
  GerenciaViajeStats? _stats;
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final results = await Future.wait([
        _service.getAll(),
        _service.getStats(),
      ]);
      
      setState(() {
        _gerencias = results[0] as List<GerenciaViajeDto>;
        _stats = results[1] as GerenciaViajeStats;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  List<GerenciaViajeDto> get _gerenciasFiltradas {
    var lista = _gerencias;
    
    // Filtro por estado
    if (_filtroActivo == 'Abiertos') {
      lista = lista.where((g) => g.estado == 'ACTIVO').toList();
    } else if (_filtroActivo == 'Cerrados') {
      lista = lista.where((g) => g.estado == 'COMPLETADO').toList();
    }
    
    // Filtro por búsqueda
    final query = _searchController.text.toLowerCase();
    if (query.isNotEmpty) {
      lista = lista.where((g) =>
        (g.codigo ?? '').toLowerCase().contains(query) ||
        (g.vehiculoInicio ?? '').toLowerCase().contains(query) ||
        (g.conductor ?? '').toLowerCase().contains(query)
      ).toList();
    }
    
    return lista;
  }

  int get _activos => _stats?.activos ?? 0;
  int get _hoy => _gerencias.where((g) {
    final today = DateTime.now();
    final created = g.createdAt ?? g.fechaHora;
    if (created == null) return false;
    return created.year == today.year && 
           created.month == today.month && 
           created.day == today.day;
  }).length;

  /// Última gerencia cerrada para la misma placa (por fecha de cierre o apertura).
  GerenciaViajeDto? _ultimaGerenciaCerradaMismaPlaca(String placa) {
    final p = placa.trim().toUpperCase();
    if (p.isEmpty) return null;
    GerenciaViajeDto? best;
    DateTime? bestDt;
    for (final x in _gerencias) {
      if (x.estado != 'COMPLETADO') continue;
      if ((x.vehiculoInicio ?? '').trim().toUpperCase() != p) continue;
      final d = x.fechaCierre ?? x.fechaHora;
      if (d == null) continue;
      if (bestDt == null || d.isAfter(bestDt)) {
        bestDt = d;
        best = x;
      }
    }
    return best;
  }

  Future<void> _navigateToForm() async {
    final result = await Navigator.pushNamed(context, '/gerencias-viajes-form');
    if (result == true) {
      _loadData(); // Reload list after successful creation
    }
  }

  Future<void> _cerrarGerencia(int id, double km) async {
    await _service.cerrar(id, km);
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Gerencia cerrada exitosamente'),
        backgroundColor: Colors.green,
      ),
    );
    _loadData();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF5F7F9),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          onPressed: () => Navigator.pop(context),
          icon: const Icon(Icons.arrow_back, color: Color(0xFF2563EB)),
        ),
        title: Row(
          children: [
            Icon(Icons.local_shipping, color: Color(0xFF2563EB), size: 24),
            const SizedBox(width: 8),
            const Text(
              'FleetRisk',
              style: TextStyle(
                color: Color(0xFF2563EB),
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ),
        actions: [
          IconButton(
            onPressed: () {},
            icon: const Icon(Icons.notifications_outlined, color: Color(0xFF64748B)),
          ),
          Container(
            margin: const EdgeInsets.only(right: 12),
            width: 32,
            height: 32,
            decoration: BoxDecoration(
              color: const Color(0xFF7B9CFF),
              borderRadius: BorderRadius.circular(16),
            ),
            child: const Center(
              child: Text(
                'JD',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ),
        ],
      ),
      body: Column(
        children: [
          // Search and filters
          Container(
            color: Colors.white,
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
            child: Column(
              children: [
                // Search bar
                Container(
                  decoration: BoxDecoration(
                    color: const Color(0xFFEEF1F3),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: TextField(
                    controller: _searchController,
                    onChanged: (_) => setState(() {}),
                    decoration: InputDecoration(
                      hintText: 'Buscar placa o n° gerencia...',
                      hintStyle: TextStyle(color: Color(0xFF595C5E).withOpacity(0.6)),
                      prefixIcon: const Icon(Icons.search, color: Color(0xFF595C5E)),
                      border: InputBorder.none,
                      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                // Filter chips
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      _FilterChip(
                        label: 'Todos',
                        isSelected: _filtroActivo == 'Todos',
                        onTap: () => setState(() => _filtroActivo = 'Todos'),
                      ),
                      const SizedBox(width: 8),
                      _FilterChip(
                        label: 'Abiertos',
                        isSelected: _filtroActivo == 'Abiertos',
                        onTap: () => setState(() => _filtroActivo = 'Abiertos'),
                      ),
                      const SizedBox(width: 8),
                      _FilterChip(
                        label: 'Cerrados',
                        isSelected: _filtroActivo == 'Cerrados',
                        onTap: () => setState(() => _filtroActivo = 'Cerrados'),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          
          // Stats cards
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
            child: Row(
              children: [
                Expanded(
                  child: _StatCard(
                    label: 'ACTIVOS',
                    value: _activos.toString(),
                    color: const Color(0xFF0050D4),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _StatCard(
                    label: 'HOY',
                    value: _hoy.toString(),
                    color: const Color(0xFF005A52),
                  ),
                ),
              ],
            ),
          ),
          
          // List header
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(
              children: const [
                Text(
                  'Registros de Viaje',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF2C2F31),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          
          // List
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _error != null
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Icon(Icons.error_outline, size: 48, color: Colors.red),
                            const SizedBox(height: 16),
                            Text(_error!, textAlign: TextAlign.center),
                            const SizedBox(height: 16),
                            ElevatedButton(
                              onPressed: _loadData,
                              child: const Text('Reintentar'),
                            ),
                          ],
                        ),
                      )
                    : _gerenciasFiltradas.isEmpty
                        ? const Center(
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(Icons.local_shipping_outlined, size: 64, color: Color(0xFFABADAF)),
                                SizedBox(height: 16),
                                Text('No hay registros de viaje', style: TextStyle(color: Color(0xFF595C5E))),
                              ],
                            ),
                          )
                        : RefreshIndicator(
                            onRefresh: _loadData,
                            child: ListView.builder(
                              padding: const EdgeInsets.symmetric(horizontal: 16),
                              itemCount: _gerenciasFiltradas.length,
                              itemBuilder: (context, index) {
                                final g = _gerenciasFiltradas[index];
                                return _TripCard(
                                  gerencia: g,
                                  ultimaGerenciaMismaPlaca:
                                      _ultimaGerenciaCerradaMismaPlaca(g.vehiculoInicio ?? ''),
                                  onTap: () {
                                    // Navigate to detail
                                  },
                                  onCerrarKm: g.estado == 'ACTIVO' && g.id != null
                                      ? (id, km) => _cerrarGerencia(id, km)
                                      : null,
                                );
                              },
                            ),
                          ),
          ),
        ],
      ),
      bottomNavigationBar: BottomNavigationBar(
        type: BottomNavigationBarType.fixed,
        backgroundColor: Colors.white,
        elevation: 8,
        selectedItemColor: const Color(0xFF2563EB),
        unselectedItemColor: const Color(0xFF64748B),
        selectedLabelStyle: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold),
        unselectedLabelStyle: const TextStyle(fontSize: 10),
        currentIndex: 1,
        onTap: (index) {
          if (index == 4) { // Add button
            _navigateToForm();
          }
        },
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.analytics), label: 'ASSESSMENT'),
          BottomNavigationBarItem(icon: Icon(Icons.history_edu), label: 'LOGS'),
          BottomNavigationBarItem(icon: Icon(Icons.shield), label: 'SAFETY'),
          BottomNavigationBarItem(icon: Icon(Icons.person), label: 'PROFILE'),
          BottomNavigationBarItem(icon: Icon(Icons.add_circle, size: 28), label: 'NUEVA'),
        ],
      ),
    );
  }
}

class _FilterChip extends StatelessWidget {
  final String label;
  final bool isSelected;
  final VoidCallback onTap;

  const _FilterChip({
    required this.label,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFF0050D4) : const Color(0xFFE5E9EB),
          borderRadius: BorderRadius.circular(20),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: isSelected ? Colors.white : const Color(0xFF595C5E),
            fontSize: 13,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  final String label;
  final String value;
  final Color color;

  const _StatCard({
    required this.label,
    required this.value,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(10),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.04),
            blurRadius: 6,
            offset: const Offset(0, 1),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: const TextStyle(
              fontSize: 9,
              fontWeight: FontWeight.bold,
              color: Color(0xFF595C5E),
              letterSpacing: 0.8,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            value,
            style: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.w800,
              color: color,
            ),
          ),
        ],
      ),
    );
  }
}

class _TripCard extends StatefulWidget {
  final GerenciaViajeDto gerencia;
  final GerenciaViajeDto? ultimaGerenciaMismaPlaca;
  final VoidCallback onTap;
  final Future<void> Function(int id, double km)? onCerrarKm;

  const _TripCard({
    required this.gerencia,
    this.ultimaGerenciaMismaPlaca,
    required this.onTap,
    this.onCerrarKm,
  });

  @override
  State<_TripCard> createState() => _TripCardState();
}

class _TripCardState extends State<_TripCard> {
  final EmployeeService _employeeService = EmployeeService();
  bool _showKmField = false;
  EmployeeDto? _employee;
  bool _loadingEmployee = false;
  bool get isActivo => (widget.gerencia.estado ?? '') == 'ACTIVO';

  @override
  void initState() {
    super.initState();
    _loadEmployeeData();
  }

  Future<void> _loadEmployeeData() async {
    final cedula = widget.gerencia.cedula;
    if (cedula == null || cedula.isEmpty) return;

    setState(() => _loadingEmployee = true);
    try {
      final employee = await _employeeService.getByCedula(cedula);
      if (mounted) {
        setState(() {
          _employee = employee;
          _loadingEmployee = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _loadingEmployee = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: widget.onTap,
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: isActivo ? Border.all(color: const Color(0xFF0050D4).withOpacity(0.1)) : null,
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.02),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Opacity(
          opacity: isActivo ? 1.0 : 0.7,
          child: Column(
            children: [
              // Top accent bar
              Container(
                height: 6,
                decoration: BoxDecoration(
                  color: isActivo ? const Color(0xFF0050D4) : const Color(0xFFD9DDE0),
                  borderRadius: const BorderRadius.only(
                    topLeft: Radius.circular(12),
                    topRight: Radius.circular(12),
                  ),
                ),
              ),
              Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  children: [
                    // Header row
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'N° GERENCIA',
                              style: TextStyle(
                                fontSize: 9,
                                fontWeight: FontWeight.bold,
                                color: Color(0xFF595C5E),
                                letterSpacing: 1,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              widget.gerencia.codigo ?? 'Sin código',
                              style: const TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w800,
                                color: Color(0xFF2C2F31),
                              ),
                            ),
                          ],
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                          decoration: BoxDecoration(
                            color: isActivo
                                ? const Color(0xFF89F5E7)
                                : const Color(0xFFDFE3E6),
                            borderRadius: BorderRadius.circular(16),
                          ),
                          child: Text(
                            isActivo ? 'Abierto' : 'Cerrado',
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                              color: isActivo
                                  ? const Color(0xFF005C54)
                                  : const Color(0xFF595C5E),
                              letterSpacing: 0.5,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    // Vehicle and driver info
                    Container(
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      decoration: const BoxDecoration(
                        border: Border(
                          top: BorderSide(color: Color(0xFFEEF1F3)),
                          bottom: BorderSide(color: Color(0xFFEEF1F3)),
                        ),
                      ),
                      child: Row(
                        children: [
                          // Vehicle
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text(
                                  'VEHÍCULO',
                                  style: TextStyle(
                                    fontSize: 9,
                                    fontWeight: FontWeight.bold,
                                    color: Color(0xFF595C5E),
                                    letterSpacing: 1,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Row(
                                  children: [
                                    Icon(
                                      Icons.directions_car,
                                      size: 16,
                                      color: isActivo
                                          ? const Color(0xFF0050D4)
                                          : const Color(0xFF595C5E),
                                    ),
                                    const SizedBox(width: 6),
                                    Text(
                                      widget.gerencia.vehiculoInicio ?? 'Sin placa',
                                      style: const TextStyle(
                                        fontSize: 14,
                                        fontWeight: FontWeight.bold,
                                        color: Color(0xFF2C2F31),
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                          Container(
                            width: 1,
                            height: 32,
                            color: const Color(0xFFD9DDE0).withOpacity(0.4),
                          ),
                          const SizedBox(width: 16),
                          // Driver
                          Expanded(
                            child: Row(
                              children: [
                                Container(
                                  width: 36,
                                  height: 36,
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFE5E9EB),
                                    borderRadius: BorderRadius.circular(18),
                                    border: Border.all(color: const Color(0xFFE5E9EB), width: 2),
                                  ),
                                  child: _loadingEmployee
                                      ? const SizedBox(
                                          width: 16,
                                          height: 16,
                                          child: CircularProgressIndicator(strokeWidth: 2),
                                        )
                                      : _employee?.photoUrl != null
                                          ? ClipRRect(
                                              borderRadius: BorderRadius.circular(16),
                                              child: Image.network(
                                                _employee!.photoUrl!,
                                                width: 32,
                                                height: 32,
                                                fit: BoxFit.cover,
                                                errorBuilder: (context, error, stackTrace) {
                                                  return const Icon(
                                                    Icons.person,
                                                    color: Color(0xFF64748B),
                                                    size: 20,
                                                  );
                                                },
                                              ),
                                            )
                                          : const Icon(
                                              Icons.person,
                                              color: Color(0xFF64748B),
                                              size: 20,
                                            ),
                                ),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      const Text(
                                        'CONDUCTOR',
                                        style: TextStyle(
                                          fontSize: 8,
                                          fontWeight: FontWeight.bold,
                                          color: Color(0xFF595C5E),
                                          letterSpacing: 0.8,
                                        ),
                                      ),
                                      const SizedBox(height: 1),
                                      Text(
                                        _employee?.fullName ?? widget.gerencia.conductor ?? 'Sin conductor',
                                        style: const TextStyle(
                                          fontSize: 11,
                                          fontWeight: FontWeight.w600,
                                          color: Color(0xFF2C2F31),
                                          height: 1.2,
                                        ),
                                        maxLines: 2,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                    // Close button or KM field (only for active)
                    if (widget.onCerrarKm != null) ...[
                      const SizedBox(height: 12),
                      if (!_showKmField)
                        SizedBox(
                          width: double.infinity,
                          child: ElevatedButton.icon(
                            onPressed: () => setState(() => _showKmField = true),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFF0050D4),
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(vertical: 12),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(8),
                              ),
                            ),
                            icon: const Icon(Icons.lock_open, size: 18),
                            label: const Text(
                              'Cerrar Gerencia',
                              style: TextStyle(fontWeight: FontWeight.bold),
                            ),
                          ),
                        )
                      else
                        CierreGerenciaKmPanel(
                          gerencia: widget.gerencia,
                          ultimaGerenciaMismaPlaca: widget.ultimaGerenciaMismaPlaca,
                          onSubmit: (km) async {
                            final id = widget.gerencia.id;
                            if (id == null) {
                              throw Exception('Gerencia sin id');
                            }
                            await widget.onCerrarKm!(id, km);
                          },
                          onSuccess: () => setState(() => _showKmField = false),
                          onCancel: () => setState(() => _showKmField = false),
                        ),
                    ],
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
