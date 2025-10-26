import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config/app_config.dart';
import 'auth_service.dart';

class LegalService {
  Future<List<Map<String, dynamic>>> getLegalSummaryByRuc(String ruc) async {
    // 1) Resolver empresa por RUC (endpoint público)
    final businessResp = await http.get(
      Uri.parse('${AppConfig.baseUrl}/api/businesses/public/ruc/$ruc'),
      headers: {
        'Accept': 'application/json',
      },
    );
    if (businessResp.statusCode != 200) {
      return [];
    }
    final business = jsonDecode(businessResp.body);
    final businessId = (business is Map<String, dynamic>) ? business['id'] : null;
    if (businessId == null) return [];

    // 2) Obtener relaciones de matriz legal por empresa (requiere token)
    final token = AuthService().token;
    if (token == null) return [];
    final obligationsResp = await http.get(
      Uri.parse('${AppConfig.baseUrl}/api/obligation-matrices/business/$businessId?_=${DateTime.now().millisecondsSinceEpoch}'),
      headers: {
        'Authorization': 'Bearer $token',
        'Accept': 'application/json',
      },
    );
    if (obligationsResp.statusCode != 200) {
      return [];
    }
    final List<dynamic> list = jsonDecode(obligationsResp.body) as List<dynamic>;

    // 3) Para cada obligación, cargar archivos y filtrar PDFs (máximo 3 por item para no saturar)
    final List<Map<String, dynamic>> summary = [];
    for (final it in list) {
      if (it is! Map<String, dynamic>) continue;
      final displayName = _resolveObligationName(it);
      final matrixId = it['id'];
      if (matrixId == null) {
        summary.add({'name': displayName, 'pdfs': <Map<String, dynamic>>[]});
        continue;
      }
      final files = await _listFilesForMatrix(matrixId, token);
      final pdfs = files.where((f) {
        final name = (f['name'] ?? f['path'] ?? '').toString().toLowerCase();
        return name.endsWith('.pdf');
      }).toList();
      // Crear modelo simple con hasta 3 PDFs
      final mapped = <Map<String, dynamic>>[];
      for (final f in pdfs.take(3)) {
        final id = f['id'];
        final name = (f['name'] ?? f['path'] ?? 'PDF').toString();
        final downloadUrl = (id != null)
            ? '${AppConfig.baseUrl}/api/obligation-matrices/files/$id/download'
            : null;
        mapped.add({'id': id, 'name': name, 'downloadUrl': downloadUrl});
      }
      summary.add({'name': displayName, 'pdfs': mapped});
    }
    return summary;
  }

  String _resolveObligationName(Map<String, dynamic> item) {
    final direct = (item['name'] ?? item['nombre'] ?? item['title'] ?? item['description'] ?? '').toString().trim();
    if (direct.isNotEmpty) return direct;
    final matrix = item['obligationMatrix'] ?? item['obligation_matrix'];
    if (matrix is Map) {
      final nested = (matrix['name'] ?? matrix['nombre'] ?? matrix['title'] ?? matrix['description'] ?? '').toString().trim();
      if (nested.isNotEmpty) return nested;
    }
    final catalogId = item['obligation_matrix_id'] ?? item['obligationMatrixId'] ?? (item['obligationMatrix'] is Map ? (item['obligationMatrix']['id']) : null);
    return catalogId != null ? '#$catalogId' : 'Requisito legal';
  }

  Future<List<Map<String, dynamic>>> _listFilesForMatrix(int matrixId, String token) async {
    final resp = await http.get(
      Uri.parse('${AppConfig.baseUrl}/api/obligation-matrices/$matrixId/files'),
      headers: {
        'Authorization': 'Bearer $token',
        'Accept': 'application/json',
      },
    );
    if (resp.statusCode != 200) return [];
    final decoded = jsonDecode(resp.body);
    if (decoded is List) {
      return decoded.cast<Map<String, dynamic>>();
    }
    return [];
  }
}
