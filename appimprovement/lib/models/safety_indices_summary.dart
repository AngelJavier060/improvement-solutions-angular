/// Respuesta de `GET /api/attendance/{businessId}/safety-indices?year=` (misma estructura que Angular).
class IncidenteDetalle {
  final int id;
  final String personName;
  final String personCedula;
  final String title;
  final String incidentDate;
  final int lostDays;
  final String? eventClassification;

  IncidenteDetalle({
    required this.id,
    required this.personName,
    required this.personCedula,
    required this.title,
    required this.incidentDate,
    required this.lostDays,
    this.eventClassification,
  });

  factory IncidenteDetalle.fromJson(Map<String, dynamic> j) {
    return IncidenteDetalle(
      id: _toInt(j['id']),
      personName: j['personName']?.toString() ?? '',
      personCedula: j['personCedula']?.toString() ?? '',
      title: j['title']?.toString() ?? '',
      incidentDate: j['incidentDate']?.toString() ?? '',
      lostDays: _toInt(j['lostDays']),
      eventClassification: j['eventClassification']?.toString(),
    );
  }
}

class SafetyIndicesMonth {
  final int month;
  final String label;
  final String mesAnio;
  final int lesiones;
  final int diasPerdidos;
  final double horasHombre;
  final double ifVal;
  final double trif;
  final double ig;
  final double tr;
  final List<IncidenteDetalle> incidentes;

  SafetyIndicesMonth({
    required this.month,
    required this.label,
    required this.mesAnio,
    required this.lesiones,
    required this.diasPerdidos,
    required this.horasHombre,
    required this.ifVal,
    required this.trif,
    required this.ig,
    required this.tr,
    required this.incidentes,
  });

  factory SafetyIndicesMonth.fromJson(Map<String, dynamic> j) {
    final rawInc = j['incidentes'];
    final List<IncidenteDetalle> inc = [];
    if (rawInc is List) {
      for (final e in rawInc) {
        if (e is Map<String, dynamic>) {
          inc.add(IncidenteDetalle.fromJson(e));
        } else if (e is Map) {
          inc.add(IncidenteDetalle.fromJson(Map<String, dynamic>.from(e)));
        }
      }
    }
    return SafetyIndicesMonth(
      month: _toInt(j['month']),
      label: j['label']?.toString() ?? '',
      mesAnio: j['mesAnio']?.toString() ?? '',
      lesiones: _toInt(j['lesiones']),
      diasPerdidos: _toInt(j['diasPerdidos']),
      horasHombre: _toDouble(j['horasHombre']),
      ifVal: _toDouble(j['if']),
      trif: _toDouble(j['trif']),
      ig: _toDouble(j['ig']),
      tr: _toDouble(j['tr']),
      incidentes: inc,
    );
  }
}

class SafetyIndicesKpis {
  final int lesiones;
  final int diasPerdidos;
  final double horasHombre;
  final double ifVal;
  final double trif;
  final double ig;
  final double tr;

  SafetyIndicesKpis({
    required this.lesiones,
    required this.diasPerdidos,
    required this.horasHombre,
    required this.ifVal,
    required this.trif,
    required this.ig,
    required this.tr,
  });

  factory SafetyIndicesKpis.fromJson(Map<String, dynamic> j) {
    return SafetyIndicesKpis(
      lesiones: _toInt(j['lesiones']),
      diasPerdidos: _toInt(j['diasPerdidos']),
      horasHombre: _toDouble(j['horasHombre']),
      ifVal: _toDouble(j['if']),
      trif: _toDouble(j['trif']),
      ig: _toDouble(j['ig']),
      tr: _toDouble(j['tr']),
    );
  }
}

class SafetyIndicesSummary {
  final int year;
  final SafetyIndicesKpis ytd;
  final List<SafetyIndicesMonth> months;

  SafetyIndicesSummary({
    required this.year,
    required this.ytd,
    required this.months,
  });

  factory SafetyIndicesSummary.fromJson(Map<String, dynamic> j) {
    final rawMonths = j['months'];
    final List<SafetyIndicesMonth> m = [];
    if (rawMonths is List) {
      for (final e in rawMonths) {
        if (e is Map<String, dynamic>) {
          m.add(SafetyIndicesMonth.fromJson(e));
        } else if (e is Map) {
          m.add(SafetyIndicesMonth.fromJson(Map<String, dynamic>.from(e)));
        }
      }
    }
    final ytdRaw = j['ytd'];
    if (ytdRaw is! Map) {
      throw const FormatException('SafetyIndicesSummary: falta ytd');
    }
    final ytdMap = Map<String, dynamic>.from(ytdRaw);
    return SafetyIndicesSummary(
      year: _toInt(j['year']),
      ytd: SafetyIndicesKpis.fromJson(ytdMap),
      months: m,
    );
  }
}

int _toInt(dynamic v) {
  if (v == null) return 0;
  if (v is int) return v;
  if (v is num) return v.toInt();
  return int.tryParse(v.toString()) ?? 0;
}

double _toDouble(dynamic v) {
  if (v == null) return 0;
  if (v is num) return v.toDouble();
  return double.tryParse(v.toString().replaceAll(',', '.')) ?? 0;
}
