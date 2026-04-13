import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config/app_config.dart';
import 'auth_service.dart';

class GerenciaViajeDto {
  final int? id;
  final int? businessId;
  final String? businessName;
  final String? businessRuc;
  final String? codigo;
  final DateTime? fechaHora;
  final String? conductor;
  final String? cedula;
  final String? vehiculoInicio;
  final double? kmInicial;
  final String? telefono;
  final String? cargo;
  final String? area;
  final String? proyecto;
  final String? motivo;
  final String? origen;
  final String? destino;
  final DateTime? fechaSalida;
  final String? horaSalida;
  final String? licenciaVigente;
  final String? manejoDefensivo;
  final String? inspeccionVehiculo;
  final String? mediosComunicacion;
  final String? testAlcohol;
  final String? llevaPasajeros;
  final String? pasajeros;
  final String? tipoVehiculo;
  final String? convoy;
  final String? unidadesConvoy;
  final String? tipoCarretera;
  final String? estadoVia;
  final String? clima;
  final String? distancia;
  final String? tipoCarga;
  final String? otrosPeligros;
  final String? catalogoOtrosPeligros;
  final String? horasConduccion;
  final String? horarioViaje;
  final String? descansoConduc;
  final String? riesgosVia;
  final String? medidasControl;
  final String? medidasControlTomadasViaje;
  final String? paradasPlanificadas;
  final double? kmFinal;
  final DateTime? fechaCierre;
  final String? estado;
  final int? scoreTotal;
  final String? nivelRiesgo;
  final String? createdBy;
  final DateTime? createdAt;
  final String? conductorFoto;

  GerenciaViajeDto({
    this.id,
    this.businessId,
    this.businessName,
    this.businessRuc,
    this.codigo,
    this.fechaHora,
    this.conductor,
    this.cedula,
    this.vehiculoInicio,
    this.kmInicial,
    this.telefono,
    this.cargo,
    this.area,
    this.proyecto,
    this.motivo,
    this.origen,
    this.destino,
    this.fechaSalida,
    this.horaSalida,
    this.licenciaVigente,
    this.manejoDefensivo,
    this.inspeccionVehiculo,
    this.mediosComunicacion,
    this.testAlcohol,
    this.llevaPasajeros,
    this.pasajeros,
    this.tipoVehiculo,
    this.convoy,
    this.unidadesConvoy,
    this.tipoCarretera,
    this.estadoVia,
    this.clima,
    this.distancia,
    this.tipoCarga,
    this.otrosPeligros,
    this.catalogoOtrosPeligros,
    this.horasConduccion,
    this.horarioViaje,
    this.descansoConduc,
    this.riesgosVia,
    this.medidasControl,
    this.medidasControlTomadasViaje,
    this.paradasPlanificadas,
    this.kmFinal,
    this.fechaCierre,
    this.estado,
    this.scoreTotal,
    this.nivelRiesgo,
    this.createdBy,
    this.createdAt,
    this.conductorFoto,
  });

