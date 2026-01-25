import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config/app_config.dart';
import 'auth_service.dart';

class LegalService {
  Future<List<Map<String, dynamic>>> getLegalSummaryByRuc(String ruc) async {
    print('🔍 getLegalSummaryByRuc called with RUC: $ruc');
    final token = AuthService().token;
    print('🔑 Token available: ${token != null}');
    if (token == null) {
      print('❌ No token available for authentication');
      return [];
    }

    final businessResp = await http.get(
      Uri.parse('${AppConfig.baseUrl}/api/businesses/public/ruc/$ruc'),
      headers: {
        'Authorization': 'Bearer $token',
        'Accept': 'application/json',
      },
    );
    print('📡 Business lookup status: ${businessResp.statusCode}');
    if (businessResp.statusCode != 200) {
      print('❌ Business lookup failed with status ${businessResp.statusCode}');
      print('Response body: ${businessResp.body}');
      return [];
    }
    final business = jsonDecode(businessResp.body);
    print('🏢 Business response: $business');
    final businessId = (business is Map<String, dynamic>) ? business['id'] : null;
    print('🆔 Business ID: $businessId');
    if (businessId == null) {
      print('❌ Business ID is null');
      return [];
    }

    final obligationsUrl = '${AppConfig.baseUrl}/api/obligation-matrices/business/$businessId?_=${DateTime.now().millisecondsSinceEpoch}';
    print('📡 Fetching obligations from: $obligationsUrl');
    final obligationsResp = await http.get(
      Uri.parse(obligationsUrl),
      headers: {
        'Authorization': 'Bearer $token',
        'Accept': 'application/json',
      },
    );
    print('📡 Obligations response status: ${obligationsResp.statusCode}');
    print('📡 Obligations response body: ${obligationsResp.body}');
    if (obligationsResp.statusCode != 200) {
      print('❌ Obligations fetch failed with status ${obligationsResp.statusCode}');
      return [];
    }
    final List<dynamic> list = jsonDecode(obligationsResp.body) as List<dynamic>;
    print('📋 Found ${list.length} obligations');

    final List<Map<String, dynamic>> summary = [];
    for (final it in list) {
      if (it is! Map<String, dynamic>) continue;
      print('📄 Processing obligation: ${it['name'] ?? it['obligation_matrix_id'] ?? 'unknown'}');
      final displayName = _resolveObligationName(it);
      print('   Display name: $displayName');
      final matrixId = it['id'];
      if (matrixId == null) {
        print('   ⚠️ Matrix ID is null, adding without files');
        summary.add({
          'name': displayName,
          'pdfs': <Map<String, dynamic>>[],
          'startDate': it['startDate'] ?? it['createdAt'],
          'dueDate': it['dueDate'],
          'createdAt': it['createdAt'],
          'completed': it['completed'] ?? false,
          'priority': it['priority'],
        });
        continue;
      }
      final files = await _listFilesForMatrix(matrixId, token);
      print('   📎 Found ${files.length} files for matrix $matrixId');
      final pdfs = files.where((f) {
        final name = (f['name'] ?? f['path'] ?? '').toString().toLowerCase();
        return name.endsWith('.pdf');
      }).toList();
      print('   📑 Filtered to ${pdfs.length} PDFs');
      final mapped = <Map<String, dynamic>>[];
      for (final f in pdfs.take(3)) {
        final id = f['id'];
        final name = (f['name'] ?? f['path'] ?? 'PDF').toString();
        final downloadUrl = (id != null)
            ? '${AppConfig.baseUrl}/api/obligation-matrices/files/$id/download'
            : null;
        mapped.add({'id': id, 'name': name, 'downloadUrl': downloadUrl});
      }
      summary.add({
        'id': matrixId,
        'name': displayName,
        'pdfs': mapped,
        'startDate': it['startDate'] ?? it['createdAt'],
        'dueDate': it['dueDate'],
        'createdAt': it['createdAt'],
        'completed': it['completed'] ?? false,
        'priority': it['priority'],
        'status': it['status'],
      });
    }
    print('✅ Returning ${summary.length} legal items');
    return summary;
  }

  String _resolveObligationName(Map<String, dynamic> item) {
    print('   Resolving name for item: ${item.keys.toList()}');
    final direct = (item['name'] ?? item['nombre'] ?? item['title'] ?? item['description'] ?? '').toString().trim();
    print('   Direct name: $direct');
    if (direct.isNotEmpty) return direct;
    final matrix = item['obligationMatrix'] ?? item['obligation_matrix'];
    print('   Matrix object: $matrix');
    if (matrix is Map) {
      final nested = (matrix['name'] ?? matrix['nombre'] ?? matrix['title'] ?? matrix['description'] ?? '').toString().trim();
      print('   Nested name: $nested');
      if (nested.isNotEmpty) return nested;
    }
    final catalogId = item['obligation_matrix_id'] ?? item['obligationMatrixId'] ?? (item['obligationMatrix'] is Map ? (item['obligationMatrix']['id']) : null);
    print('   Catalog ID: $catalogId');
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

  Future<Map<String, dynamic>?> getComplianceSummaryByRuc(String ruc) async {
    final token = AuthService().token;
    if (token == null) return null;
    final businessResp = await http.get(
      Uri.parse('${AppConfig.baseUrl}/api/businesses/public/ruc/$ruc'),
      headers: {
        'Authorization': 'Bearer $token',
        'Accept': 'application/json',
      },
    );
    if (businessResp.statusCode != 200) return null;
    final business = jsonDecode(businessResp.body);
    final businessId = (business is Map<String, dynamic>) ? business['id'] : null;
    if (businessId == null) return null;
    final url = '${AppConfig.baseUrl}/api/obligation-matrices/business/$businessId/compliance-summary?_=${DateTime.now().millisecondsSinceEpoch}';
    final resp = await http.get(
      Uri.parse(url),
      headers: {
        'Authorization': 'Bearer $token',
        'Accept': 'application/json',
      },
    );
    if (resp.statusCode != 200) return null;
    final data = jsonDecode(resp.body);
    if (data is Map<String, dynamic>) return data;
    return null;
  }
}
