import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../aula/aula_media.dart';
import '../services/employee_panel_service.dart';

class CartillaPanel extends StatefulWidget {
  final String? avatarUrl;
  final bool activo;

  const CartillaPanel({super.key, this.avatarUrl, required this.activo});

  @override
  State<CartillaPanel> createState() => _CartillaPanelState();
}

class _CartillaPanelState extends State<CartillaPanel> {
  bool _cargando = true;
  String _aviso = '';
  List<Map<String, dynamic>> _cartillas = const [];
  int _indice = 0;

  @override
  void initState() {
    super.initState();
    _cargar();
  }

  Future<void> _cargar() async {
    setState(() {
      _cargando = true;
      _aviso = '';
    });
    try {
      final filas = await EmployeePanelService().getMyCartilla();
      if (!mounted) return;
      setState(() {
        _cartillas = filas;
        _indice = 0;
        _cargando = false;
        if (filas.isEmpty) _aviso = 'Todavía no hay una cartilla de capacitaciones para este año.';
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _cargando = false;
        _aviso = error.toString().replaceFirst('Exception: ', '');
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_cargando) {
      return const Center(child: CircularProgressIndicator(color: Color(0xFF1D4ED8)));
    }
    if (_cartillas.isEmpty) {
      return ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text(_aviso, style: _estilo(color: const Color(0xFF64748B))),
        ],
      );
    }
    final item = _cartillas[_indice];
    final worker = (item['worker'] as Map?)?.cast<String, dynamic>() ?? <String, dynamic>{};
    final records = (worker['records'] as List?)?.whereType<Map>().map((e) => e.cast<String, dynamic>()).toList() ?? <Map<String, dynamic>>[];
    final pendientes = (worker['pendingTopics'] as List?)?.whereType<Map>().map((e) => e.cast<String, dynamic>()).toList() ?? <Map<String, dynamic>>[];
    final porcentaje = _porcentaje(worker);
    final anio = item['year'] ?? DateTime.now().year;

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        if (_aviso.isNotEmpty) Text(_aviso, style: _estilo(size: 13, color: const Color(0xFFB42318))),
        if (_cartillas.length > 1)
          Wrap(
            spacing: 8,
            children: List.generate(_cartillas.length, (i) {
              final activa = i == _indice;
              return ChoiceChip(
                label: Text((_cartillas[i]['companyName'] ?? '').toString()),
                selected: activa,
                onSelected: (_) => setState(() => _indice = i),
              );
            }),
          ),
        const SizedBox(height: 8),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: const Color(0xFFF1F5F9)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  CircleAvatar(
                    backgroundColor: const Color(0xFF1D4ED8),
                    child: Text(_siglas((item['companyName'] ?? '').toString()), style: _estilo(size: 12, weight: FontWeight.w800, color: Colors.white)),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text((item['companyName'] ?? '').toString(), style: _estilo(size: 16, weight: FontWeight.w800)),
                        Text('SIG · SST  Departamento de Seguridad, Salud y Ambiente en el Trabajo', style: _estilo(size: 12, color: const Color(0xFF64748B))),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text('Año $anio  ·  Expediente individual  ·  Solo consulta', style: _estilo(size: 12, weight: FontWeight.w700, color: const Color(0xFF1D4ED8))),
              TextButton(onPressed: imprimirPagina, child: const Text('Imprimir')),
              Text(
                'Cartilla individual de capacitaciones, entrenamiento y competencias SST',
                style: _estilo(size: 16, weight: FontWeight.w800),
              ),
              const SizedBox(height: 4),
              Text(
                'Registro del plan anual $anio y las asistencias de Talento Humano. Aquí solo se consulta; no se abren actas ni PDF.',
                style: _estilo(size: 12, color: const Color(0xFF64748B)),
              ),
              const SizedBox(height: 14),
              Row(
                children: [
                  CircleAvatar(
                    radius: 28,
                    backgroundColor: const Color(0xFFF1F5F9),
                    backgroundImage: widget.avatarUrl == null ? null : NetworkImage(widget.avatarUrl!),
                    child: widget.avatarUrl == null
                        ? Text(_iniciales((worker['fullName'] ?? '').toString()), style: _estilo(weight: FontWeight.w800))
                        : null,
                  ),
                  const SizedBox(width: 8),
                  Text(widget.activo ? 'Activo' : 'Inactivo', style: _estilo(size: 12, weight: FontWeight.w800, color: widget.activo ? const Color(0xFF059669) : const Color(0xFF64748B))),
                ],
              ),
              const SizedBox(height: 10),
              _dato('Colaborador', (worker['fullName'] ?? '—').toString()),
              _dato('Cédula', (worker['cedula'] ?? '—').toString()),
              _dato('Cargo', (worker['position'] ?? '—').toString()),
              _dato('Área', _area(worker)),
              _dato('Ingreso', '${_fecha(worker['hireDate']?.toString())}${_contrato(worker)}'),
              _dato('Grupo sanguíneo', (worker['bloodType'] ?? '—').toString()),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  _kpi('Cursos recibidos', '${worker['received'] ?? 0}', 'Eventos SST $anio'),
                  _kpi('Horas lectivas', '${_horas(worker, records)}', 'Horas en asistencia'),
                  _kpi('Plan anual $anio', '$porcentaje%', (worker['pending'] ?? 0) == 0 ? 'Audiencia al día' : 'Con temas pendientes'),
                  _kpi('Pendientes', '${worker['pending'] ?? 0}', 'Temas de su audiencia'),
                ],
              ),
              const SizedBox(height: 8),
              ClipRRect(
                borderRadius: BorderRadius.circular(99),
                child: LinearProgressIndicator(
                  value: porcentaje / 100,
                  minHeight: 8,
                  backgroundColor: const Color(0xFFE2E8F0),
                  color: const Color(0xFF1D4ED8),
                ),
              ),
              const SizedBox(height: 16),
              Text('Registro de cursos y entrenamientos', style: _estilo(size: 15, weight: FontWeight.w800)),
              Text('${records.length} registros · Historial $anio', style: _estilo(size: 12, color: const Color(0xFF64748B))),
              const SizedBox(height: 8),
              if (records.isEmpty)
                Text('Aún no tiene asistencias registradas en $anio.', style: _estilo(size: 13, color: const Color(0xFF64748B)))
              else
                ...records.map(_fila),
              const SizedBox(height: 16),
              Text('Temas pendientes', style: _estilo(size: 15, weight: FontWeight.w800)),
              Text('Obligatorios de su audiencia en el plan $anio', style: _estilo(size: 12, color: const Color(0xFF64748B))),
              const SizedBox(height: 8),
              if (pendientes.isEmpty)
                Text('No tiene temas pendientes en su audiencia.', style: _estilo(size: 13, color: const Color(0xFF059669)))
              else
                ...pendientes.map((tema) {
                  return Container(
                    width: double.infinity,
                    margin: const EdgeInsets.only(bottom: 8),
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(color: const Color(0xFFFFF7ED), borderRadius: BorderRadius.circular(12)),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text((tema['topicName'] ?? '').toString(), style: _estilo(weight: FontWeight.w800)),
                        Text((tema['audienceLabel'] ?? 'Audiencia del plan').toString(), style: _estilo(size: 12, color: const Color(0xFF9A3412))),
                      ],
                    ),
                  );
                }),
            ],
          ),
        ),
      ],
    );
  }

  Widget _fila(Map<String, dynamic> fila) {
    final horas = fila['hours'];
    final extra = horas == null ? '' : ' · ${horas}h';
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(_fecha(fila['sessionDate']?.toString()), style: _estilo(size: 12, color: const Color(0xFF64748B))),
          Text((fila['topicName'] ?? '').toString(), style: _estilo(weight: FontWeight.w800)),
          Text('${_modo(fila)}$extra', style: _estilo(size: 12, color: const Color(0xFF334155))),
          Text((fila['facilitator'] ?? '—').toString(), style: _estilo(size: 12, color: const Color(0xFF64748B))),
          const SizedBox(height: 4),
          Text(_tipo(fila), style: _estilo(size: 12, weight: FontWeight.w800, color: const Color(0xFF1D4ED8))),
          Text('Asistió', style: _estilo(size: 12, weight: FontWeight.w800, color: const Color(0xFF059669))),
        ],
      ),
    );
  }

  Widget _dato(String etiqueta, String valor) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(etiqueta, style: _estilo(size: 11, weight: FontWeight.w700, color: const Color(0xFF64748B))),
          Text(valor, style: _estilo(weight: FontWeight.w700)),
        ],
      ),
    );
  }

  Widget _kpi(String titulo, String valor, String nota) {
    return Container(
      width: 150,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(titulo, style: _estilo(size: 11, color: const Color(0xFF64748B))),
          Text(valor, style: _estilo(size: 22, weight: FontWeight.w800)),
          Text(nota, style: _estilo(size: 11, color: const Color(0xFF64748B))),
        ],
      ),
    );
  }
}

