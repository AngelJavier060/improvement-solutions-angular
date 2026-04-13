import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config/app_config.dart';
import '../models/safety_indices_summary.dart';
import 'auth_service.dart';

/// Índices IF, TRIF, IG, TR — misma API que el frontend Angular (`AttendanceService.getSafetyIndices`).
class SafetyIndicesService {
  final AuthService _auth = AuthService();

  Map<String, String> get _headers => {
        'Accept': 'application/json',
        if (_auth.token != null) 'Authorization': 'Bearer ${_auth.token}',
      };

  Future<SafetyIndicesSummary?> getSafetyIndices(int businessId, int year) async {
    final uri = Uri.parse('${AppConfig.baseUrl}/api/attendance/$businessId/safety-indices').replace(
      queryParameters: {'year': '$year'},
    );
    final resp = await http.get(uri, headers: _headers);
    if (resp.statusCode != 200) return null;
    final decoded = jsonDecode(resp.body);
    if (decoded is! Map<String, dynamic>) return null;
    try {
      return SafetyIndicesSummary.fromJson(decoded);
    } catch (_) {
      return null;
    }
  }

  /// Misma fuente que el dashboard Angular para total trabajadores activos.
  Future<int?> getActiveEmployeesYtd(int businessId, int year) async {
    final uri = Uri.parse('${AppConfig.baseUrl}/api/attendance/$businessId/consolidado-hhtt').replace(
      queryParameters: {'year': '$year', 'standardHoursPerDay': '8'},
    );
    final resp = await http.get(uri, headers: _headers);
    if (resp.statusCode != 200) return null;
    final decoded = jsonDecode(resp.body);
    if (decoded is Map<String, dynamic>) {
      return _toInt(decoded['activeEmployees']);
    }
    return null;
  }
}

int _toInt(dynamic v) {
  if (v == null) return 0;
  if (v is int) return v;
  if (v is num) return v.toInt();
  return int.tryParse(v.toString()) ?? 0;
}
