import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config/app_config.dart';
import 'auth_service.dart';

enum FleetDocStatus { vigente, proximo, vencido, noCaduca, sinVigencia }

class FleetUnitDoc {
  final dynamic id;
  final int vehicleId;
  final String typeLabel;
  final String? entidadRemitenteName;
  final String? docCategory;
  final String? issueDate;
  final String? expiryDate;
  final bool active;
  final bool historicMode;
  final int? attachedFleetDocumentId;
  final String? attachedDocumentUrl;

  const FleetUnitDoc({
    required this.id,
    required this.vehicleId,
    required this.typeLabel,
    this.entidadRemitenteName,
    this.docCategory,
    this.issueDate,
    this.expiryDate,
    this.active = true,
    this.historicMode = false,
    this.attachedFleetDocumentId,
    this.attachedDocumentUrl,
  });

  factory FleetUnitDoc.fromJson(Map<String, dynamic> json) {
    return FleetUnitDoc(
      id: json['id'],
      vehicleId: (json['vehicleId'] as num?)?.toInt() ?? 0,
      typeLabel: (json['typeLabel'] ?? json['typeCode'] ?? 'Documento').toString(),
      entidadRemitenteName: json['entidadRemitenteName']?.toString(),
      docCategory: json['docCategory']?.toString(),
      issueDate: json['issueDate']?.toString(),
      expiryDate: json['expiryDate']?.toString(),
      active: json['active'] != false,
      historicMode: json['historicMode'] == true,
      attachedFleetDocumentId: (json['attachedFleetDocumentId'] as num?)?.toInt(),
      attachedDocumentUrl: json['attachedDocumentUrl']?.toString(),
    );
  }

  int? get daysLeft => FleetUnitsService.daysToExpiry(expiryDate);
  FleetDocStatus get status => FleetUnitsService.statusForExpiry(expiryDate);
}

class FleetUnit {
  final int id;
  final String? placa;
  final String? codigoEquipo;
  final String? marca;
  final String? modelo;
  final String? clase;
  final String? tipoVehiculo;
  final String? serieMotor;
  final String? serieChasis;
  final String? fotoPrincipal;
  final List<FleetUnitDoc> docs;

  const FleetUnit({
    required this.id,
    this.placa,
    this.codigoEquipo,
    this.marca,
    this.modelo,
    this.clase,
    this.tipoVehiculo,
    this.serieMotor,
    this.serieChasis,
    this.fotoPrincipal,
    this.docs = const [],
  });

  String get displayPlaca => (placa?.trim().isNotEmpty == true) ? placa!.trim() : (codigoEquipo ?? 'Sin placa');

  String get marcaModelo {
    final parts = [marca, modelo].where((s) => (s ?? '').trim().isNotEmpty).map((s) => s!.trim());
    return parts.isEmpty ? '—' : parts.join(' · ');
  }

  String? get photoUrl => FleetUnitsService.absoluteMediaUrl(fotoPrincipal);

  List<FleetUnitDoc> get activeDocs =>
      docs.where((d) => d.active && !d.historicMode).toList();

  /// Peores N docs para preview en tarjeta (ordenados por días asc).
  List<FleetUnitDoc> previewDocs({int max = 3}) {
    final list = [...activeDocs];
    list.sort((a, b) {
      final da = a.daysLeft;
      final db = b.daysLeft;
      if (da == null && db == null) return 0;
      if (da == null) return 1;
      if (db == null) return -1;
      return da.compareTo(db);
    });
    return list.take(max).toList();
  }

  FleetDocStatus get worstStatus {
    final list = activeDocs;
    if (list.isEmpty) return FleetDocStatus.sinVigencia;
    var worst = FleetDocStatus.vigente;
    var hasNoCaduca = false;
    for (final d in list) {
      final st = d.status;
      if (st == FleetDocStatus.noCaduca) hasNoCaduca = true;
      if (_rank(st) < _rank(worst)) worst = st;
    }
    if (worst == FleetDocStatus.vigente &&
        hasNoCaduca &&
        list.every((x) => x.status == FleetDocStatus.noCaduca)) {
      return FleetDocStatus.noCaduca;
    }
    return worst;
  }

  int? get worstDays {
    int? min;
    for (final d in activeDocs) {
      final days = d.daysLeft;
      if (days == null) continue;
      if (min == null || days < min) min = days;
    }
    return min;
  }