int _porcentaje(Map<String, dynamic> worker) {
  final recibidos = (worker['received'] as num?)?.toInt() ?? 0;
  final pendientes = (worker['pending'] as num?)?.toInt() ?? 0;
  final total = recibidos + pendientes;
  if (total == 0) return 0;
  return ((recibidos * 100) / total).round();
}

int _horas(Map<String, dynamic> worker, List<Map<String, dynamic>> records) {
  final total = (worker['hoursTotal'] as num?)?.toInt() ?? 0;
  if (total > 0) return total;
  return records.fold<int>(0, (suma, fila) => suma + ((fila['hours'] as num?)?.toInt() ?? 0));
}

String _area(Map<String, dynamic> worker) {
  final partes = [worker['department'], worker['contractorCompany'], worker['block']]
      .map((valor) => (valor ?? '').toString().trim())
      .where((valor) => valor.isNotEmpty)
      .toList();
  return partes.isEmpty ? '—' : partes.join(' · ');
}

String _contrato(Map<String, dynamic> worker) {
  final tipo = (worker['contractType'] ?? '').toString().trim();
  return tipo.isEmpty ? '' : ' · $tipo';
}

String _fecha(String? valor) {
  if (valor == null || valor.isEmpty) return '—';
  if (RegExp(r'^\d{4}-\d{2}-\d{2}').hasMatch(valor)) {
    final partes = valor.substring(0, 10).split('-');
    return '${partes[2]}/${partes[1]}/${partes[0].substring(2)}';
  }
  return valor;
}

