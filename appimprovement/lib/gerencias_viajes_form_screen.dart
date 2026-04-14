import 'dart:async';

import 'package:flutter/material.dart';
import 'services/gerencia_viaje_service.dart';
import 'services/employee_service.dart';
import 'services/vehicle_service.dart';
import 'services/business_service.dart';
import 'services/auth_service.dart';
import 'cerrar_gerencia_screen.dart';

class GerenciasViajesFormScreen extends StatefulWidget {
  const GerenciasViajesFormScreen({super.key});

  @override
  State<GerenciasViajesFormScreen> createState() => _GerenciasViajesFormScreenState();
}

class _GerenciasViajesFormScreenState extends State<GerenciasViajesFormScreen> {
  final GerenciaViajeService _gerenciaService = GerenciaViajeService();
  final EmployeeService _employeeService = EmployeeService();
  final VehicleService _vehicleService = VehicleService();
  final BusinessService _businessService = BusinessService();
  
  int _currentStep = 1;
  final int _totalSteps = 5;
  bool _isSaving = false;
  bool _isLoadingCode = true;
  double? _ultimoKm;
  String? _codigoGerencia;
  GerenciaViajeDto? _gerenciaAbiertaMismaPlaca;
  bool _consultandoPlacaAbierta = false;
  Timer? _debouncePlacaAbierta;
  Timer? _debounceUltimoKmPlaca;

  // Autocomplete data
  List<EmployeeDto> _employeeSuggestions = [];
  List<VehicleDto> _vehicleSuggestions = [];
  List<VehicleDto> _allVehicles = [];
  EmployeeDto? _selectedEmployee;
  VehicleDto? _selectedVehicle;

  // Form controllers
  final _gerenciaController = TextEditingController();
  final _conductorController = TextEditingController();
  final _cedulaController = TextEditingController();
  final _telefonoController = TextEditingController();
  final _cargoController = TextEditingController();
  final _areaController = TextEditingController();
  final _placaController = TextEditingController();
  final _kmInicialController = TextEditingController();
  final _motivoViajeController = TextEditingController();
  final _origenController = TextEditingController();
  final _destinoController = TextEditingController();
  final _fechaSalidaController = TextEditingController();
  final _horaSalidaController = TextEditingController();
  final _placasConvoyController = TextEditingController();
  final _pasajerosController = TextEditingController();
  final _observacionesController = TextEditingController();

  // Form state
  bool _licenciaVigente = false;
  bool _manejoDefensivo = false;
  bool _checklistPreoperacional = false;
  bool _pruebaAlcohol = false;
  bool _enConvoy = false;
  bool _llevaPasajeros = true;
  String _tipoCarga = '';
  String _tipoCarretera = '';
  String _estadoVia = '';
  String _condicionClimatica = '';
  String _distanciaRecorrer = '';
  String _horasConduccion = '';
  String _horarioCirculacion = '';
  String _horasDescanso = '';
  String _medioComunicacion = '';
  List<String> _riesgosSeleccionados = [];

  // Catálogos dinámicos por empresa
  List<String> _tipoCargas = [];
  List<String> _tipoVias = [];
  List<String> _estadoCarreteras = [];
  List<String> _condicionClimaticaOpciones = [];
  List<String> _distanciaRecorrers = [];
  List<String> _horaConducciones = [];
  List<String> _horarioCirculaciones = [];
  List<String> _horaDescansos = [];
  List<String> _medioComunicaciones = [];
  List<String> _posiblesRiesgosVia = [];
  List<String> _otrosPeligrosOpciones = [];
  List<String> _medidasControlOpciones = [];
  List<String> _otrosPeligrosSeleccionados = [];
  List<String> _medidasControlSeleccionadas = [];

  bool get _protocoloValido => _licenciaVigente && _manejoDefensivo && _checklistPreoperacional && _pruebaAlcohol;

  /// KM inicial numérico estrictamente menor al último km de cierre en gerencias (misma placa).
  bool get _kmInicialEsMenorQueUltimoRegistrado {
    final u = _ultimoKm;
    if (u == null) return false;
    final raw = _kmInicialController.text.trim().replaceAll(',', '.');
    if (raw.isEmpty) return false;
    final v = double.tryParse(raw);
    if (v == null) return false;
    return v < u;
  }

  bool get _formularioBloqueadoPorKmInicial => _kmInicialEsMenorQueUltimoRegistrado;

  @override
  void initState() {
    super.initState();
    _kmInicialController.addListener(() => setState(() {}));
    _loadInitialData();
  }

  @override
  void dispose() {
    _debouncePlacaAbierta?.cancel();
    _debounceUltimoKmPlaca?.cancel();
    _conductorController.dispose();
    _cedulaController.dispose();
    _telefonoController.dispose();
    _cargoController.dispose();
    _areaController.dispose();
    _placaController.dispose();
    _kmInicialController.dispose();
    super.dispose();
  }

  Future<void> _loadInitialData() async {
    // Load next gerencia code
    try {
      final codigo = await _gerenciaService.getNextCodigo();
      setState(() {
        _codigoGerencia = codigo;
        _gerenciaController.text = codigo ?? '';
        _isLoadingCode = false;
      });
    } catch (e) {
      setState(() => _isLoadingCode = false);
    }

    // Load all vehicles for autocomplete
    try {
      final vehicles = await _vehicleService.getAll();
      setState(() => _allVehicles = vehicles);
    } catch (e) {
      print('Error loading vehicles: $e');
    }

    await _loadBusinessCatalogs();
  }

  List<String> _extractNames(dynamic list) {
    if (list is List) {
      return list
          .map((e) {
            if (e is Map) {
              final n = (e['name']?.toString() ?? e['nombre']?.toString() ?? '').trim();
              if (n.isNotEmpty) return n;
              final d = (e['description']?.toString() ?? e['descripcion']?.toString() ?? '').trim();
              return d;
            }
            return (e?.toString() ?? '');
          })
          .where((s) => s.isNotEmpty)
          .cast<String>()
          .toList();
    }
    return [];
  }

  String _stripDiacritics(String input) {
    var s = input;
    const repl = {
      'Á': 'A', 'À': 'A', 'Â': 'A', 'Ä': 'A', 'á': 'a', 'à': 'a', 'â': 'a', 'ä': 'a',
      'É': 'E', 'È': 'E', 'Ê': 'E', 'Ë': 'E', 'é': 'e', 'è': 'e', 'ê': 'e', 'ë': 'e',
      'Í': 'I', 'Ì': 'I', 'Î': 'I', 'Ï': 'I', 'í': 'i', 'ì': 'i', 'î': 'i', 'ï': 'i',
      'Ó': 'O', 'Ò': 'O', 'Ô': 'O', 'Ö': 'O', 'ó': 'o', 'ò': 'o', 'ô': 'o', 'ö': 'o',
      'Ú': 'U', 'Ù': 'U', 'Û': 'U', 'Ü': 'U', 'ú': 'u', 'ù': 'u', 'û': 'u', 'ü': 'u',
      'Ñ': 'N', 'ñ': 'n'
    };
    repl.forEach((k, v) { s = s.replaceAll(k, v); });
    return s;
  }

