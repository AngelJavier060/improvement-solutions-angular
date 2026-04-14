import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config/app_config.dart';
import 'auth_service.dart';

class LegalService {
  Future<List<Map<String, dynamic>>> getLegalSummaryByRuc(String ruc) async {
    final token = AuthService().token;
    if (token == null) return [];

    final rucEnc = Uri.encodeComponent(ruc.trim());
    final businessResp = await http.get(
      Uri.parse('${AppConfig.baseUrl}/api/businesses/public/ruc/$rucEnc'),
      headers: {
        'Authorization': 'Bearer $token',
        'Accept': 'application/json',
      },
    );
    if (businessResp.statusCode != 200) return [];
    final business = jsonDecode(businessResp.body);
    final businessId = (business is Map<String, dynamic>) ? business['id'] : null;
    if (businessId == null) return [];

    final obligationsUrl =
        '${AppConfig.baseUrl}/api/obligation-matrices/business/$businessId?_=${DateTime.now().millisecondsSinceEpoch}';
    final obligationsResp = await http.get(
      Uri.parse(obligationsUrl),
      headers: {
        'Authorization': 'Bearer $token',
        'Accept': 'application/json',
      },
    );
    if (obligationsResp.statusCode != 200) return [];
    final List<dynamic> list = jsonDecode(obligationsResp.body) as List<dynamic>;

    // Antes: un await por obligación (muy lento en móvil). Ahora: todas las peticiones de archivos en paralelo.
    final rows = list.whereType<Map<String, dynamic>>().toList();
    final entries = await Future.wait(rows.map((it) => _summaryEntryForObligation(it, token)));
    return entries;
  }

  Future<Map<String, dynamic>> _summaryEntryForObligation(Map<String, dynamic> it, String token) async {
    final displayName = _resolveObligationName(it);
    final matrixId = it['id'];
    if (matrixId == null) {
      return {
        'name': displayName,
        'pdfs': <Map<String, dynamic>>[],
        'startDate': it['startDate'] ?? it['createdAt'],
        'dueDate': it['dueDate'],
        'createdAt': it['createdAt'],
        'completed': it['completed'] ?? false,
        'priority': it['priority'],
      };
    }

    final idNum = matrixId is int ? matrixId : int.tryParse(matrixId.toString());
    if (idNum == null) {
      return {
        'name': displayName,
        'pdfs': <Map<String, dynamic>>[],
        'startDate': it['startDate'] ?? it['createdAt'],
        'dueDate': it['dueDate'],
        'createdAt': it['createdAt'],
        'completed': it['completed'] ?? false,
        'priority': it['priority'],
        'status': it['status'],
      };
    }

    final files = await _listFilesForMatrix(idNum, token);
    final pdfs = files.where((f) {
      final name = (f['name'] ?? f['path'] ?? '').toString().toLowerCase();
      return name.endsWith('.pdf');
    }).toList();

    final mapped = <Map<String, dynamic>>[];
    for (final f in pdfs.take(3)) {
      final fid = f['id'];
      final name = (f['name'] ?? f['path'] ?? 'PDF').toString();
      final downloadUrl =
          (fid != null) ? '${AppConfig.baseUrl}/api/obligation-matrices/files/$fid/download' : null;
      mapped.add({'id': fid, 'name': name, 'downloadUrl': downloadUrl});
    }

    return {
      'id': idNum,
      'name': displayName,
      'pdfs': mapped,
      'startDate': it['startDate'] ?? it['createdAt'],
      'dueDate': it['dueDate'],
      'createdAt': it['createdAt'],
      'completed': it['completed'] ?? false,
      'priority': it['priority'],
      'status': it['status'],
    };
  }

  String _resolveObligationName(Map<String, dynamic> item) {
    final direct =
        (item['name'] ?? item['nombre'] ?? item['title'] ?? item['description'] ?? '').toString().trim();
    if (direct.isNotEmpty) return direct;
    final matrix = item['obligationMatrix'] ?? item['obligation_matrix'];
    if (matrix is Map) {
      final nested =
          (matrix['name'] ?? matrix['nombre'] ?? matrix['title'] ?? matrix['description'] ?? '').toString().trim();
      if (nested.isNotEmpty) return nested;
    }
    final catalogId = item['obligation_matrix_id'] ??
        item['obligationMatrixId'] ??
        (item['obligationMatrix'] is Map ? (item['obligationMatrix'] as Map)['id'] : null);
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
    final rucEnc = Uri.encodeComponent(ruc.trim());
    final businessResp = await http.get(
      Uri.parse('${AppConfig.baseUrl}/api/businesses/public/ruc/$rucEnc'),
      headers: {
        'Authorization': 'Bearer $token',
        'Accept': 'application/json',
      },
    );
    if (businessResp.statusCode != 200) return null;
    final business = jsonDecode(businessResp.body);
    final businessId = (business is Map<String, dynamic>) ? business['id'] : null;
    if (businessId == null) return null;
    final url =
        '${AppConfig.baseUrl}/api/obligation-matrices/business/$businessId/compliance-summary?_=${DateTime.now().millisecondsSinceEpoch}';
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