String _tipo(Map<String, dynamic> fila) {
  final origen = (fila['origin'] ?? '').toString().toUpperCase();
  final tipo = (fila['activityType'] ?? '').toString().toUpperCase();
  final tema = (fila['topicName'] ?? '').toString().toUpperCase();
  if (tipo == 'SIMULACRO' || tema.contains('SIMULACRO')) return 'Simulacro';
  if (origen == 'REINDUCCION') return 'Reinducción';
  if (origen == 'EVENTUAL') return 'Fuera de programa';
  if (tipo == 'ENTRENAMIENTO') return 'Entrenamiento';
  return 'Plan anual';
}

String _modo(Map<String, dynamic> fila) {
  final metodo = (fila['methodology'] ?? '').toString().trim();
  if (metodo.isNotEmpty) return metodo;
  final tipo = (fila['activityType'] ?? '').toString().toUpperCase();
  if (tipo == 'ENTRENAMIENTO') return 'Práctico';
  if (tipo == 'SIMULACRO') return 'Simulacro';
  return 'Presencial';
}

String _siglas(String nombre) {
  final limpio = nombre.replaceAll(RegExp(r'[^A-Za-zÁÉÍÓÚÑáéíóúñ]'), '');
  final base = limpio.length >= 3 ? limpio.substring(0, 3) : limpio;
  return (base.isEmpty ? 'SST' : base).toUpperCase();
}

String _iniciales(String nombre) {
  final partes = nombre.split(RegExp(r'\s+')).where((p) => p.isNotEmpty).take(2);
  return partes.map((p) => p[0].toUpperCase()).join();
}

TextStyle _estilo({
  double size = 14,
  FontWeight weight = FontWeight.w500,
  Color color = const Color(0xFF0F172A),
}) {
  return GoogleFonts.plusJakartaSans(fontSize: size, fontWeight: weight, color: color, height: 1.3);
}
