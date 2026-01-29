import 'dart:convert';
import 'package:flutter/foundation.dart';

import 'package:http/http.dart' as http;

import '../config/app_config.dart';
import 'auth_service.dart';

class EmployeesService {
  static final Map<String, Map<String, dynamic>?> _detailCache = <String, Map<String, dynamic>?>{};
  static final Map<String, Map<String, dynamic>?> _emergencyCache = <String, Map<String, dynamic>?>{};

  String _cacheKey({dynamic id, String? cedula}) {
    final idPart = id != null ? id.toString() : '';
    final cedPart = (cedula ?? '').trim();
    return '$idPart|$cedPart';
  }

  Future<dynamic> _getJson(String url, String token) async {
    final resp = await http
        .get(
          Uri.parse(url),
          headers: {
            'Authorization': 'Bearer $token',
            'Accept': 'application/json',
          },
        )
        .timeout(const Duration(seconds: 6));
    if (resp.statusCode != 200) return null;
    return jsonDecode(resp.body);
  }

  Map<String, dynamic>? _extractDataMap(dynamic decoded) {
    if (decoded is Map<String, dynamic>) {
      if (decoded['data'] is Map<String, dynamic>) {
        return decoded['data'] as Map<String, dynamic>;
      }
      return decoded;
    }
    return null;
  }

  Future<List<Map<String, dynamic>>> getEmployeesByBusinessRuc(String businessRuc) async {
    final String url = '${AppConfig.baseUrl}/api/business-employees/company/$businessRuc';
    final token = AuthService().token;
    if (token == null) {
      throw Exception('Sesión no válida. Inicia sesión nuevamente.');
    }

    final response = await http.get(
      Uri.parse(url),
      headers: {
        'Authorization': 'Bearer $token',
        'Accept': 'application/json',
      },
    );

    if (response.statusCode == 200) {
      final decoded = jsonDecode(response.body);
      if (decoded is List) {
        return decoded.cast<Map<String, dynamic>>();
      }
      if (decoded is Map<String, dynamic> && decoded['data'] is List) {
        return (decoded['data'] as List).cast<Map<String, dynamic>>();
      }
      throw Exception('Formato de respuesta no esperado');
    }

    if (response.statusCode == 401) {
      throw Exception('No autorizado');
    }

    throw Exception('Error al obtener empleados (${response.statusCode})');
  }

  Future<List<Map<String, dynamic>>> getEmployeeDocuments(dynamic employeeId) async {
    if (employeeId == null) return <Map<String, dynamic>>[];
    final token = AuthService().token;
    if (token == null) return <Map<String, dynamic>>[];

    final List<String> urls = [
      '${AppConfig.baseUrl}/api/employee-documents/employee/$employeeId',
      '${AppConfig.baseUrl}/api/employees/$employeeId/documents',
      '${AppConfig.baseUrl}/api/employees/$employeeId/files',
    ];
    for (final url in urls) {
      try {
        final resp = await http.get(
          Uri.parse(url),
          headers: {
            'Authorization': 'Bearer $token',
            'Accept': 'application/json',
          },
        );
        if (resp.statusCode == 200) {
          final decoded = jsonDecode(resp.body);
          if (decoded is List) return decoded.cast<Map<String, dynamic>>();
          if (decoded is Map<String, dynamic> && decoded['data'] is List) {
            return (decoded['data'] as List).cast<Map<String, dynamic>>();
          }
        }
      } catch (_) {}
    }
    return <Map<String, dynamic>>[];
  }

  Future<List<Map<String, dynamic>>> getEmployeeCertifications(dynamic employeeId) async {
    if (employeeId == null) return <Map<String, dynamic>>[];
    final token = AuthService().token;
    if (token == null) return <Map<String, dynamic>>[];

    final List<String> urls = [
      '${AppConfig.baseUrl}/api/employee-courses/employee/$employeeId',
      '${AppConfig.baseUrl}/api/trainings/employee/$employeeId',
      '${AppConfig.baseUrl}/api/employees/$employeeId/certifications',
    ];
    for (final url in urls) {
      try {
        final resp = await http.get(
          Uri.parse(url),
          headers: {
            'Authorization': 'Bearer $token',
            'Accept': 'application/json',
          },
        );
        if (resp.statusCode == 200) {
          final decoded = jsonDecode(resp.body);
          if (decoded is List) return decoded.cast<Map<String, dynamic>>();
          if (decoded is Map<String, dynamic> && decoded['data'] is List) {
            return (decoded['data'] as List).cast<Map<String, dynamic>>();
          }
        }
      } catch (_) {}
    }
    return <Map<String, dynamic>>[];
  }

