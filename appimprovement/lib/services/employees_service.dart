import 'dart:convert';
import 'package:flutter/foundation.dart';

import 'package:http/http.dart' as http;

import '../config/app_config.dart';
import 'auth_service.dart';

class EmployeesService {
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
    final List<String> urls = [
      if (id != null) '${AppConfig.baseUrl}/api/employees/$id',
      if (id != null) '${AppConfig.baseUrl}/api/employees/$id/detail',
      if (id != null) '${AppConfig.baseUrl}/api/employees/$id/details',
      if (id != null) '${AppConfig.baseUrl}/api/business-employees/$id',
      if (id != null) '${AppConfig.baseUrl}/api/business-employees/$id/detail',
      if (id != null) '${AppConfig.baseUrl}/api/business-employees/$id/details',
      if (cedula != null) '${AppConfig.baseUrl}/api/employees/cedula/$cedula',
      if (cedula != null) '${AppConfig.baseUrl}/api/employees/cedula/$cedula/detail',
      if (cedula != null) '${AppConfig.baseUrl}/api/business-employees/cedula/$cedula',
      if (cedula != null) '${AppConfig.baseUrl}/api/business-employees/cedula/$cedula/detail',
    ];
    for (final url in urls) {
      try {
        final resp = await http.get(
          Uri.parse(url),
          headers: {
            'Authorization': 'Bearer ${AuthService().token}',
            'Accept': 'application/json',
          },
        );
        if (resp.statusCode == 200) {
          final decoded = jsonDecode(resp.body);
          if (decoded is Map<String, dynamic>) {
            if (decoded.containsKey('data') && decoded['data'] is Map<String, dynamic>) {
              return decoded['data'] as Map<String, dynamic>;
            }
            return decoded;
          }
        }
      } catch (_) {}
    }
    return null;
  }

  Future<Map<String, dynamic>?> getEmergencyContact({dynamic id, String? cedula}) async {
    final token = AuthService().token;
    if (token == null) return null;
    final List<String> urls = [
      if (id != null) '${AppConfig.baseUrl}/api/employees/$id/emergency-contact',
      if (id != null) '${AppConfig.baseUrl}/api/employee-contacts/emergency/$id',
      if (id != null) '${AppConfig.baseUrl}/api/employees/$id/contacts',
      if (id != null) '${AppConfig.baseUrl}/api/employee-contacts/employee/$id',
      if (id != null) '${AppConfig.baseUrl}/api/employee-contacts?employeeId=$id',
      if (cedula != null) '${AppConfig.baseUrl}/api/employees/cedula/$cedula/emergency-contact',
    ];
    for (final url in urls) {
      try {
        final resp = await http.get(
          Uri.parse(url),
          headers: {
            'Authorization': 'Bearer ${AuthService().token}',
            'Accept': 'application/json',
          },
        );
        if (resp.statusCode == 200) {
          final decoded = jsonDecode(resp.body);
          if (decoded is Map<String, dynamic>) {
            if (decoded['data'] is Map<String, dynamic>) {
              final res = decoded['data'] as Map<String, dynamic>;
              if (kDebugMode) debugPrint('✅ emergency-contact from $url (data map)');
              return res;
            }
            if (decoded['data'] is List) {
              final picked = _pickEmergencyFromList((decoded['data'] as List).cast());
              if (picked != null) {
                if (kDebugMode) debugPrint('✅ emergency-contact from $url (data list)');
                return picked;
              }
            }
            // Algunas APIs devuelven el contacto directo en el root
            if (decoded.containsKey('name') || decoded.containsKey('telefono') || decoded.containsKey('phone')) {
              if (kDebugMode) debugPrint('✅ emergency-contact from $url (root map)');
              return decoded;
            }
          }
          if (decoded is List) {
            final picked = _pickEmergencyFromList(decoded.cast());
            if (picked != null) {
              if (kDebugMode) debugPrint('✅ emergency-contact from $url (root list)');
              return picked;
            }
          }
        }
      } catch (_) {}
    }
    return null;
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