  static int _rank(FleetDocStatus s) {
    switch (s) {
      case FleetDocStatus.vencido:
        return 0;
      case FleetDocStatus.proximo:
        return 1;
      case FleetDocStatus.vigente:
        return 2;
      case FleetDocStatus.noCaduca:
        return 3;
      case FleetDocStatus.sinVigencia:
        return 4;
    }
  }
}

class FleetUnitsService {
  final AuthService _auth = AuthService();

  Map<String, String> get _headers => {
        'Accept': 'application/json',
        if (_auth.token != null) 'Authorization': 'Bearer ${_auth.token}',
      };

  String? get _ruc => _auth.getPrimaryBusinessRuc();

  /// Misma lógica Angular `daysToExpiry`.
  static int? daysToExpiry(String? expiryDate) {
    if (expiryDate == null || expiryDate.trim().isEmpty) return null;
    final raw = expiryDate.trim().split(' ').first.replaceAll('/', '-');
    DateTime? end;
    final iso = DateTime.tryParse(expiryDate.contains('T') ? expiryDate : '${raw}T12:00:00');
    if (iso != null) {
      end = iso;
    } else {
      final ymd = RegExp(r'^(\d{4})-(\d{2})-(\d{2})$').firstMatch(raw);
      final dmy = RegExp(r'^(\d{2})-(\d{2})-(\d{4})$').firstMatch(raw);
      if (ymd != null) {
        end = DateTime(int.parse(ymd.group(1)!), int.parse(ymd.group(2)!), int.parse(ymd.group(3)!), 12);
      } else if (dmy != null) {
        end = DateTime(int.parse(dmy.group(3)!), int.parse(dmy.group(2)!), int.parse(dmy.group(1)!), 12);
      }
    }
    if (end == null) return null;
    final start = DateTime.now();
    final startDay = DateTime(start.year, start.month, start.day);
    return end.difference(startDay).inDays;
  }

  static FleetDocStatus statusForExpiry(String? expiryDate) {
    if (expiryDate == null || expiryDate.trim().isEmpty) return FleetDocStatus.noCaduca;
    final d = daysToExpiry(expiryDate);
    if (d == null) return FleetDocStatus.sinVigencia;
    if (d <= 0) return FleetDocStatus.vencido;
    if (d <= 30) return FleetDocStatus.proximo;
    return FleetDocStatus.vigente;
  }

  static String statusLabel(FleetDocStatus s) {
    switch (s) {
      case FleetDocStatus.vigente:
        return 'VIGENTE';
      case FleetDocStatus.proximo:
        return 'PRÓXIMO A VENCER';
      case FleetDocStatus.vencido:
        return 'VENCIDO';
      case FleetDocStatus.noCaduca:
        return 'NO CADUCA';
      case FleetDocStatus.sinVigencia:
        return 'SIN VIGENCIA';
    }
  }

  static String daysLabel(int? days) {
    if (days == null) return '—';
    if (days < 0) return '${days}d';
    if (days == 0) return '0d';
    return '${days}d';
  }

  static String formatDateDmy(String? raw) {
    if (raw == null || raw.trim().isEmpty) return '—';
    final trimmed = raw.trim().split(' ').first.replaceAll('/', '-');
    final iso = DateTime.tryParse(raw.contains('T') ? raw : '${trimmed}T12:00:00');
    DateTime? dt = iso;
    if (dt == null) {
      final ymd = RegExp(r'^(\d{4})-(\d{2})-(\d{2})$').firstMatch(trimmed);
      final dmy = RegExp(r'^(\d{2})-(\d{2})-(\d{4})$').firstMatch(trimmed);
      if (ymd != null) {
        dt = DateTime(int.parse(ymd.group(1)!), int.parse(ymd.group(2)!), int.parse(ymd.group(3)!));
      } else if (dmy != null) {
        dt = DateTime(int.parse(dmy.group(3)!), int.parse(dmy.group(2)!), int.parse(dmy.group(1)!));
      }
    }
    if (dt == null) return raw;
    final dd = dt.day.toString().padLeft(2, '0');
    final mm = dt.month.toString().padLeft(2, '0');
    return '$dd/$mm/${dt.year}';
  }

  static String? absoluteMediaUrl(String? path) {
    if (path == null || path.trim().isEmpty) return null;
    var p = path.trim().replaceAll('\\', '/');
    if (p.startsWith('http://') || p.startsWith('https://')) return p;
    if (p.startsWith('/api/')) return '${AppConfig.baseUrl}$p';
    if (p.startsWith('api/')) return '${AppConfig.baseUrl}/$p';
    while (p.startsWith('/')) {
      p = p.substring(1);
    }
    if (p.startsWith('uploads/')) p = p.substring('uploads/'.length);
    final encoded = p.split('/').map(Uri.encodeComponent).join('/');
    return '${AppConfig.baseUrl}/api/files/$encoded';
  }

