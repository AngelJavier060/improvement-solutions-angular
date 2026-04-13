import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;

import '../config/app_config.dart';

String? _parseApiErrorMessage(String body) {
  try {
    final dynamic j = jsonDecode(body);
    if (j is Map<String, dynamic>) {
      final m = j['message'];
      if (m != null && m.toString().trim().isNotEmpty) {
        return m.toString();
      }
    }
  } catch (_) {}
  return null;
}

class AuthService {
  static final AuthService _instance = AuthService._internal();
  factory AuthService() => _instance;
  AuthService._internal();

  String? _token;
  Map<String, dynamic>? _userDetail;
  String? _refreshToken;

  String? get token => _token;
  Map<String, dynamic>? get userDetail => _userDetail;
  String? get refreshToken => _refreshToken;

  Future<void> logout() async {
    _token = null;
    _userDetail = null;
    _refreshToken = null;
  }

  Future<Map<String, dynamic>> login({required String username, required String password}) async {
    final String url = '${AppConfig.baseUrl}/api/auth/login';
    final user = username.trim();

    // Detectar si es email o username, como en Angular
    final bool isEmail = RegExp(r'^[\w\.-]+@([\w-]+\.)+[\w-]{2,4}$').hasMatch(user);
    final Map<String, String> body = isEmail
        ? {'email': user, 'password': password}
        : {'username': user, 'password': password};

    final response = await http.post(
      Uri.parse(url),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: jsonEncode(body),
    );

    if (kDebugMode && response.statusCode != 200) {
      debugPrint('[Auth] POST $url → ${response.statusCode}');
    }

    if (response.statusCode == 200) {
      final Map<String, dynamic> data = jsonDecode(response.body) as Map<String, dynamic>;
      // El backend puede envolver en { data, message, success } o devolver directo.
      final Map<String, dynamic> root = data;
      final Map<String, dynamic> payload = root.containsKey('token') || root.containsKey('accessToken') || root.containsKey('access_token')
          ? root
          : (root['data'] as Map<String, dynamic>? ?? {});

      String? _pickStr(Map<String, dynamic> m, List<String> keys) {
        for (final k in keys) {
          if (m.containsKey(k) && m[k] != null && m[k].toString().isNotEmpty) {
            return m[k].toString();
          }
        }
        return null;
      }

      if (payload.isEmpty) {
        throw Exception('Respuesta de login inesperada');
      }

      _token = _pickStr(payload, ['token', 'accessToken', 'access_token']);
      if (_token == null || _token!.isEmpty) {
        throw Exception('Token de acceso no presente en la respuesta');
      }

      // userDetail puede venir en diferentes claves
      _userDetail = (payload['userDetail'] as Map?)?.cast<String, dynamic>()
          ?? (payload['user'] as Map?)?.cast<String, dynamic>();

      // refreshToken con tolerancia a diferentes nombres/ubicaciones
      _refreshToken = _pickStr(payload, ['refreshToken', 'refresh_token', 'refresh'])
          ?? _pickStr(root, ['refreshToken', 'refresh_token', 'refresh'])
          ?? (_pickStr(payload['tokens'] is Map<String, dynamic> ? payload['tokens'] as Map<String, dynamic> : {}, ['refreshToken', 'refresh_token']));

      return payload;
    }

    final serverMsg = _parseApiErrorMessage(response.body);

    if (response.statusCode == 404) {
      throw Exception(
        serverMsg ??
            'Usuario no encontrado en este servidor. Compruebe el usuario o que la app apunte al entorno correcto: en depuración suele usarse el backend local (emulador), no producción.',
      );
    }
    if (response.statusCode == 401) {
      throw Exception(serverMsg ?? 'Usuario o contraseña incorrectos');
    }
    if (response.statusCode == 403) {
      throw Exception(serverMsg ?? 'Usuario inactivo o sin permisos');
    }
    if (response.statusCode == 400) {
      throw Exception(serverMsg ?? 'Datos de acceso no válidos');
    }

    throw Exception(serverMsg ?? 'Error al autenticar (${response.statusCode})');
  }

  Future<Map<String, dynamic>> refreshLogin({required String refreshToken}) async {
    final String url = '${AppConfig.baseUrl}/api/auth/refresh';
    final response = await http.post(
      Uri.parse(url),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: jsonEncode({'refreshToken': refreshToken}),
    );

    if (response.statusCode == 200) {
      final Map<String, dynamic> data = jsonDecode(response.body) as Map<String, dynamic>;
      final Map<String, dynamic> root = data;
      final Map<String, dynamic> payload = root.containsKey('token') || root.containsKey('accessToken') || root.containsKey('access_token')
          ? root
          : (root['data'] as Map<String, dynamic>? ?? {});

      String? _pickStr(Map<String, dynamic> m, List<String> keys) {
        for (final k in keys) {
          if (m.containsKey(k) && m[k] != null && m[k].toString().isNotEmpty) {
            return m[k].toString();
          }
        }
        return null;
      }

      if (payload.isEmpty) {
        throw Exception('Respuesta de refresh inesperada');
      }
      _token = _pickStr(payload, ['token', 'accessToken', 'access_token']);
      if (_token == null || _token!.isEmpty) {
        throw Exception('Token de acceso faltante en refresh');
      }
      _userDetail = (payload['userDetail'] as Map?)?.cast<String, dynamic>()
          ?? (payload['user'] as Map?)?.cast<String, dynamic>();
      _refreshToken = _pickStr(payload, ['refreshToken', 'refresh_token', 'refresh'])
          ?? _pickStr(root, ['refreshToken', 'refresh_token', 'refresh'])
          ?? refreshToken;
      return payload;
    }

    if (response.statusCode == 401) {
      throw Exception(_parseApiErrorMessage(response.body) ?? 'Refresh token inválido o expirado');
    }
    throw Exception(_parseApiErrorMessage(response.body) ?? 'Error al refrescar token (${response.statusCode})');
  }

  String? getPrimaryBusinessName() {
    final businesses = _userDetail != null ? _userDetail!['businesses'] as List<dynamic>? : null;
    if (businesses != null && businesses.isNotEmpty) {
      final first = businesses.first as Map<String, dynamic>;
      return (first['name'] as String?) ?? (first['ruc'] as String?);
    }
    return null;
  }

  String? getPrimaryBusinessRuc() {
    final businesses = _userDetail != null ? _userDetail!['businesses'] as List<dynamic>? : null;
    if (businesses != null && businesses.isNotEmpty) {
      final first = businesses.first as Map<String, dynamic>;
      return first['ruc'] as String?;
    }
    return null;
  }

  String? getPrimaryBusinessLogoPath() {
    final businesses = _userDetail != null ? _userDetail!['businesses'] as List<dynamic>? : null;
    if (businesses != null && businesses.isNotEmpty) {
      final first = businesses.first as Map<String, dynamic>;
      final logo = first['logo'] ?? first['logoPath'] ?? first['logo_url'] ?? first['logoUrl'];
      if (logo == null) return null;
      return logo.toString();
    }
    return null;
  }
}
