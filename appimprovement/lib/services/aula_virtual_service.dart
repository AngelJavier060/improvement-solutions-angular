import 'dart:convert';
import 'dart:typed_data';

import 'package:http/http.dart' as http;

import '../config/app_config.dart';
import 'auth_service.dart';

class AulaVirtualService {
  static final AulaVirtualService _instance = AulaVirtualService._internal();
  factory AulaVirtualService() => _instance;
  AulaVirtualService._internal();

  Map<String, String> get _headers {
    final token = AuthService().token;
    return {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      if (token != null && token.isNotEmpty) 'Authorization': 'Bearer $token',
    };
  }

  Future<List<Map<String, dynamic>>> misCursos() {
    return _list('/api/aula/my');
  }

  Future<Uint8List> video(int businessId, int cursoId) {
    return _bytes('/api/aula/business/$businessId/$cursoId/video');
  }

  Future<Uint8List> material(int businessId, int cursoId) {
    return _bytes('/api/aula/business/$businessId/$cursoId/material');
  }

  Future<void> ingreso(int cursoId) => _post('/api/aula/my/$cursoId/ingreso', {});

  Future<void> videoVisto(int cursoId) => _post('/api/aula/my/$cursoId/video-visto', {});

  Future<List<Map<String, dynamic>>> iniciarEvaluacion(int cursoId) async {
    final data = await _postMap('/api/aula/my/$cursoId/evaluacion/iniciar', {});
    final raw = data['preguntas'];
    if (raw is! List) return const [];
    return raw.whereType<Map>().map((e) => e.cast<String, dynamic>()).toList();
  }

  Future<Map<String, dynamic>> responder(int cursoId, List<int?> respuestas) {
    final marcas = respuestas.map((marca) => marca ?? -1).toList();
    return _postMap('/api/aula/my/$cursoId/evaluacion', {'respuestas': marcas}, reintentar: true);
  }

  Future<List<Map<String, dynamic>>> _list(String path) async {
    final res = await http.get(Uri.parse('${AppConfig.baseUrl}$path'), headers: _headers);
    if (res.statusCode == 200) {
      final body = jsonDecode(res.body);
      if (body is List) {
        return body.whereType<Map>().map((e) => e.cast<String, dynamic>()).toList();
      }
      return const [];
    }
    throw Exception(_message(res));
  }

  Future<Map<String, dynamic>> _postMap(String path, Map<String, dynamic> body, {bool reintentar = false}) async {
    var res = await _send(path, body);
    if (reintentar && (res.statusCode == 502 || res.statusCode == 503 || res.statusCode == 504)) {
      await Future<void>.delayed(const Duration(seconds: 2));
      res = await _send(path, body);
    }
    if (res.statusCode >= 200 && res.statusCode < 300) {
      if (res.body.isEmpty) return {};
      final decoded = jsonDecode(res.body);
      if (decoded is Map<String, dynamic>) return decoded;
      if (decoded is Map) return decoded.cast<String, dynamic>();
      return {};
    }
    throw Exception(_message(res));
  }

  Future<void> _post(String path, Map<String, dynamic> body) async {
    final res = await _send(path, body);
    if (res.statusCode >= 200 && res.statusCode < 300) return;
    throw Exception(_message(res));
  }

  Future<http.Response> _send(String path, Map<String, dynamic> body) {
    return http.post(
      Uri.parse('${AppConfig.baseUrl}$path'),
      headers: _headers,
      body: jsonEncode(body),
    );
  }

  Future<Uint8List> _bytes(String path) async {
    final client = http.Client();
    try {
      final request = http.Request('GET', Uri.parse('${AppConfig.baseUrl}$path'));
      request.headers.addAll(_headers);
      final response = await client.send(request);
      final bytes = await response.stream.toBytes();
      if (response.statusCode >= 200 && response.statusCode < 300) return bytes;
      throw Exception(_message(http.Response.bytes(bytes, response.statusCode)));
    } finally {
      client.close();
    }
  }

  String _message(http.Response res) {
    try {
      final body = jsonDecode(res.body);
      if (body is Map && body['message'] != null) return body['message'].toString();
    } catch (_) {}
    if (res.statusCode == 401) return 'Sesión expirada. Vuelve a iniciar sesión';
    if (res.statusCode == 502 || res.statusCode == 503 || res.statusCode == 504) {
      return 'El servidor no alcanzó a guardar las respuestas. Pulse enviar otra vez.';
    }
    return 'No se pudo completar la solicitud (${res.statusCode})';
  }
}