  String _normalizeKey(String s) => _stripDiacritics(s).toLowerCase().trim();

  String _normalizeMethodKey(String s) {
    final base = _normalizeKey(s);
    // Eliminar guiones, espacios y caracteres no alfanuméricos para unificar 'GTC-45' / 'GTC 45' / 'GTC45'
    return base.replaceAll(RegExp(r'[^a-z0-9]'), '');
  }

  List<String> _dedupePreserveOrder(List<String> items) {
    final seen = <String>{};
    final out = <String>[];
    for (final raw in items) {
      final item = raw.trim();
      final key = _normalizeKey(item);
      if (!seen.contains(key)) {
        seen.add(key);
        out.add(item);
      }
    }
    return out;
  }

  Set<String> _resolveAllowedMetodologias(Map<String, dynamic> details) {
    final list = details['metodologiaRiesgos'];
    final names = <String>{};
    if (list is List) {
      for (final e in list) {
        if (e is Map) {
          final n = (e['name']?.toString() ?? e['nombre']?.toString() ?? '').trim();
          if (n.isNotEmpty) names.add(_normalizeMethodKey(n));
        }
      }
    }
    if (names.isEmpty) return names; // sin filtro si backend no define
    // Preferir GTC-45 si está presente (gtc45 en forma canónica)
    final gtc = names.contains('gtc45') ? 'gtc45' : '';
    if (gtc.isNotEmpty) return {gtc};
    // Si hay solo una metodología, usarla
    if (names.length == 1) return names;
    // Caso contrario, sin filtro estricto (evitar vaciar catálogos)
    return names;
  }

  dynamic _filterByMethod(dynamic list, Set<String> allowedMethods) {
    if (list is! List || allowedMethods.isEmpty) return list;
    final out = <dynamic>[];
    for (final item in list) {
      if (item is Map) {
        final met = item['metodologiaRiesgo'];
        if (met is Map) {
          final name = (met['name']?.toString() ?? met['nombre']?.toString() ?? '').trim();
          final key = _normalizeMethodKey(name);
          if (key.isEmpty || allowedMethods.contains(key)) {
            out.add(item);
          }
        } else {
          out.add(item);
        }
      } else {
        out.add(item);
      }
    }
    return out;
  }

  Future<void> _loadBusinessCatalogs() async {
    try {
      final auth = AuthService();
      final ruc = auth.getPrimaryBusinessRuc()?.trim();
      Map<String, dynamic>? details;
      if (ruc != null && ruc.isNotEmpty) {
        details = await _businessService.getDetailsByRuc(ruc);
      }
      // Fallback: cargar por ID desde userDetail si por RUC no respondió
      if (details == null) {
        final user = auth.userDetail;
        final businesses = user != null ? user['businesses'] as List<dynamic>? : null;
        final id = (businesses != null && businesses.isNotEmpty) ? businesses.first['id']?.toString() : null;
        if (id != null && id.isNotEmpty) {
          details = await _businessService.getDetailsById(id);
        }
      }
      if (details == null) return;

      final allowed = _resolveAllowedMetodologias(details.cast<String, dynamic>());

      final tipoCargas = _dedupePreserveOrder(_extractNames(_filterByMethod(details['tipoCargas'], allowed)));
      final tipoVias = _dedupePreserveOrder(_extractNames(_filterByMethod(details['tipoVias'], allowed)));
      final estadoCarreteras = _dedupePreserveOrder(_extractNames(_filterByMethod(details['estadoCarreteras'], allowed)));
      final condicionClimaticaOpciones = _dedupePreserveOrder(_extractNames(_filterByMethod(details['condicionClimaticas'], allowed)));
      final distanciaRecorrers = _dedupePreserveOrder(_extractNames(_filterByMethod(details['distanciaRecorrers'], allowed)));
      final horaConducciones = _dedupePreserveOrder(_extractNames(_filterByMethod(details['horaConducciones'], allowed)));
      final horarioCirculaciones = _dedupePreserveOrder(_extractNames(_filterByMethod(details['horarioCirculaciones'], allowed)));
      final horaDescansos = _dedupePreserveOrder(_extractNames(_filterByMethod(details['horaDescansos'], allowed)));
      final medioComunicaciones = _dedupePreserveOrder(_extractNames(_filterByMethod(details['medioComunicaciones'], allowed)));
      final posiblesRiesgosVia = _dedupePreserveOrder(_extractNames(_filterByMethod(details['posiblesRiesgosVia'], allowed)));
      final otrosPeligrosOpciones = _dedupePreserveOrder(_extractNames(_filterByMethod(details['otrosPeligrosViajeCatalogo'], allowed)));
      final medidasControlOpciones = _dedupePreserveOrder(_extractNames(_filterByMethod(details['medidasControlTomadasViajeCatalogo'], allowed)));

      // Debug: verificar qué llega desde el backend
      // ignore: avoid_print
      print('[GV] Catalogos cargados -> tipoCargas=$tipoCargas, estadoCarreteras=$estadoCarreteras, condicionClimatica=$condicionClimaticaOpciones, distancia=$distanciaRecorrers');
      // ignore: avoid_print
      print('[GV] Catalogos cargados -> horasConduccion=$horaConducciones, horarioCirculacion=$horarioCirculaciones, horasDescanso=$horaDescansos, mediosComunicacion=$medioComunicaciones');
      // ignore: avoid_print
      print('[GV] Catalogos cargados -> riesgosVia=$posiblesRiesgosVia, otrosPeligros=$otrosPeligrosOpciones, medidasControl=$medidasControlOpciones');

      setState(() {
        _tipoCargas = tipoCargas;
        _tipoVias = tipoVias;
        _estadoCarreteras = estadoCarreteras;
        _condicionClimaticaOpciones = condicionClimaticaOpciones;
        _distanciaRecorrers = distanciaRecorrers;
        _horaConducciones = horaConducciones;
        _horarioCirculaciones = horarioCirculaciones;
        _horaDescansos = horaDescansos;
        _medioComunicaciones = medioComunicaciones;
        _posiblesRiesgosVia = posiblesRiesgosVia;
        _otrosPeligrosOpciones = otrosPeligrosOpciones;
        _medidasControlOpciones = medidasControlOpciones;
        // No auto-seleccionar: el conductor puede elegir varios, uno o ninguno
      });
    } catch (_) {}
  }

  // Search employees by name/apellido
  Future<void> _searchEmployees(String term) async {
    if (term.length < 2) {
      setState(() => _employeeSuggestions = []);
      return;
    }
    
    final results = await _employeeService.search(term);
    setState(() => _employeeSuggestions = results);
  }

  // Search employees by cedula
  Future<void> _searchByCedula(String cedula) async {
    if (cedula.length < 2) {
      setState(() => _employeeSuggestions = []);
      return;
    }
    
    if (cedula.length == 10) {
      // Full cedula - get exact match
      final employee = await _employeeService.getByCedula(cedula);
      if (employee != null) {
        _selectEmployee(employee);
      }
    } else {
      // Partial cedula - search
      final results = await _employeeService.search(cedula);
      setState(() => _employeeSuggestions = results);
    }
  }