  factory GerenciaViajeDto.fromJson(Map<String, dynamic> json) {
    return GerenciaViajeDto(
      id: json['id'] as int?,
      businessId: json['businessId'] as int?,
      businessName: json['businessName'] as String?,
      businessRuc: json['businessRuc'] as String?,
      codigo: json['codigo'] as String?,
      fechaHora: json['fechaHora'] != null ? DateTime.tryParse(json['fechaHora']) : null,
      conductor: json['conductor'] as String?,
      cedula: json['cedula'] as String?,
      vehiculoInicio: json['vehiculoInicio'] as String?,
      kmInicial: (json['kmInicial'] as num?)?.toDouble(),
      telefono: json['telefono'] as String?,
      cargo: json['cargo'] as String?,
      area: json['area'] as String?,
      proyecto: json['proyecto'] as String?,
      motivo: json['motivo'] as String?,
      origen: json['origen'] as String?,
      destino: json['destino'] as String?,
      fechaSalida: json['fechaSalida'] != null ? DateTime.tryParse(json['fechaSalida']) : null,
      horaSalida: json['horaSalida'] as String?,
      licenciaVigente: json['licenciaVigente'] as String?,
      manejoDefensivo: json['manejoDefensivo'] as String?,
      inspeccionVehiculo: json['inspeccionVehiculo'] as String?,
      mediosComunicacion: json['mediosComunicacion'] as String?,
      testAlcohol: json['testAlcohol'] as String?,
      llevaPasajeros: json['llevaPasajeros'] as String?,
      pasajeros: json['pasajeros'] as String?,
      tipoVehiculo: json['tipoVehiculo'] as String?,
      convoy: json['convoy'] as String?,
      unidadesConvoy: json['unidadesConvoy'] as String?,
      tipoCarretera: json['tipoCarretera'] as String?,
      estadoVia: json['estadoVia'] as String?,
      clima: json['clima'] as String?,
      distancia: json['distancia'] as String?,
      tipoCarga: json['tipoCarga'] as String?,
      otrosPeligros: json['otrosPeligros'] as String?,
      catalogoOtrosPeligros: json['catalogoOtrosPeligros'] as String?,
      horasConduccion: json['horasConduccion'] as String?,
      horarioViaje: json['horarioViaje'] as String?,
      descansoConduc: json['descansoConduc'] as String?,
      riesgosVia: json['riesgosVia'] as String?,
      medidasControl: json['medidasControl'] as String?,
      medidasControlTomadasViaje: json['medidasControlTomadasViaje'] as String?,
      paradasPlanificadas: json['paradasPlanificadas'] as String?,
      kmFinal: (json['kmFinal'] as num?)?.toDouble(),
      fechaCierre: json['fechaCierre'] != null ? DateTime.tryParse(json['fechaCierre']) : null,
      estado: json['estado'] as String?,
      scoreTotal: json['scoreTotal'] as int?,
      nivelRiesgo: json['nivelRiesgo'] as String?,
      createdBy: json['createdBy'] as String?,
      createdAt: json['createdAt'] != null ? DateTime.tryParse(json['createdAt']) : null,
      conductorFoto: json['conductorFoto'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      if (id != null) 'id': id,
      if (conductor != null) 'conductor': conductor,
      if (cedula != null) 'cedula': cedula,
      if (vehiculoInicio != null) 'vehiculoInicio': vehiculoInicio,
      if (kmInicial != null) 'kmInicial': kmInicial,
      if (telefono != null) 'telefono': telefono,
      if (cargo != null) 'cargo': cargo,
      if (area != null) 'area': area,
      if (proyecto != null) 'proyecto': proyecto,
      if (motivo != null) 'motivo': motivo,
      if (origen != null) 'origen': origen,
      if (destino != null) 'destino': destino,
      if (fechaSalida != null) 'fechaSalida': fechaSalida!.toIso8601String().split('T')[0],
      if (horaSalida != null) 'horaSalida': horaSalida,
      if (licenciaVigente != null) 'licenciaVigente': licenciaVigente,
      if (manejoDefensivo != null) 'manejoDefensivo': manejoDefensivo,
      if (inspeccionVehiculo != null) 'inspeccionVehiculo': inspeccionVehiculo,
      if (mediosComunicacion != null) 'mediosComunicacion': mediosComunicacion,
      if (testAlcohol != null) 'testAlcohol': testAlcohol,
      if (llevaPasajeros != null) 'llevaPasajeros': llevaPasajeros,
      if (pasajeros != null) 'pasajeros': pasajeros,
      if (tipoVehiculo != null) 'tipoVehiculo': tipoVehiculo,
      if (convoy != null) 'convoy': convoy,
      if (unidadesConvoy != null) 'unidadesConvoy': unidadesConvoy,
      if (tipoCarretera != null) 'tipoCarretera': tipoCarretera,
      if (estadoVia != null) 'estadoVia': estadoVia,
      if (clima != null) 'clima': clima,
      if (distancia != null) 'distancia': distancia,
      if (tipoCarga != null) 'tipoCarga': tipoCarga,
      if (otrosPeligros != null) 'otrosPeligros': otrosPeligros,
      if (catalogoOtrosPeligros != null) 'catalogoOtrosPeligros': catalogoOtrosPeligros,
      if (horasConduccion != null) 'horasConduccion': horasConduccion,
      if (horarioViaje != null) 'horarioViaje': horarioViaje,
      if (descansoConduc != null) 'descansoConduc': descansoConduc,
      if (riesgosVia != null) 'riesgosVia': riesgosVia,
      if (medidasControl != null) 'medidasControl': medidasControl,
      if (medidasControlTomadasViaje != null) 'medidasControlTomadasViaje': medidasControlTomadasViaje,
      if (paradasPlanificadas != null) 'paradasPlanificadas': paradasPlanificadas,
      if (kmFinal != null) 'kmFinal': kmFinal,
      if (estado != null) 'estado': estado,
    };
  }
}

class GerenciaViajeStats {
  final int total;
  final int activos;
  final int completados;

