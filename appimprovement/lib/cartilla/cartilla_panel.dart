import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

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

    final nombre = (worker['fullName'] ?? '—').toString();
    final cargo = (worker['position'] ?? '—').toString();
    final area = (worker['department'] ?? '').toString().trim().isEmpty ? _area(worker) : worker['department'].toString();
    final sangre = (worker['bloodType'] ?? '—').toString();
    final pendientesN = (worker['pending'] as num?)?.toInt() ?? pendientes.length;
    final recibidos = worker['received'] ?? 0;

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 28),
      children: [
        if (_aviso.isNotEmpty) ...[
          Text(_aviso, style: _estilo(size: 13, color: const Color(0xFFB42318))),
          const SizedBox(height: 10),
        ],
        if (_cartillas.length > 1) ...[
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: List.generate(_cartillas.length, (i) {
              final activa = i == _indice;
              return ChoiceChip(
                label: Text((_cartillas[i]['companyName'] ?? '').toString()),
                selected: activa,
                onSelected: (_) => setState(() => _indice = i),
              );
            }),
          ),
          const SizedBox(height: 10),
        ],
        _tarjeta(
          child: Column(
            children: [
              Row(
                children: [
                  Stack(
                    clipBehavior: Clip.none,
                    children: [
                      CircleAvatar(
                        radius: 28,
                        backgroundColor: const Color(0xFFF1F5F9),
                        backgroundImage: widget.avatarUrl == null ? null : NetworkImage(widget.avatarUrl!),
                        child: widget.avatarUrl == null
                            ? Text(_iniciales(nombre), style: _estilo(weight: FontWeight.w800))
                            : null,
                      ),
                      Positioned(
                        right: 0,
                        bottom: 0,
                        child: Container(
                          width: 14,
                          height: 14,
                          decoration: BoxDecoration(
                            color: widget.activo ? const Color(0xFF10B981) : const Color(0xFF94A3B8),
                            shape: BoxShape.circle,
                            border: Border.all(color: Colors.white, width: 2),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Text('COLABORADOR', style: _estilo(size: 10, weight: FontWeight.w800, color: const Color(0xFF64748B))),
                            const Spacer(),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                              decoration: BoxDecoration(
                                color: widget.activo ? const Color(0xFFECFDF5) : const Color(0xFFF1F5F9),
                                borderRadius: BorderRadius.circular(999),
                                border: Border.all(color: widget.activo ? const Color(0xFFA7F3D0) : const Color(0xFFE2E8F0)),
                              ),
                              child: Text(
                                widget.activo ? 'Activo' : 'Inactivo',
                                style: _estilo(size: 11, weight: FontWeight.w700, color: widget.activo ? const Color(0xFF047857) : const Color(0xFF64748B)),
                              ),
                            ),
                          ],
                        ),
                        Text(nombre.toUpperCase(), maxLines: 2, overflow: TextOverflow.ellipsis, style: _estilo(size: 14, weight: FontWeight.w800)),
                        Text(cargo, maxLines: 1, overflow: TextOverflow.ellipsis, style: _estilo(size: 12, weight: FontWeight.w700, color: const Color(0xFF1D4ED8))),
                        Text(area, maxLines: 1, overflow: TextOverflow.ellipsis, style: _estilo(size: 11, weight: FontWeight.w600, color: const Color(0xFF64748B))),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              const Divider(height: 1, color: Color(0xFFF1F5F9)),
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(child: _mini('GRUPO SANGUÍNEO', sangre)),
                  const SizedBox(width: 8),
                  Expanded(child: _mini('FECHA INGRESO', _fechaLarga(worker['hireDate']?.toString()))),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(18),
            gradient: const LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [Color(0xFF1E3A8A), Color(0xFF0F172A)],
            ),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 28,
                height: 28,
                decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(8)),
                child: const Icon(Icons.verified_user_outlined, size: 16, color: Color(0xFF93C5FD)),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Cartilla individual de capacitaciones, entrenamiento y competencias SST',
                      style: _estilo(size: 12, weight: FontWeight.w800, color: Colors.white),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Registro del plan anual $anio y las asistencias de Talento Humano. Aquí solo se consulta; no se abren actas ni PDF.',
                      style: _estilo(size: 11, color: const Color(0xFFCBD5E1)),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        GridView.count(
          crossAxisCount: 2,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          mainAxisSpacing: 10,
          crossAxisSpacing: 10,
          childAspectRatio: 1.35,
          children: [
            _metrica('CURSOS RECIBIDOS', '$recibidos', 'Eventos SST $anio', Icons.school_outlined, const Color(0xFF2563EB), const Color(0xFFEFF6FF)),
            _metrica('HORAS LECTIVAS', '${_horas(worker, records)}', 'Horas en asistencia', Icons.schedule, const Color(0xFF4F46E5), const Color(0xFFEEF2FF)),
            _metrica('PLAN ANUAL $anio', '$porcentaje%', 'Audiencia al día', Icons.pie_chart_outline, const Color(0xFF059669), const Color(0xFFECFDF5), avance: porcentaje / 100),
            _metrica('PENDIENTES', '$pendientesN', 'Temas de su audiencia', Icons.check_circle_outline, const Color(0xFF059669), const Color(0xFFECFDF5), valorVerde: pendientesN == 0),
          ],
        ),
        const SizedBox(height: 12),
        _tarjeta(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Registro de cursos y entrenamientos', style: _estilo(size: 14, weight: FontWeight.w800)),
                        Text('${records.length} registros · Historial $anio', style: _estilo(size: 11, weight: FontWeight.w600, color: const Color(0xFF475569))),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(color: const Color(0xFFF1F5F9), borderRadius: BorderRadius.circular(999)),
                    child: Text('$anio', style: _estilo(size: 11, weight: FontWeight.w700, color: const Color(0xFF475569))),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              if (records.isEmpty)
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF8FAFC),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: const Color(0xFFE2E8F0), style: BorderStyle.solid),
                  ),
                  child: Column(
                    children: [
                      Container(
                        width: 40,
                        height: 40,
                        decoration: BoxDecoration(
                          color: Colors.white,
                          shape: BoxShape.circle,
                          border: Border.all(color: const Color(0xFFE2E8F0)),
                        ),
                        child: const Icon(Icons.event_busy_outlined, size: 20, color: Color(0xFF94A3B8)),
                      ),
                      const SizedBox(height: 8),
                      Text('Aún no tiene asistencias registradas en $anio.', textAlign: TextAlign.center, style: _estilo(size: 12, weight: FontWeight.w700, color: const Color(0xFF334155))),
                      const SizedBox(height: 4),
                      Text(
                        'Las firmas y asistencias validadas por el capacitador se sincronizan automáticamente.',
                        textAlign: TextAlign.center,
                        style: _estilo(size: 11, color: const Color(0xFF475569)),
                      ),
                    ],
                  ),
                )
              else
                ...records.map(_fila),
            ],
          ),
        ),
        const SizedBox(height: 12),
        _tarjeta(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Temas pendientes', style: _estilo(size: 14, weight: FontWeight.w800)),
              Text('Obligatorios de su audiencia en el plan $anio', style: _estilo(size: 11, weight: FontWeight.w600, color: const Color(0xFF475569))),
              const SizedBox(height: 12),
              if (pendientes.isEmpty)
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: const Color(0xFFECFDF5),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: const Color(0xFFA7F3D0)),
                  ),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        width: 32,
                        height: 32,
                        decoration: const BoxDecoration(color: Color(0xFFD1FAE5), shape: BoxShape.circle),
                        child: const Icon(Icons.check, size: 16, color: Color(0xFF047857)),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('No tiene temas pendientes en su audiencia.', style: _estilo(size: 12, weight: FontWeight.w800, color: const Color(0xFF064E3B))),
                            const SizedBox(height: 2),
                            Text(
                              'Cumple satisfactoriamente con la programación actual establecida por el área de Talento Humano.',
                              style: _estilo(size: 11, weight: FontWeight.w600, color: const Color(0xFF047857)),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                )
              else
                ...pendientes.map((tema) {
                  return Container(
                    width: double.infinity,
                    margin: const EdgeInsets.only(bottom: 8),
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFFF7ED),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFFFED7AA)),
                    ),
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

  Widget _tarjeta({required Widget child}) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: const [BoxShadow(color: Color(0x0A0F172A), blurRadius: 10, offset: Offset(0, 2))],
      ),
      child: child,
    );
  }

  Widget _mini(String etiqueta, String valor) {
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFF1F5F9)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(etiqueta, style: _estilo(size: 10, weight: FontWeight.w800, color: const Color(0xFF94A3B8))),
          const SizedBox(height: 2),
          Text(valor, style: _estilo(size: 12, weight: FontWeight.w800)),
        ],
      ),
    );
  }

  Widget _metrica(String titulo, String valor, String nota, IconData icono, Color tinta, Color fondo, {double? avance, bool valorVerde = false}) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(child: Text(titulo, style: _estilo(size: 11, weight: FontWeight.w800, color: const Color(0xFF64748B)))),
              Container(
                width: 28,
                height: 28,
                decoration: BoxDecoration(color: fondo, borderRadius: BorderRadius.circular(8)),
                child: Icon(icono, size: 16, color: tinta),
              ),
            ],
          ),
          const Spacer(),
          Text(valor, style: _estilo(size: 24, weight: FontWeight.w800, color: valorVerde ? const Color(0xFF059669) : const Color(0xFF0F172A))),
          if (avance != null) ...[
            const SizedBox(height: 6),
            ClipRRect(
              borderRadius: BorderRadius.circular(99),
              child: LinearProgressIndicator(
                value: avance.clamp(0, 1),
                minHeight: 6,
                backgroundColor: const Color(0xFFF1F5F9),
                color: const Color(0xFF10B981),
              ),
            ),
          ],
          Text(nota, style: _estilo(size: 11, weight: FontWeight.w600, color: const Color(0xFF64748B))),
        ],
      ),
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

String _fechaLarga(String? valor) {
  if (valor == null || !RegExp(r'^\d{4}-\d{2}-\d{2}').hasMatch(valor)) return valor == null || valor.isEmpty ? '—' : valor;
  const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  final partes = valor.substring(0, 10).split('-');
  final mes = int.tryParse(partes[1]) ?? 1;
  final dia = int.tryParse(partes[2]) ?? 1;
  return '$dia ${meses[mes - 1]} ${partes[0]}';
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
