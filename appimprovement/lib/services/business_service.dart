import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config/app_config.dart';
import 'auth_service.dart';

class BusinessService {
  final AuthService _auth = AuthService();

  /// `id` de la primera empresa en `userDetail` del login (el backend envía `BusinessInfoDto.id`).
  int? getPrimaryBusinessIdFromSession() {
    final businesses = _auth.userDetail?['businesses'] as List<dynamic>?;
    if (businesses == null || businesses.isEmpty) return null;
    final first = businesses.first;
    if (first is! Map) return null;
    final id = first['id'];
    if (id is int) return id;
    if (id is num) return id.toInt();
    return int.tryParse(id?.toString() ?? '');
  }

  /// Resuelve el ID numérico de la empresa del usuario: primero sesión, luego `GET .../public/ruc/{ruc}`.
  Future<int?> resolvePrimaryBusinessId() async {
    final fromSession = getPrimaryBusinessIdFromSession();
    if (fromSession != null) return fromSession;

    final ruc = _auth.getPrimaryBusinessRuc()?.trim();
    if (ruc == null || ruc.isEmpty) return null;

    final biz = await getByRuc(ruc);
    final idRaw = biz?['id'];
    if (idRaw is int) return idRaw;
    if (idRaw is num) return idRaw.toInt();
    return int.tryParse(idRaw?.toString() ?? '');
  }

  Future<Map<String, dynamic>?> getByRuc(String ruc) async {
    final clean = ruc.trim();
    if (clean.isEmpty) return null;
    final segment = Uri.encodeComponent(clean);
    final uri = Uri.parse('${AppConfig.baseUrl}/api/businesses/public/ruc/$segment');
    final resp = await http.get(uri, headers: {
      'Accept': 'application/json',
      if (_auth.token != null) 'Authorization': 'Bearer ${_auth.token}',
    });
    if (resp.statusCode != 200) return null;
    final decoded = jsonDecode(resp.body);
    if (decoded is Map<String, dynamic>) return decoded;
    return null;
  }

  Future<Map<String, dynamic>?> getDetailsByRuc(String ruc) async {
    final basic = await getByRuc(ruc);
    if (basic == null) return null;
    final id = basic['id']?.toString();
    if (id == null || id.isEmpty) return null;

    final uri = Uri.parse('${AppConfig.baseUrl}/api/businesses/$id/details');
    final headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      if (_auth.token != null) 'Authorization': 'Bearer ${_auth.token}',
    };
    final resp = await http.get(uri, headers: headers);
    if (resp.statusCode != 200) return null;
    final decoded = jsonDecode(resp.body);
    if (decoded is Map<String, dynamic>) return decoded;
    return null;
  }

  Future<Map<String, dynamic>?> getDetailsById(String id) async {
    if (id.isEmpty) return null;
    final uri = Uri.parse('${AppConfig.baseUrl}/api/businesses/$id/details');
    final headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      if (_auth.token != null) 'Authorization': 'Bearer ${_auth.token}',
    };
    final resp = await http.get(uri, headers: headers);
    if (resp.statusCode != 200) return null;
    final decoded = jsonDecode(resp.body);
    if (decoded is Map<String, dynamic>) return decoded;
    return null;
  }
}