  GerenciaViajeStats({
    required this.total,
    required this.activos,
    required this.completados,
  });

  factory GerenciaViajeStats.fromJson(Map<String, dynamic> json) {
    return GerenciaViajeStats(
      total: (json['total'] as num?)?.toInt() ?? 0,
      activos: (json['activos'] as num?)?.toInt() ?? 0,
      completados: (json['completados'] as num?)?.toInt() ?? 0,
    );
  }
}

class GerenciaViajeService {
  final AuthService _authService = AuthService();

  Map<String, String> get _headers => {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    if (_authService.token != null) 'Authorization': 'Bearer ${_authService.token}',
  };

  String? get _ruc => _authService.getPrimaryBusinessRuc();

  Future<List<GerenciaViajeDto>> getAll() async {
    if (_ruc == null) throw Exception('No hay empresa seleccionada');
    
    final url = '${AppConfig.baseUrl}/api/gerencias-viajes/business/$_ruc';
    final response = await http.get(Uri.parse(url), headers: _headers);

    if (response.statusCode == 200) {
      final List<dynamic> data = jsonDecode(response.body);
      return data.map((json) => GerenciaViajeDto.fromJson(json)).toList();
    }
    
    throw Exception('Error al cargar gerencias: ${response.statusCode}');
  }

  Future<GerenciaViajeStats> getStats() async {
    if (_ruc == null) throw Exception('No hay empresa seleccionada');
    
    final url = '${AppConfig.baseUrl}/api/gerencias-viajes/business/$_ruc/stats';
    final response = await http.get(Uri.parse(url), headers: _headers);

    if (response.statusCode == 200) {
      final Map<String, dynamic> data = jsonDecode(response.body);
      return GerenciaViajeStats.fromJson(data);
    }
    
    throw Exception('Error al cargar estadísticas: ${response.statusCode}');
  }

  Future<String> getNextCodigo() async {
    if (_ruc == null) throw Exception('No hay empresa seleccionada');
    
    final url = '${AppConfig.baseUrl}/api/gerencias-viajes/business/$_ruc/next-codigo';
    final response = await http.get(Uri.parse(url), headers: _headers);

    if (response.statusCode == 200) {
      final Map<String, dynamic> data = jsonDecode(response.body);
      return data['codigo'] as String? ?? '';
    }
    
    throw Exception('Error al obtener código: ${response.statusCode}');
  }

