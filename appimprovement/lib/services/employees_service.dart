import 'dart:convert';

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
}