  // Select employee and fill all fields
  void _selectEmployee(EmployeeDto employee) {
    setState(() {
      _selectedEmployee = employee;
      _conductorController.text = employee.fullName;
      _cedulaController.text = employee.cedula ?? '';
      _telefonoController.text = employee.phone ?? '';
      _cargoController.text = employee.positionName ?? employee.position ?? '';
      _areaController.text = employee.departmentName ?? employee.area ?? '';
      _employeeSuggestions = [];
    });
  }

  // Search vehicles by placa
  void _searchVehicles(String term) {
    if (term.length < 2) {
      setState(() => _vehicleSuggestions = []);
      return;
    }
    
    final termLower = term.toLowerCase();
    final results = _allVehicles.where((v) {
      final placa = (v.placa ?? '').toLowerCase();
      final codigo = (v.codigoEquipo ?? '').toLowerCase();
      return placa.contains(termLower) || codigo.contains(termLower);
    }).take(10).toList();
    
    setState(() => _vehicleSuggestions = results);
  }

  void _programarConsultaGerenciaAbierta(String textoPlaca) {
    _debouncePlacaAbierta?.cancel();
    _debouncePlacaAbierta = Timer(const Duration(milliseconds: 550), () {
      _consultarGerenciaAbiertaPorPlaca(textoPlaca);
    });
  }

  Future<void> _consultarGerenciaAbiertaPorPlaca(String rawPlaca) async {
    final p = rawPlaca.trim();
    if (p.length < 2) {
      if (mounted) {
        setState(() {
          _gerenciaAbiertaMismaPlaca = null;
          _consultandoPlacaAbierta = false;
        });
      }
      return;
    }
    if (mounted) setState(() => _consultandoPlacaAbierta = true);
    try {
      final abierta = await _gerenciaService.findAbiertaPorVehiculo(p);
      if (!mounted) return;
      setState(() {
        _gerenciaAbiertaMismaPlaca = abierta;
        _consultandoPlacaAbierta = false;
      });
    } catch (_) {
      if (mounted) setState(() => _consultandoPlacaAbierta = false);
    }
  }

  // Select vehicle and load last KM
  Future<void> _selectVehicle(VehicleDto vehicle) async {
    _debouncePlacaAbierta?.cancel();
    _debounceUltimoKmPlaca?.cancel();
    setState(() {
      _selectedVehicle = vehicle;
      _placaController.text = vehicle.placa ?? vehicle.codigoEquipo ?? '';
      _vehicleSuggestions = [];
    });

    await _loadUltimoKm(vehicle.placa ?? '');
    await _consultarGerenciaAbiertaPorPlaca(_placaController.text);
  }

  // Load ultimo KM for a placa
  Future<void> _loadUltimoKm(String placa) async {
    if (placa.isEmpty) return;

    try {
      final km = await _gerenciaService.getUltimoKm(placa);
      setState(() => _ultimoKm = km);
    } catch (e) {
      setState(() => _ultimoKm = null);
    }
  }