  /// Gerencia en estado ACTIVO para la placa, o null si no hay.
  Future<GerenciaViajeDto?> findAbiertaPorVehiculo(String placa) async {
    if (_ruc == null) return null;
    final trimmed = placa.trim();
    if (trimmed.isEmpty) return null;
    final enc = Uri.encodeComponent(trimmed);
    final url = '${AppConfig.baseUrl}/api/gerencias-viajes/business/$_ruc/vehiculo/$enc/abierta';
    final response = await http.get(Uri.parse(url), headers: _headers);

    if (response.statusCode == 200) {
      final raw = response.body.trim();
      if (raw.isEmpty || raw == 'null') return null;
      final decoded = jsonDecode(raw);
      if (decoded is! Map<String, dynamic>) return null;
      return GerenciaViajeDto.fromJson(decoded);
    }
    return null;
  }

  Future<double?> getUltimoKm(String placa) async {
    if (_ruc == null) throw Exception('No hay empresa seleccionada');
    
    final enc = Uri.encodeComponent(placa.trim());
    final url = '${AppConfig.baseUrl}/api/gerencias-viajes/business/$_ruc/vehiculo/$enc/ultimo-km';
    final response = await http.get(Uri.parse(url), headers: _headers);

    if (response.statusCode == 200) {
      final Map<String, dynamic> data = jsonDecode(response.body);
      return (data['ultimoKm'] as num?)?.toDouble();
    }
    
    return null;
  }

  Future<GerenciaViajeDto> create(GerenciaViajeDto dto) async {
    if (_ruc == null) throw Exception('No hay empresa seleccionada');
    
    final url = '${AppConfig.baseUrl}/api/gerencias-viajes/business/$_ruc';
    final response = await http.post(
      Uri.parse(url),
      headers: _headers,
      body: jsonEncode(dto.toJson()),
    );

    if (response.statusCode == 201 || response.statusCode == 200) {
      final Map<String, dynamic> data = jsonDecode(response.body);
      return GerenciaViajeDto.fromJson(data);
    }

    final detail = _messageFromErrorBody(response.body);
    throw Exception(detail ?? 'Error al crear gerencia (${response.statusCode})');
  }

  /// Extrae `message` o `rootMessage` del JSON de error del API.
  static String? _messageFromErrorBody(String body) {
    if (body.isEmpty) return null;
    try {
      final dynamic decoded = jsonDecode(body);
      if (decoded is Map<String, dynamic>) {
        final m = decoded['message']?.toString().trim();
        if (m != null && m.isNotEmpty) return m;
        final r = decoded['rootMessage']?.toString().trim();
        if (r != null && r.isNotEmpty) return r;
      }
    } catch (_) {}
    return null;
  }

  Future<GerenciaViajeDto> cerrar(int id, double kmFinal) async {
    final url = '${AppConfig.baseUrl}/api/gerencias-viajes/$id/cierre';
    final today = DateTime.now().toIso8601String().split('T')[0];
    
    final response = await http.patch(
      Uri.parse(url),
      headers: _headers,
      body: jsonEncode({
        'kmFinal': kmFinal,
        'fechaCierre': today,
      }),
    );

    if (response.statusCode == 200) {
      final Map<String, dynamic> data = jsonDecode(response.body);
      return GerenciaViajeDto.fromJson(data);
    }
    
    throw Exception('Error al cerrar gerencia: ${response.statusCode} - ${response.body}');
  }

  Future<GerenciaViajeDto> getById(int id) async {
    final url = '${AppConfig.baseUrl}/api/gerencias-viajes/$id';
    final response = await http.get(Uri.parse(url), headers: _headers);

    if (response.statusCode == 200) {
      final Map<String, dynamic> data = jsonDecode(response.body);
      return GerenciaViajeDto.fromJson(data);
    }
    
    throw Exception('Error al cargar gerencia: ${response.statusCode}');
  }

  Future<void> delete(int id) async {
    final url = '${AppConfig.baseUrl}/api/gerencias-viajes/$id';
    final response = await http.delete(Uri.parse(url), headers: _headers);

    if (response.statusCode != 204 && response.statusCode != 200) {
      throw Exception('Error al eliminar gerencia: ${response.statusCode}');
    }
  }
}
