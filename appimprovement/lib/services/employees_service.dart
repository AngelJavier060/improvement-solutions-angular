import 'dart:convert';

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
        .timeout(const Duration(seconds: 12));
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

  List<Map<String, dynamic>> _extractList(dynamic decoded) {
    if (decoded is List) {
      return decoded.whereType<Map>().map((e) => e.cast<String, dynamic>()).toList();
    }
    if (decoded is Map<String, dynamic> && decoded['data'] is List) {
      return (decoded['data'] as List).whereType<Map>().map((e) => e.cast<String, dynamic>()).toList();
    }
    return <Map<String, dynamic>>[];
  }

  Future<List<Map<String, dynamic>>> _getListTrying(List<String> urls, String token) async {
    for (final url in urls) {
      try {
        final decoded = await _getJson(url, token);
        if (decoded == null) continue;
        final list = _extractList(decoded);
        if (list.isNotEmpty || decoded is List) return list;
      } catch (_) {}
    }
    return <Map<String, dynamic>>[];
  }

  /// ID de BusinessEmployee (como en Angular `getBusinessEmployeeIdFor`).
  static dynamic businessEmployeeIdOf(Map<String, dynamic> e) {
    return e['id'] ??
        e['businessEmployeeId'] ??
        e['business_employee_id'] ??
        e['businessId'] ??
        (e['employee'] is Map ? (e['employee'] as Map)['id'] : null);
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
      return _extractList(jsonDecode(response.body));
    }

    if (response.statusCode == 401) {
      throw Exception('No autorizado');
    }

    throw Exception('Error al obtener empleados (${response.statusCode})');
  }

  /// Documentos personales — mismo endpoint que Angular.
  Future<List<Map<String, dynamic>>> getEmployeeDocuments(dynamic businessEmployeeId) async {
    if (businessEmployeeId == null) return <Map<String, dynamic>>[];
    final token = AuthService().token;
    if (token == null) return <Map<String, dynamic>>[];

    return _getListTrying([
      '${AppConfig.baseUrl}/api/employee_document/by-business-employee/$businessEmployeeId?includeHistory=false',
      '${AppConfig.baseUrl}/api/employee-documents/employee/$businessEmployeeId',
    ], token);
  }

  /// Cursos — mismo endpoint que Angular.
  Future<List<Map<String, dynamic>>> getEmployeeCourses(dynamic businessEmployeeId) async {
    if (businessEmployeeId == null) return <Map<String, dynamic>>[];
    final token = AuthService().token;
    if (token == null) return <Map<String, dynamic>>[];

    return _getListTrying([
      '${AppConfig.baseUrl}/api/employee_course/by-business-employee/$businessEmployeeId?includeHistory=false',
      '${AppConfig.baseUrl}/api/employee-courses/employee/$businessEmployeeId',
    ], token);
  }

  /// Alias legacy usado por pantallas previas.
  Future<List<Map<String, dynamic>>> getEmployeeCertifications(dynamic employeeId) {
    return getEmployeeCourses(employeeId);
  }

  /// Tarjetas — mismo endpoint que Angular.
  Future<List<Map<String, dynamic>>> getEmployeeCards(dynamic businessEmployeeId) async {
    if (businessEmployeeId == null) return <Map<String, dynamic>>[];
    final token = AuthService().token;
    if (token == null) return <Map<String, dynamic>>[];

    return _getListTrying([
      '${AppConfig.baseUrl}/api/employee_card/by-business-employee/$businessEmployeeId?includeHistory=false',
    ], token);
  }

  Future<Map<String, dynamic>?> getEmployeeDetail({
    dynamic id,
    String? cedula,
    String? businessRuc,
  }) async {
    final token = AuthService().token;
    if (token == null) return null;
    final key = _cacheKey(id: id, cedula: cedula);
    if (_detailCache.containsKey(key)) return _detailCache[key];

    final ced = (cedula ?? '').trim();
    final ruc = (businessRuc ?? AuthService().getPrimaryBusinessRuc() ?? '').trim();

    final List<String> urls = [
      if (ruc.isNotEmpty && ced.isNotEmpty)
        '${AppConfig.baseUrl}/api/business-employees/company/${Uri.encodeComponent(ruc)}/cedula/${Uri.encodeComponent(ced)}',
      if (ced.isNotEmpty) '${AppConfig.baseUrl}/api/business-employees/cedula/${Uri.encodeComponent(ced)}',
      if (id != null) '${AppConfig.baseUrl}/api/business-employees/$id',
      if (id != null) '${AppConfig.baseUrl}/api/employees/$id',
      if (ced.isNotEmpty) '${AppConfig.baseUrl}/api/employees/cedula/${Uri.encodeComponent(ced)}',
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
          } else if (decoded.containsKey('name') ||
              decoded.containsKey('telefono') ||
              decoded.containsKey('phone')) {
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
      if (isEmergency) return m;
    }
    for (final raw in items) {
      if (raw is! Map) continue;
      final m = raw.cast<String, dynamic>();
      final hasName = (m['name'] ?? m['nombre'] ?? m['fullName']) != null;
      final hasPhone = (m['phone'] ?? m['telefono'] ?? m['mobile']) != null;
      if (hasName && hasPhone) return m;
    }
    return null;
  }

  /// Construye URL absoluta de archivo (PDF) como en Angular `normalizeFileUrl`.
  static String? fileAbsoluteUrl(dynamic fileField) {
    if (fileField == null) return null;
    var rel = fileField.toString().replaceAll('\\', '/').trim();
    if (rel.isEmpty) return null;
    rel = rel.replaceAll('/api/files/download/', '/api/files/');
    if (rel.startsWith('http://') || rel.startsWith('https://')) return rel;
    if (rel.startsWith('/api/')) return '${AppConfig.baseUrl}$rel';
    if (rel.startsWith('api/')) return '${AppConfig.baseUrl}/$rel';
    while (rel.startsWith('/')) {
      rel = rel.substring(1);
    }
    if (rel.startsWith('uploads/')) rel = rel.substring('uploads/'.length);
    final encoded = rel.split('/').map(Uri.encodeComponent).join('/');
    return '${AppConfig.baseUrl}/api/files/$encoded';
  }

  static bool isPdfFile(Map<String, dynamic>? file) {
    if (file == null) return false;
    final type = (file['file_type'] ?? file['fileType'] ?? '').toString().toLowerCase();
    final name = (file['file_name'] ?? file['fileName'] ?? file['name'] ?? '').toString().toLowerCase();
    final path = (file['file'] ?? '').toString().toLowerCase();
    return type.contains('pdf') || name.endsWith('.pdf') || path.endsWith('.pdf');
  }

  static Map<String, dynamic>? firstPdfFile(Map<String, dynamic> item) {
    final files = item['files'];
    if (files is! List || files.isEmpty) return null;
    for (final raw in files) {
      if (raw is! Map) continue;
      final m = raw.cast<String, dynamic>();
      if (isPdfFile(m)) return m;
    }
    final first = files.first;
    if (first is Map) return first.cast<String, dynamic>();
    return null;
  }
}