  String? pdfUrlForDoc(int vehicleId, FleetUnitDoc doc) {
    final ruc = _ruc;
    if (ruc == null) return null;
    if (doc.attachedFleetDocumentId != null) {
      return '${AppConfig.baseUrl}/api/fleet/${Uri.encodeComponent(ruc)}/vehicles/$vehicleId/documents/${doc.attachedFleetDocumentId}/content';
    }
    return absoluteMediaUrl(doc.attachedDocumentUrl);
  }

  Future<List<FleetUnit>> getUnitsWithDocs() async {
    final ruc = _ruc;
    if (ruc == null) throw Exception('No hay RUC de empresa en la sesión.');

    final vehiclesUrl =
        '${AppConfig.baseUrl}/api/fleet/${Uri.encodeComponent(ruc)}/vehicles?page=1&pageSize=500';
    final docsUrl = '${AppConfig.baseUrl}/api/fleet/${Uri.encodeComponent(ruc)}/compliance-docs';

    final vehiclesResp = await http.get(Uri.parse(vehiclesUrl), headers: _headers);
    if (vehiclesResp.statusCode == 401) throw Exception('Sesión expirada. Inicia sesión de nuevo.');
    if (vehiclesResp.statusCode != 200) {
      throw Exception('No se pudo cargar la flota (${vehiclesResp.statusCode})');
    }

    final vehiclesJson = jsonDecode(vehiclesResp.body);
    final List<dynamic> rawVehicles = vehiclesJson is Map
        ? (vehiclesJson['vehicles'] as List? ?? const [])
        : (vehiclesJson is List ? vehiclesJson : const []);

    Map<int, List<FleetUnitDoc>> byVehicle = {};
    try {
      final docsResp = await http.get(Uri.parse(docsUrl), headers: _headers);
      if (docsResp.statusCode == 200) {
        final decoded = jsonDecode(docsResp.body);
        final List<dynamic> rawDocs = decoded is List
            ? decoded
            : (decoded is Map && decoded['data'] is List ? decoded['data'] as List : const []);
        for (final raw in rawDocs) {
          if (raw is! Map) continue;
          final doc = FleetUnitDoc.fromJson(raw.cast<String, dynamic>());
          if (!doc.active || doc.historicMode) continue;
          byVehicle.putIfAbsent(doc.vehicleId, () => []).add(doc);
        }
      }
    } catch (_) {}

    return rawVehicles.whereType<Map>().map((m) {
      final map = m.cast<String, dynamic>();
      final id = (map['id'] as num?)?.toInt() ?? 0;
      return FleetUnit(
        id: id,
        placa: map['placa']?.toString(),
        codigoEquipo: map['codigoEquipo']?.toString(),
        marca: map['marca']?.toString(),
        modelo: map['modelo']?.toString(),
        clase: map['clase']?.toString(),
        tipoVehiculo: map['tipoVehiculo']?.toString(),
        serieMotor: map['serieMotor']?.toString(),
        serieChasis: map['serieChasis']?.toString(),
        fotoPrincipal: map['fotoPrincipal']?.toString(),
        docs: byVehicle[id] ?? const [],
      );
    }).where((u) => u.id > 0).toList();
  }

  Future<FleetUnit?> getUnit(int vehicleId) async {
    final all = await getUnitsWithDocs();
    try {
      return all.firstWhere((u) => u.id == vehicleId);
    } catch (_) {
      return null;
    }
  }

  Future<List<FleetUnitDoc>> getDocsForVehicle(int vehicleId) async {
    final ruc = _ruc;
    if (ruc == null) return [];
    final url =
        '${AppConfig.baseUrl}/api/fleet/${Uri.encodeComponent(ruc)}/vehicles/$vehicleId/compliance-docs';
    final resp = await http.get(Uri.parse(url), headers: _headers);
    if (resp.statusCode != 200) return [];
    final decoded = jsonDecode(resp.body);
    final List<dynamic> raw = decoded is List
        ? decoded
        : (decoded is Map && decoded['data'] is List ? decoded['data'] as List : const []);
    return raw
        .whereType<Map>()
        .map((m) => FleetUnitDoc.fromJson(m.cast<String, dynamic>()))
        .where((d) => d.active && !d.historicMode)
        .toList();
  }
}