  void _programarCargaUltimoKm(String placaRaw) {
    _debounceUltimoKmPlaca?.cancel();
    _debounceUltimoKmPlaca = Timer(const Duration(milliseconds: 550), () {
      final p = placaRaw.trim();
      if (p.length < 2) {
        setState(() => _ultimoKm = null);
        return;
      }
      _loadUltimoKm(p);
    });
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
          icon: const Icon(Icons.arrow_back, color: Color(0xFF64748B)),
        ),
        title: const Text(
          'Nuevo Registro',
          style: TextStyle(
            color: Color(0xFF1E293B),
            fontSize: 18,
            fontWeight: FontWeight.bold,
          ),
        ),
        actions: [
          IconButton(
            onPressed: () {},
            icon: const Icon(Icons.more_vert, color: Color(0xFF64748B)),
          ),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(4),
          child: Container(
            height: 4,
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                colors: [Color(0xFF2563EB), Color(0xFF60A5FA)],
              ),
            ),
          ),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            // Progress header
            _buildProgressHeader(),
            const SizedBox(height: 16),

            if (_formularioBloqueadoPorKmInicial)
              Container(
                width: double.infinity,
                margin: const EdgeInsets.only(bottom: 12),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFFFEF2F2),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: const Color(0xFFEF4444)),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Icon(Icons.block, color: Color(0xFFB91C1C), size: 22),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        'No puede guardar el registro: el KM inicial (${_kmInicialController.text.trim()}) es menor que el último kilometraje registrado para esta placa (${_ultimoKm!.toStringAsFixed(0)} km). '
                        'Corrija el KM inicial para continuar.',
                        style: const TextStyle(
                          fontSize: 12.5,
                          color: Color(0xFF991B1B),
                          height: 1.35,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                ),
              ),

            // Section 1: Información General
            _buildSection(
              title: 'Información General',
              icon: Icons.badge,
              color: const Color(0xFF0050D4),
              children: [
                // Código de Gerencia (auto-generated, read-only)
                _buildLabel('N° Gerencia'),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
                  decoration: BoxDecoration(
                    color: const Color(0xFFE5E9EB),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: const Color(0xFFABADAF).withOpacity(0.3)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.tag, color: Color(0xFF595C5E), size: 18),
                      const SizedBox(width: 8),
                      _isLoadingCode
                          ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))
                          : Text(
                              _codigoGerencia ?? 'Generando...',
                              style: const TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.bold,
                                color: Color(0xFF2C2F31),
                              ),
                            ),
                    ],
                  ),
                ),
                const SizedBox(height: 12),
                
                // Conductor Principal (with autocomplete)
                _buildAutocompleteField(
                  label: 'Conductor Principal',
                  controller: _conductorController,
                  hint: 'Buscar por nombre o apellido...',
                  suggestions: _employeeSuggestions,
                  onChanged: (value) => _searchEmployees(value),
                  onSuggestionSelected: (emp) => _selectEmployee(emp),
                  suggestionBuilder: (emp) => '${emp.fullName} - ${emp.cedula ?? ""}',
                ),
                
                // Cédula (with autocomplete)
                Row(
                  children: [
                    Expanded(
                      child: _buildAutocompleteField(
                        label: 'Cédula',
                        controller: _cedulaController,
                        hint: 'Buscar por cédula...',
                        suggestions: _employeeSuggestions,
                        onChanged: (value) => _searchByCedula(value),
                        onSuggestionSelected: (emp) => _selectEmployee(emp),
                        suggestionBuilder: (emp) => '${emp.cedula} - ${emp.fullName}',
                        keyboardType: TextInputType.number,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(child: _buildTextField('Teléfono', _telefonoController, '999-999-999', keyboardType: TextInputType.phone, readOnly: true)),
                  ],
                ),
                Row(
                  children: [
                    Expanded(child: _buildTextField('Cargo', _cargoController, 'Cargo', readOnly: true)),
                    const SizedBox(width: 12),
                    Expanded(child: _buildTextField('Área', _areaController, 'Área/Departamento', readOnly: true)),
                  ],
                ),
                
                // Placa (with autocomplete)
                _buildVehicleAutocompleteField(),
                
                _buildKmInicialField(),
                AbsorbPointer(
                  absorbing: _formularioBloqueadoPorKmInicial,
                  child: Opacity(
                    opacity: _formularioBloqueadoPorKmInicial ? 0.42 : 1,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        // Maintenance status card
                        Container(
                          margin: const EdgeInsets.only(top: 8),
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: const Color(0xFFECFDF5),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: const Color(0xFFD1FAE5)),
                          ),
                          child: Row(
                            children: [
                              Container(
                                width: 56,
                                height: 56,
                                decoration: BoxDecoration(
                                  color: Colors.white,
                                  borderRadius: BorderRadius.circular(8),
                                  boxShadow: [
                                    BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 4),
                                  ],
                                ),
                                child: const Icon(Icons.local_shipping, color: Color(0xFF065F46), size: 32),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: const [
                                    Text(
                                      'ESTADO DE MANTENIMIENTO',
                                      style: TextStyle(
                                        fontSize: 11,
                                        fontWeight: FontWeight.bold,
                                        color: Color(0xFF065F46),
                                      ),
                                    ),
                                    SizedBox(height: 2),
                                    Text(
                                      'Última revisión: Hace 15 días',
                                      style: TextStyle(fontSize: 12, color: Color(0xFF047857)),
                                    ),
                                  ],
                                ),
                              ),
                              const Icon(Icons.check_circle, color: Color(0xFF059669), size: 28),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
            AbsorbPointer(
              absorbing: _formularioBloqueadoPorKmInicial,
              child: Opacity(
                opacity: _formularioBloqueadoPorKmInicial ? 0.42 : 1,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
            const SizedBox(height: 16),

            // Section 2: Itinerario de Viaje
            _buildSection(
              title: 'Itinerario de Viaje',
              icon: Icons.map,
              color: const Color(0xFF00675E),
              children: [
                _buildTextField('Motivo del Viaje', _motivoViajeController, 'Ej. Traslado de personal'),
                // Origin/Destination with visual connector
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Column(
                      children: [
                        Container(
                          width: 10,
                          height: 10,
                          decoration: BoxDecoration(
                            color: const Color(0xFF00675E),
                            borderRadius: BorderRadius.circular(5),
                          ),
                        ),
                        Container(width: 2, height: 50, color: const Color(0xFFABADAF).withOpacity(0.3)),
                        Container(
                          width: 10,
                          height: 10,
                          decoration: BoxDecoration(
                            border: Border.all(color: const Color(0xFF00675E), width: 2),
                            borderRadius: BorderRadius.circular(5),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        children: [
                          _buildTextField('', _origenController, 'Punto de Origen'),
                          const SizedBox(height: 12),
                          _buildTextField('', _destinoController, 'Destino Final'),
                        ],
                      ),
                    ),
                  ],
                ),
                Row(
                  children: [
                    Expanded(child: _buildDateField('Fecha de Salida', _fechaSalidaController)),
                    const SizedBox(width: 12),
                    Expanded(child: _buildTimeField('Hora Estimada', _horaSalidaController)),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 16),

            // Section 3: Protocolo de Seguridad
            _buildSection(
              title: 'Protocolo de Seguridad',
              icon: Icons.security,
              color: const Color(0xFF702AE1),
              children: [
                _buildSwitchTile('Licencia de conducir vigente', Icons.contact_emergency, _licenciaVigente, (v) => setState(() => _licenciaVigente = v)),
                _buildSwitchTile('Manejo Defensivo aprobado', Icons.model_training, _manejoDefensivo, (v) => setState(() => _manejoDefensivo = v)),
                _buildSwitchTile('Checklist Pre-operacional', Icons.fact_check, _checklistPreoperacional, (v) => setState(() => _checklistPreoperacional = v)),
                _buildSwitchTile('Prueba de Alcohol (Negativa)', Icons.local_bar, _pruebaAlcohol, (v) => setState(() => _pruebaAlcohol = v)),
              ],
            ),
            const SizedBox(height: 16),

            // Section 4: Variables de Viaje
            _buildSection(
              title: 'Variables de Viaje',
              icon: Icons.settings_input_component,
              color: const Color(0xFF595C5E),
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _buildLabel('Tipo de Vehículo'),
                          Container(
                            padding: const EdgeInsets.all(14),
                            decoration: BoxDecoration(
                              color: const Color(0xFFEEF1F3),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(_selectedVehicle?.vehicleType ?? '-', style: const TextStyle(fontWeight: FontWeight.bold)),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _buildLabel('¿En Convoy?'),
                          Row(
                            children: [
                              Switch(
                                value: _enConvoy,
                                onChanged: (v) => setState(() => _enConvoy = v),
                                activeColor: const Color(0xFF0050D4),
                              ),
                              Text(_enConvoy ? 'Sí' : 'No', style: const TextStyle(fontWeight: FontWeight.w500)),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                if (_enConvoy)
                  _buildTextField('Placas de los vehículos del convoy', _placasConvoyController, 'ABC-123, DEF-456...'),
                
                _buildLabel('¿Lleva Pasajeros?'),
                Row(
                  children: [
                    Expanded(
                      child: _buildOptionButton('Sí', _llevaPasajeros, () => setState(() => _llevaPasajeros = true)),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: _buildOptionButton('No', !_llevaPasajeros, () => setState(() => _llevaPasajeros = false)),
                    ),
                  ],
                ),
                if (_llevaPasajeros) ...[
                  const SizedBox(height: 12),
                  _buildTextField('Nombre de los Pasajeros', _pasajerosController, 'Escriba el nombre de los pasajeros', maxLines: 2),
                ],
                
                const SizedBox(height: 12),
                _buildDropdownWithValue('Tipo de Carga', _tipoCargas, _tipoCarga, (v) => setState(() => _tipoCarga = (v ?? '').trim())),
                
                _buildDropdownWithValue(
                  'Tipo de vía',
                  _tipoVias,
                  _tipoCarretera,
                  (v) => setState(() => _tipoCarretera = (v ?? '').trim()),
                ),
                
                _buildLabel('Estado de la vía'),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: _estadoCarreteras
                      .map((e) => _buildChip(e, _estadoVia == e, () => setState(() => _estadoVia = (_estadoVia == e ? '' : e))))
                      .toList(),
                ),
                
                const SizedBox(height: 16),
                _buildLabel('Condiciones Climáticas'),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: _condicionClimaticaOpciones
                      .map((e) => _buildChip(e, _condicionClimatica == e, () => setState(() => _condicionClimatica = (_condicionClimatica == e ? '' : e))))
                      .toList(),
                ),
                
                const SizedBox(height: 16),
                _buildDropdownWithValue('Distancia a recorrer (KM)', _distanciaRecorrers, _distanciaRecorrer, (v) => setState(() => _distanciaRecorrer = (v ?? '').trim())),
              ],
            ),
            const SizedBox(height: 16),

            // Section 5: Gestión de Fatiga y Riesgo
            _buildSection(
              title: 'Gestión de Fatiga y Riesgo',
              icon: Icons.warning,
              color: const Color(0xFFB31B25),
              children: [
                // Warning banner
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFEE2E2),
                    borderRadius: BorderRadius.circular(8),
                    border: const Border(left: BorderSide(color: Color(0xFFB31B25), width: 4)),
                  ),
                  child: Row(
                    children: const [
                      Icon(Icons.info, color: Color(0xFFB31B25), size: 16),
                      SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'Campos obligatorios para la evaluación de riesgo.',
                          style: TextStyle(fontSize: 11, color: Color(0xFFB31B25), fontWeight: FontWeight.w600),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(child: _buildDropdownWithValue('Horas de Conducción', _horaConducciones, _horasConduccion, (v) => setState(() => _horasConduccion = (v ?? '').trim()))),
                    const SizedBox(width: 12),
                    Expanded(child: _buildDropdownWithValue('Horario de Circulación', _horarioCirculaciones, _horarioCirculacion, (v) => setState(() => _horarioCirculacion = (v ?? '').trim()))),
                  ],
                ),
                Row(
                  children: [
                    Expanded(child: _buildDropdownWithValue('Horas de Descanso', _horaDescansos, _horasDescanso, (v) => setState(() => _horasDescanso = (v ?? '').trim()))),
                  ],
                ),
                
                _buildDropdownWithValue(
                  'Medio de comunicación',
                  _medioComunicaciones,
                  _medioComunicacion,
                  (v) => setState(() => _medioComunicacion = (v ?? '').trim()),
                ),
                
                const SizedBox(height: 16),
                _buildLabel('Posibles riesgos en la vía'),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: _posiblesRiesgosVia
                      .map((e) => _buildChip(e, _riesgosSeleccionados.contains(e), () {
                            setState(() {
                              if (_riesgosSeleccionados.contains(e)) {
                                _riesgosSeleccionados.remove(e);
                              } else {
                                _riesgosSeleccionados.add(e);
                              }
                            });
                          }))
                      .toList(),
                ),
                const SizedBox(height: 12),
                _buildLabel('Otros peligros'),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: _otrosPeligrosOpciones
                      .map((e) => _buildChip(e, _otrosPeligrosSeleccionados.contains(e), () {
                            setState(() {
                              if (_otrosPeligrosSeleccionados.contains(e)) {
                                _otrosPeligrosSeleccionados.remove(e);
                              } else {
                                _otrosPeligrosSeleccionados.add(e);
                              }
                            });
                          }))
                      .toList(),
                ),
                const SizedBox(height: 12),
                _buildLabel('Medidas de control tomadas para el viaje'),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: _medidasControlOpciones
                      .map((e) => _buildChip(e, _medidasControlSeleccionadas.contains(e), () {
                            setState(() {
                              if (_medidasControlSeleccionadas.contains(e)) {
                                _medidasControlSeleccionadas.remove(e);
                              } else {
                                _medidasControlSeleccionadas.add(e);
                              }
                            });
                          }))
                      .toList(),
                ),
                
                const SizedBox(height: 12),
                _buildTextField('Paradas planificadas', _observacionesController, 'Especifique detalles adicionales si es necesario...', maxLines: 2),
              ],
            ),
            const SizedBox(height: 24),
                  ],
                ),
              ),
            ),

            // Submit button
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _isSaving || !_protocoloValido || _formularioBloqueadoPorKmInicial ? null : _submitForm,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF0050D4),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  elevation: 4,
                  disabledBackgroundColor: const Color(0xFF0050D4).withOpacity(0.5),
                ),
                child: _isSaving
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                        ),
                      )
                    : const Text(
                        'Finalizar Registro',
                        style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                      ),
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              'Al finalizar, se enviará una copia al monitor de transporte.',
              style: TextStyle(fontSize: 11, color: Color(0xFF595C5E), fontStyle: FontStyle.italic),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 100),
          ],
        ),
      ),
      bottomNavigationBar: BottomNavigationBar(
        type: BottomNavigationBarType.fixed,
        backgroundColor: Colors.white,
        elevation: 8,
        selectedItemColor: const Color(0xFF2563EB),
        unselectedItemColor: const Color(0xFF64748B),
        selectedLabelStyle: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold),
        unselectedLabelStyle: const TextStyle(fontSize: 10),
        currentIndex: 0,
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.assignment_late), label: 'ASSESSMENT'),
          BottomNavigationBarItem(icon: Icon(Icons.history_edu), label: 'LOGS'),
          BottomNavigationBarItem(icon: Icon(Icons.security), label: 'SAFETY'),
          BottomNavigationBarItem(icon: Icon(Icons.account_circle), label: 'PROFILE'),
        ],
      ),
    );
  }

  Widget _buildDateField(String label, TextEditingController controller) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (label.isNotEmpty) _buildLabel(label),
          Container(
            decoration: BoxDecoration(
              color: const Color(0xFFEEF1F3),
              borderRadius: BorderRadius.circular(8),
            ),
            child: TextField(
              controller: controller,
              readOnly: true,
              decoration: InputDecoration(
                hintText: 'DD/MM/YYYY',
                hintStyle: TextStyle(color: const Color(0xFF595C5E).withOpacity(0.6)),
                border: InputBorder.none,
                contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
                suffixIcon: const Icon(Icons.calendar_today, size: 18, color: Color(0xFF595C5E)),
              ),
              onTap: () async {
                final now = DateTime.now();
                final initial = _parseDate(controller.text) ?? now;
                final picked = await showDatePicker(
                  context: context,
                  initialDate: initial,
                  firstDate: DateTime(now.year - 5),
                  lastDate: DateTime(now.year + 5),
                );
                if (picked != null) {
                  final d = picked.day.toString().padLeft(2, '0');
                  final m = picked.month.toString().padLeft(2, '0');
                  final y = picked.year.toString();
                  setState(() => controller.text = '$d/$m/$y');
                }
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTimeField(String label, TextEditingController controller) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (label.isNotEmpty) _buildLabel(label),
          Container(
            decoration: BoxDecoration(
              color: const Color(0xFFEEF1F3),
              borderRadius: BorderRadius.circular(8),
            ),
            child: TextField(
              controller: controller,
              readOnly: true,
              decoration: InputDecoration(
                hintText: 'HH:MM',
                hintStyle: TextStyle(color: const Color(0xFF595C5E).withOpacity(0.6)),
                border: InputBorder.none,
                contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
                suffixIcon: const Icon(Icons.access_time, size: 18, color: Color(0xFF595C5E)),
              ),
              onTap: () async {
                final initial = _parseTime(controller.text) ?? TimeOfDay.now();
                final picked = await showTimePicker(
                  context: context,
                  initialTime: initial,
                );
                if (picked != null) {
                  final h = picked.hour.toString().padLeft(2, '0');
                  final m = picked.minute.toString().padLeft(2, '0');
                  setState(() => controller.text = '$h:$m');
                }
              },
            ),
          ),
        ],
      ),
    );
  }

  DateTime? _parseDate(String v) {
    try {
      final parts = v.split('/');
      if (parts.length != 3) return null;
      return DateTime(int.parse(parts[2]), int.parse(parts[1]), int.parse(parts[0]));
    } catch (_) {
      return null;
    }
  }

  TimeOfDay? _parseTime(String v) {
    try {
      final parts = v.split(':');
      if (parts.length != 2) return null;
      return TimeOfDay(hour: int.parse(parts[0]), minute: int.parse(parts[1]));
    } catch (_) {
      return null;
    }
  }

  Widget _buildProgressHeader() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: const Color(0xFF0050D4),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Paso $_currentStep de $_totalSteps',
            style: TextStyle(
              color: Colors.white.withOpacity(0.8),
              fontSize: 11,
              fontWeight: FontWeight.w600,
              letterSpacing: 1,
            ),
          ),
          const SizedBox(height: 4),
          const Text(
            'Datos del Vehículo',
            style: TextStyle(
              color: Colors.white,
              fontSize: 22,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 12),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: _currentStep / _totalSteps,
              backgroundColor: Colors.white.withOpacity(0.2),
              valueColor: const AlwaysStoppedAnimation<Color>(Colors.white),
              minHeight: 6,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSection({
    required String title,
    required IconData icon,
    required Color color,
    required List<Widget> children,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 8, offset: const Offset(0, 2)),
        ],
      ),
      child: Column(
        children: [
          // Header
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: color,
              borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(12),
                topRight: Radius.circular(12),
              ),
            ),
            child: Row(
              children: [
                Icon(icon, color: Colors.white, size: 20),
                const SizedBox(width: 8),
                Text(
                  title,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 14,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
          ),
          // Content
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: children,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLabel(String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6, top: 8),
      child: Text(
        text.toUpperCase(),
        style: const TextStyle(
          fontSize: 10,
          fontWeight: FontWeight.bold,
          color: Color(0xFF595C5E),
          letterSpacing: 1,
        ),
      ),
    );
  }

  Widget _buildKmInicialField() {
    final err = _kmInicialEsMenorQueUltimoRegistrado;
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildLabel('KM Inicial'),
          Container(
            decoration: BoxDecoration(
              color: const Color(0xFFEEF1F3),
              borderRadius: BorderRadius.circular(8),
              border: err ? Border.all(color: const Color(0xFFEF4444), width: 2) : null,
            ),
            child: TextField(
              controller: _kmInicialController,
              keyboardType: TextInputType.number,
              decoration: InputDecoration(
                hintText: '00000',
                hintStyle: TextStyle(color: const Color(0xFF595C5E).withOpacity(0.6)),
                border: InputBorder.none,
                contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
              ),
            ),
          ),
          if (_ultimoKm != null) ...[
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFFFFF7ED),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: const Color(0xFFFED7AA)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.info_outline, color: Color(0xFFEA580C), size: 18),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Último KM registrado: ${_ultimoKm!.toStringAsFixed(0)}',
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: Color(0xFFEA580C),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
          if (err) ...[
            const SizedBox(height: 8),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: const Color(0xFFFEF2F2),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: const Color(0xFFFECACA)),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(Icons.error_outline, color: Color(0xFFDC2626), size: 20),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'No es posible usar este valor: el KM inicial no puede ser menor al último kilometraje registrado (${_ultimoKm!.toStringAsFixed(0)} km). '
                      'Ajuste el dato para poder guardar el formulario.',
                      style: const TextStyle(
                        fontSize: 12,
                        color: Color(0xFF991B1B),
                        height: 1.35,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildTextField(
    String label,
    TextEditingController controller,
    String hint, {
    TextInputType keyboardType = TextInputType.text,
    bool readOnly = false,
    int maxLines = 1,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (label.isNotEmpty) _buildLabel(label),
          Container(
            decoration: BoxDecoration(
              color: readOnly ? const Color(0xFFE5E9EB) : const Color(0xFFEEF1F3),
              borderRadius: BorderRadius.circular(8),
            ),
            child: TextField(
              controller: controller,
              keyboardType: keyboardType,
              readOnly: readOnly,
              maxLines: maxLines,
              decoration: InputDecoration(
                hintText: hint,
                hintStyle: TextStyle(color: const Color(0xFF595C5E).withOpacity(0.6)),
                border: InputBorder.none,
                contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
              ),
            ),
          ),
        ],
      ),
    );
  }

  // Autocomplete field for employees
  Widget _buildAutocompleteField({
    required String label,
    required TextEditingController controller,
    required String hint,
    required List<EmployeeDto> suggestions,
    required Function(String) onChanged,
    required Function(EmployeeDto) onSuggestionSelected,
    required String Function(EmployeeDto) suggestionBuilder,
    TextInputType keyboardType = TextInputType.text,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildLabel(label),
          Container(
            decoration: BoxDecoration(
              color: const Color(0xFFEEF1F3),
              borderRadius: BorderRadius.circular(8),
            ),
            child: TextField(
              controller: controller,
              keyboardType: keyboardType,
              onChanged: onChanged,
              decoration: InputDecoration(
                hintText: hint,
                hintStyle: TextStyle(color: const Color(0xFF595C5E).withOpacity(0.6)),
                border: InputBorder.none,
                contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
                suffixIcon: const Icon(Icons.search, color: Color(0xFF595C5E), size: 20),
              ),
            ),
          ),
          // Suggestions dropdown
          if (suggestions.isNotEmpty)
            Container(
              margin: const EdgeInsets.only(top: 4),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(8),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.1),
                    blurRadius: 8,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              constraints: const BoxConstraints(maxHeight: 200),
              child: ListView.builder(
                shrinkWrap: true,
                padding: EdgeInsets.zero,
                itemCount: suggestions.length,
                itemBuilder: (context, index) {
                  final emp = suggestions[index];
                  return InkWell(
                    onTap: () => onSuggestionSelected(emp),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                      decoration: BoxDecoration(
                        border: index < suggestions.length - 1
                            ? Border(bottom: BorderSide(color: Colors.grey.withOpacity(0.2)))
                            : null,
                      ),
                      child: Row(
                        children: [
                          Container(
                            width: 32,
                            height: 32,
                            decoration: BoxDecoration(
                              color: const Color(0xFFE5E9EB),
                              borderRadius: BorderRadius.circular(16),
                            ),
                            child: emp.photoUrl != null
                                ? ClipRRect(
                                    borderRadius: BorderRadius.circular(16),
                                    child: Image.network(
                                      emp.photoUrl!,
                                      fit: BoxFit.cover,
                                      errorBuilder: (_, __, ___) => const Icon(Icons.person, size: 18, color: Color(0xFF64748B)),
                                    ),
                                  )
                                : const Icon(Icons.person, size: 18, color: Color(0xFF64748B)),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              suggestionBuilder(emp),
                              style: const TextStyle(fontSize: 13, color: Color(0xFF2C2F31)),
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
            ),
        ],
      ),
    );
  }

  // Vehicle autocomplete field
  Widget _buildVehicleAutocompleteField() {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildLabel('Placa del Vehículo'),
          Container(
            decoration: BoxDecoration(
              color: const Color(0xFFEEF1F3),
              borderRadius: BorderRadius.circular(8),
            ),
            child: TextField(
              controller: _placaController,
              onChanged: (v) {
                _searchVehicles(v);
                _programarConsultaGerenciaAbierta(v);
                _programarCargaUltimoKm(v);
              },
              decoration: InputDecoration(
                hintText: 'Buscar placa...',
                hintStyle: TextStyle(color: const Color(0xFF595C5E).withOpacity(0.6)),
                border: InputBorder.none,
                contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
                prefixIcon: const Icon(Icons.directions_car, color: Color(0xFF595C5E), size: 20),
                suffixIcon: const Icon(Icons.search, color: Color(0xFF595C5E), size: 20),
              ),
            ),
          ),
          // Vehicle suggestions dropdown
          if (_vehicleSuggestions.isNotEmpty)
            Container(
              margin: const EdgeInsets.only(top: 4),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(8),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.1),
                    blurRadius: 8,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              constraints: const BoxConstraints(maxHeight: 200),
              child: ListView.builder(
                shrinkWrap: true,
                padding: EdgeInsets.zero,
                itemCount: _vehicleSuggestions.length,
                itemBuilder: (context, index) {
                  final vehicle = _vehicleSuggestions[index];
                  return InkWell(
                    onTap: () => _selectVehicle(vehicle),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                      decoration: BoxDecoration(
                        border: index < _vehicleSuggestions.length - 1
                            ? Border(bottom: BorderSide(color: Colors.grey.withOpacity(0.2)))
                            : null,
                      ),
                      child: Row(
                        children: [
                          Container(
                            width: 32,
                            height: 32,
                            decoration: BoxDecoration(
                              color: const Color(0xFF0050D4).withOpacity(0.1),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: const Icon(Icons.directions_car, size: 18, color: Color(0xFF0050D4)),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  vehicle.placa ?? vehicle.codigoEquipo ?? '',
                                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFF2C2F31)),
                                ),
                                if (vehicle.vehicleType.isNotEmpty)
                                  Text(
                                    '${vehicle.vehicleType} - ${vehicle.marca ?? ""} ${vehicle.modelo ?? ""}',
                                    style: const TextStyle(fontSize: 11, color: Color(0xFF595C5E)),
                                  ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
            ),
          if (_consultandoPlacaAbierta)
            const Padding(
              padding: EdgeInsets.only(top: 8),
              child: Row(
                children: [
                  SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  ),
                  SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      'Comprobando si la unidad tiene un viaje abierto…',
                      style: TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                    ),
                  ),
                ],
              ),
            ),
          if (!_consultandoPlacaAbierta && _gerenciaAbiertaMismaPlaca != null)
            Container(
              margin: const EdgeInsets.only(top: 10),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFFFFF7ED),
                borderRadius: BorderRadius.circular(8),
                border: const Border(left: BorderSide(color: Color(0xFFF97316), width: 4)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Icon(Icons.warning_amber_rounded, color: Color(0xFFEA580C), size: 22),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          'Esta unidad tiene la gerencia ${_gerenciaAbiertaMismaPlaca!.codigo ?? "sin código"} aún abierta. '
                          'Debe cerrarla antes de poder crear un registro nuevo para esta placa.',
                          style: const TextStyle(fontSize: 12.5, color: Color(0xFF9A3412), height: 1.35),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton.tonalIcon(
                      onPressed: () async {
                        final g = _gerenciaAbiertaMismaPlaca!;
                        final cerrado = await Navigator.push<bool>(
                          context,
                          MaterialPageRoute<bool>(
                            builder: (ctx) => CerrarGerenciaScreen(gerencia: g),
                          ),
                        );
                        if (!context.mounted) return;
                        if (cerrado == true) {
                          await _consultarGerenciaAbiertaPorPlaca(_placaController.text);
                          if (!context.mounted) return;
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text('Gerencia cerrada. Ya puede continuar con el nuevo registro si corresponde.'),
                              backgroundColor: Color(0xFF0050D4),
                              duration: Duration(seconds: 4),
                            ),
                          );
                        }
                      },
                      icon: const Icon(Icons.lock_open, size: 20, color: Color(0xFFEA580C)),
                      style: FilledButton.styleFrom(
                        backgroundColor: const Color(0xFFFFEDD5),
                        foregroundColor: const Color(0xFF9A3412),
                        padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                      label: const Text(
                        'Ir a cerrar esta gerencia ahora',
                        style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
                      ),
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildDropdown(String label, List<String> options) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildLabel(label),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14),
            decoration: BoxDecoration(
              color: const Color(0xFFEEF1F3),
              borderRadius: BorderRadius.circular(8),
            ),
            child: DropdownButtonHideUnderline(
              child: DropdownButton<String>(
                value: options.first,
                isExpanded: true,
                items: options.map((e) => DropdownMenuItem(value: e, child: Text(e))).toList(),
                onChanged: (v) {},
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDropdownWithValue(String label, List<String> options, String currentValue, ValueChanged<String?> onChanged) {
    final hasData = options.isNotEmpty;
    final effectiveValue = hasData && options.contains(currentValue) ? currentValue : null;
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildLabel(label),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14),
            decoration: BoxDecoration(
              color: const Color(0xFFEEF1F3),
              borderRadius: BorderRadius.circular(8),
            ),
            child: hasData
                ? Row(
                    children: [
                      Expanded(
                        child: DropdownButtonHideUnderline(
                          child: DropdownButton<String>(
                            value: effectiveValue,
                            isExpanded: true,
                            hint: const Text('Seleccionar...'),
                            items: options.map((e) => DropdownMenuItem(value: e, child: Text(e))).toList(),
                            onChanged: onChanged,
                          ),
                        ),
                      ),
                      if (effectiveValue != null)
                        IconButton(
                          icon: const Icon(Icons.clear, size: 18, color: Color(0xFF595C5E)),
                          onPressed: () => onChanged(null),
                          tooltip: 'Quitar selección',
                        ),
                    ],
                  )
                : Padding(
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    child: Text('Sin datos', style: TextStyle(color: const Color(0xFF595C5E).withOpacity(0.6))),
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildSwitchTile(String title, IconData icon, bool value, Function(bool) onChanged) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 4),
      decoration: const BoxDecoration(
        border: Border(bottom: BorderSide(color: Color(0xFFE5E9EB))),
      ),
      child: Row(
        children: [
          Icon(icon, color: const Color(0xFF702AE1), size: 22),
          const SizedBox(width: 12),
          Expanded(
            child: Text(title, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500)),
          ),
          Switch(
            value: value,
            onChanged: onChanged,
            activeColor: const Color(0xFF702AE1),
          ),
        ],
      ),
    );
  }

  Widget _buildOptionButton(String label, bool isSelected, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFF0050D4) : const Color(0xFFEEF1F3),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Center(
          child: Text(
            label,
            style: TextStyle(
              color: isSelected ? Colors.white : const Color(0xFF595C5E),
              fontSize: 12,
              fontWeight: FontWeight.bold,
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildChip(String label, bool isSelected, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFF0050D4).withOpacity(0.1) : const Color(0xFFEEF1F3),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected ? const Color(0xFF0050D4) : const Color(0xFFABADAF).withOpacity(0.5),
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              isSelected ? Icons.check_box : Icons.check_box_outline_blank,
              size: 16,
              color: isSelected ? const Color(0xFF0050D4) : const Color(0xFF595C5E),
            ),
            const SizedBox(width: 6),
            Text(
              label,
              style: TextStyle(
                color: const Color(0xFF2C2F31),
                fontSize: 11,
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildWeatherOption(IconData icon, String label, bool isSelected, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Column(
        children: [
          Icon(
            icon,
            size: 28,
            color: isSelected ? const Color(0xFF0050D4) : const Color(0xFF595C5E).withOpacity(0.4),
          ),
          const SizedBox(height: 4),
          Text(
            label,
            style: TextStyle(
              fontSize: 9,
              fontWeight: FontWeight.bold,
              color: isSelected ? const Color(0xFF0050D4) : const Color(0xFF595C5E).withOpacity(0.4),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildRiskOption(IconData icon, String label) {
    final isSelected = _riesgosSeleccionados.contains(label);
    return GestureDetector(
      onTap: () {
        setState(() {
          if (isSelected) {
            _riesgosSeleccionados.remove(label);
          } else {
            _riesgosSeleccionados.add(label);
          }
        });
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFF0050D4).withOpacity(0.1) : const Color(0xFFEEF1F3),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(
            color: isSelected ? const Color(0xFF0050D4) : const Color(0xFFABADAF).withOpacity(0.3),
          ),
        ),
        child: Row(
          children: [
            Icon(icon, size: 16, color: isSelected ? const Color(0xFF0050D4) : const Color(0xFF595C5E)),
            const SizedBox(width: 6),
            Expanded(
              child: Text(
                label,
                style: TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.bold,
                  color: isSelected ? const Color(0xFF0050D4) : const Color(0xFF595C5E),
                ),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _submitForm() async {
    if (_isSaving) return;

    // Validación básica
    if (_conductorController.text.isEmpty || _placaController.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Complete los campos obligatorios: Conductor y Placa'),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    if (_kmInicialEsMenorQueUltimoRegistrado && _ultimoKm != null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'KM inicial inválido: debe ser mayor o igual a ${_ultimoKm!.toStringAsFixed(0)} km (último registro de esta placa).',
          ),
          backgroundColor: Colors.red,
          duration: const Duration(seconds: 5),
        ),
      );
      return;
    }

    if (!_protocoloValido) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Debe cumplir todo el Protocolo de Seguridad para iniciar el viaje.'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    if (_medioComunicaciones.isNotEmpty && _medioComunicacion.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Seleccione un medio de comunicación.'),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    final placaEnvio = _placaController.text.trim();
    if (placaEnvio.isNotEmpty) {
      final abierta = await _gerenciaService.findAbiertaPorVehiculo(placaEnvio);
      if (!mounted) return;
      if (abierta != null) {
        setState(() => _gerenciaAbiertaMismaPlaca = abierta);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              'No se puede crear el registro: la placa $placaEnvio tiene la gerencia ${abierta.codigo ?? abierta.id?.toString() ?? ""} abierta. '
              'Cierre esa gerencia antes de continuar.',
            ),
            backgroundColor: Colors.orange,
            duration: const Duration(seconds: 6),
          ),
        );
        return;
      }
    }

    setState(() => _isSaving = true);

    try {
      // Parse fecha
      DateTime? fechaSalida;
      if (_fechaSalidaController.text.isNotEmpty) {
        final parts = _fechaSalidaController.text.split('/');
        if (parts.length == 3) {
          fechaSalida = DateTime.tryParse('${parts[2]}-${parts[1]}-${parts[0]}');
        }
      }

      final dto = GerenciaViajeDto(
        conductor: _conductorController.text,
        cedula: _cedulaController.text,
        vehiculoInicio: _placaController.text,
        kmInicial: double.tryParse(_kmInicialController.text),
        telefono: _telefonoController.text,
        cargo: _cargoController.text,
        area: _areaController.text,
        proyecto: _gerenciaController.text,
        motivo: _motivoViajeController.text,
        origen: _origenController.text,
        destino: _destinoController.text,
        fechaSalida: fechaSalida,
        horaSalida: _horaSalidaController.text,
        licenciaVigente: _licenciaVigente ? 'SÍ' : 'NO',
        manejoDefensivo: _manejoDefensivo ? 'SÍ' : 'NO',
        inspeccionVehiculo: _checklistPreoperacional ? 'SÍ' : 'NO',
        testAlcohol: _pruebaAlcohol ? 'NEGATIVO' : 'NO REALIZADO',
        llevaPasajeros: _llevaPasajeros ? 'SÍ' : 'NO',
        pasajeros: _llevaPasajeros ? _pasajerosController.text : null,
        tipoVehiculo: _selectedVehicle?.vehicleType,
        convoy: _enConvoy ? 'SÍ' : 'NO',
        unidadesConvoy: _enConvoy ? _placasConvoyController.text : null,
        estadoVia: _estadoVia,
        clima: _condicionClimatica,
        distancia: _distanciaRecorrer,
        tipoCarga: _tipoCarga,
        horasConduccion: _horasConduccion,
        horarioViaje: _horarioCirculacion,
        descansoConduc: _horasDescanso,
        mediosComunicacion: _medioComunicacionesSeleccionados.isNotEmpty
            ? _medioComunicacionesSeleccionados.join(', ')
            : _medioComunicacion,
        riesgosVia: _riesgosSeleccionados.join(', '),
        catalogoOtrosPeligros: _otrosPeligrosSeleccionados.isNotEmpty ? _otrosPeligrosSeleccionados.join(', ') : null,
        medidasControlTomadasViaje: _medidasControlSeleccionadas.isNotEmpty ? _medidasControlSeleccionadas.join(', ') : null,
        paradasPlanificadas: _observacionesController.text.trim().isEmpty
            ? null
            : _observacionesController.text.trim(),
        estado: 'ACTIVO',
      );

      await _gerenciaService.create(dto);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Registro guardado exitosamente'),
            backgroundColor: Colors.green,
          ),
        );
        Navigator.pop(context, true); // Return true to indicate success
      }
    } catch (e) {
      if (mounted) {
        final msg = e.toString().replaceFirst(RegExp(r'^Exception:\s*'), '');
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(msg),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isSaving = false);
      }
    }
  }
}
