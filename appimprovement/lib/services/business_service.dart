import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config/app_config.dart';

class BusinessService {
  Future<Map<String, dynamic>?> getByRuc(String ruc) async {
    final uri = Uri.parse('${AppConfig.baseUrl}/api/businesses/public/ruc/$ruc');
    final resp = await http.get(uri, headers: {
      'Accept': 'application/json',
    });
    if (resp.statusCode != 200) return null;
    final decoded = jsonDecode(resp.body);
    if (decoded is Map<String, dynamic>) return decoded;
    return null;
  }
}
