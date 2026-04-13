import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config/app_config.dart';
import 'auth_service.dart';

class VehicleDto {
  final int? id;
  final String? placa;
  final String? codigoEquipo;
  final String? tipoVehiculo;
  final String? clase;
  final String? marca;
  final String? modelo;
  final int? anio;
  final String? color;
  final String? estado;
  final bool? active;
  // Km de inicio en ficha de flota (referencia para validaciones).
  final int? kmInicio;

  VehicleDto({
    this.id,
    this.placa,
    this.codigoEquipo,
    this.tipoVehiculo,
    this.clase,
    this.marca,
    this.modelo,
    this.anio,
    this.color,
    this.estado,
    this.active,
    this.kmInicio,
  });

  factory VehicleDto.fromJson(Map<String, dynamic> json) {
    return VehicleDto(
      id: json['id'] as int?,
      placa: json['placa'] as String?,
      codigoEquipo: json['codigoEquipo'] as String?,
      tipoVehiculo: json['tipoVehiculo'] as String?,
      clase: json['clase'] as String?,
      marca: json['marca'] as String?,
      modelo: json['modelo'] as String?,
      anio: json['anio'] as int?,
      color: json['color'] as String?,
      estado: json['estado'] as String?,
      active: json['active'] as bool?,
      kmInicio: json['kmInicio'] as int?,
    );
  }

  String get displayName => placa ?? codigoEquipo ?? 'Sin placa';
  String get vehicleType => tipoVehiculo ?? clase ?? '';
}

class VehicleService {
  final AuthService _authService = AuthService();

  Map<String, String> get _headers => {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    if (_authService.token != null) 'Authorization': 'Bearer ${_authService.token}',
  };

  String? get _ruc => _authService.getPrimaryBusinessRuc();

  /// Get all vehicles for the business
  Future<List<VehicleDto>> getAll() async {
    if (_ruc == null) return [];
    
    try {
      final url = '${AppConfig.baseUrl}/api/fleet/$_ruc/vehicles?page=1&pageSize=500';
      final response = await http.get(Uri.parse(url), headers: _headers);

      if (response.statusCode == 200) {
        final Map<String, dynamic> data = jsonDecode(response.body);
        final List<dynamic> vehicles = data['vehicles'] ?? [];
        return vehicles.map((v) => VehicleDto.fromJson(v)).toList();
      }
      
      return [];
    } catch (e) {
      print('Error fetching vehicles: $e');
      return [];
    }
  }

  /// Search vehicles by placa (for autocomplete)
  Future<List<VehicleDto>> search(String term) async {
    if (_ruc == null || term.length < 2) return [];
    
    try {
      final vehicles = await getAll();
      final termLower = term.toLowerCase();
      
      return vehicles.where((v) {
        final placa = (v.placa ?? '').toLowerCase();
        final codigo = (v.codigoEquipo ?? '').toLowerCase();
        return placa.contains(termLower) || codigo.contains(termLower);
      }).take(10).toList();
    } catch (e) {
      print('Error searching vehicles: $e');
      return [];
    }
  }

  /// Get vehicle by placa
  Future<VehicleDto?> getByPlaca(String placa) async {
    if (_ruc == null) return null;
    
    try {
      final vehicles = await getAll();
      final placaLower = placa.toLowerCase();
      
      return vehicles.firstWhere(
        (v) => (v.placa ?? '').toLowerCase() == placaLower,
        orElse: () => VehicleDto(),
      );
    } catch (e) {
      print('Error fetching vehicle by placa: $e');
      return null;
    }
  }
}