  Future<Map<String, dynamic>?> getEmployeeDetail({dynamic id, String? cedula}) async {
    final token = AuthService().token;
    if (token == null) return null;
    final key = _cacheKey(id: id, cedula: cedula);
    if (_detailCache.containsKey(key)) return _detailCache[key];

    final ced = (cedula ?? '').trim();
    final List<String> urls = [
      if (id != null) '${AppConfig.baseUrl}/api/employees/$id',
      if (id != null) '${AppConfig.baseUrl}/api/business-employees/$id',
      if (ced.isNotEmpty) '${AppConfig.baseUrl}/api/employees/cedula/$ced',
      if (ced.isNotEmpty) '${AppConfig.baseUrl}/api/business-employees/cedula/$ced',
    ];

    Map<String, dynamic>? result;
    for (final url in urls) {
      try {
        final decoded = await _getJson(url, token);
        result = _extractDataMap(decoded);
        if (result != null) break;
      } catch (_) {}
    }

    _detailCache[key] = result;
    return result;
  }

  Future<Map<String, dynamic>?> getEmergencyContact({dynamic id, String? cedula}) async {
    final token = AuthService().token;
    if (token == null) return null;
    final key = _cacheKey(id: id, cedula: cedula);
    if (_emergencyCache.containsKey(key)) return _emergencyCache[key];

    final ced = (cedula ?? '').trim();
    final List<String> urls = [
      if (id != null) '${AppConfig.baseUrl}/api/employees/$id/emergency-contact',
      if (id != null) '${AppConfig.baseUrl}/api/employee-contacts/emergency/$id',
      if (ced.isNotEmpty) '${AppConfig.baseUrl}/api/employees/cedula/$ced/emergency-contact',
      if (id != null) '${AppConfig.baseUrl}/api/employee-contacts?employeeId=$id',
      if (id != null) '${AppConfig.baseUrl}/api/employee-contacts/employee/$id',
      if (id != null) '${AppConfig.baseUrl}/api/employees/$id/contacts',
    ];

    Map<String, dynamic>? result;
    for (final url in urls) {
      try {
        final decoded = await _getJson(url, token);
        if (decoded is Map<String, dynamic>) {
          if (decoded['data'] is Map<String, dynamic>) {
            result = decoded['data'] as Map<String, dynamic>;
          } else if (decoded['data'] is List) {
            result = _pickEmergencyFromList((decoded['data'] as List).cast());
          } else if (decoded.containsKey('name') || decoded.containsKey('telefono') || decoded.containsKey('phone')) {
            result = decoded;
          }
        } else if (decoded is List) {
          result = _pickEmergencyFromList(decoded.cast());
        }
        if (result != null) break;
      } catch (_) {}
    }

    _emergencyCache[key] = result;
    return result;
  }

  Map<String, dynamic>? _pickEmergencyFromList(List<dynamic> items) {
    for (final raw in items) {
      if (raw is! Map) continue;
      final m = raw.cast<String, dynamic>();
      final type = (m['type'] ?? m['category'] ?? m['contactType'] ?? m['tipo'])?.toString().toUpperCase();
      final isEmergency = type == 'EMERGENCY' || type == 'EMERGENCIA' || (m['emergency'] == true);
      if (isEmergency) {
        return m;
      }
    }
    // Si ninguno marca EMERGENCY, devolvemos el primero que tenga nombre y teléfono
    for (final raw in items) {
      if (raw is! Map) continue;
      final m = raw.cast<String, dynamic>();
      final hasName = (m['name'] ?? m['nombre'] ?? m['fullName']) != null;
      final hasPhone = (m['phone'] ?? m['telefono'] ?? m['mobile']) != null;
      if (hasName && hasPhone) return m;
    }
    return null;
  }
}
