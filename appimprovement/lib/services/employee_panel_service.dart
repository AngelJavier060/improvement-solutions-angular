import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config/app_config.dart';
import 'auth_service.dart';

class EmployeePanelService {
  static final EmployeePanelService _instance = EmployeePanelService._internal();
  factory EmployeePanelService() => _instance;
  EmployeePanelService._internal();

  Map<String, String> get _headers {
    final token = AuthService().token;
    return {
      'Accept': 'application/json',
      if (token != null && token.isNotEmpty) 'Authorization': 'Bearer $token',
    };
  }

  Future<Map<String, dynamic>> getMyDashboard() => _getMap('/api/employee-panel/my-dashboard');

  Future<Map<String, dynamic>> getMyProfile() => _getMap('/api/employee-panel/my-profile');

  Future<List<Map<String, dynamic>>> getMyDocuments() => _getList('/api/employee-panel/my-documents');

  Future<List<Map<String, dynamic>>> getMyCourses() => _getList('/api/employee-panel/my-courses');

  Future<List<Map<String, dynamic>>> getMyCards() => _getList('/api/employee-panel/my-cards');

  Future<Map<String, dynamic>> _getMap(String path) async {
    final res = await http.get(Uri.parse('${AppConfig.baseUrl}$path'), headers: _headers);
    if (res.statusCode == 200) {
      final body = jsonDecode(res.body);
      if (body is Map<String, dynamic>) return body;
      throw Exception('Respuesta inesperada del servidor');
    }
    throw Exception(_errorMessage(res));
  }

  Future<List<Map<String, dynamic>>> _getList(String path) async {
    final res = await http.get(Uri.parse('${AppConfig.baseUrl}$path'), headers: _headers);
    if (res.statusCode == 200) {
      final body = jsonDecode(res.body);
      if (body is List) {
        return body
            .whereType<Map>()
            .map((e) => e.cast<String, dynamic>())
            .toList();
      }
      return const [];
    }
    throw Exception(_errorMessage(res));
  }

  String resolveImageUrl(String? path) {
    if (path == null || path.trim().isEmpty) return '';
    final p = path.trim();
    if (p.startsWith('http://') || p.startsWith('https://')) return p;
    var rel = p.replaceFirst(RegExp(r'^/+'), '');
    if (rel.startsWith('api/files/')) {
      return '${AppConfig.baseUrl}/$rel';
    }
    if (rel.startsWith('uploads/')) {
      rel = rel.substring('uploads/'.length);
    }
    if (!rel.startsWith('profiles/') && !rel.contains('/')) {
      rel = 'profiles/$rel';
    }
    return '${AppConfig.baseUrl}/api/files/$rel';
  }

  String _errorMessage(http.Response res) {
    try {
      final j = jsonDecode(res.body);
      if (j is Map && j['message'] != null) return j['message'].toString();
    } catch (_) {}
    if (res.statusCode == 403) {
      return 'Trabajador inactivo o sin acceso al portal';
    }
    if (res.statusCode == 401) {
      return 'Sesión expirada. Vuelve a iniciar sesión';
    }
    return 'Error del servidor (${res.statusCode})';
  }
}
