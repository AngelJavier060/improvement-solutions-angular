import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:video_player/video_player.dart';

import '../services/aula_virtual_service.dart';
import 'aula_media.dart';

class CharlasDelPerfil extends StatefulWidget {
  final void Function(int cursoId) onUnirme;

  const CharlasDelPerfil({super.key, required this.onUnirme});

  @override
  State<CharlasDelPerfil> createState() => _CharlasDelPerfilState();
}

class _CharlasDelPerfilState extends State<CharlasDelPerfil> {
  List<Map<String, dynamic>> _charlas = const [];

  @override
  void initState() {
    super.initState();
    _cargar();
  }

  Future<void> _cargar() async {
    try {
      final cursos = await AulaVirtualService().misCursos();
      if (!mounted) return;
      setState(() {
        _charlas = cursos.where((curso) {
          final sala = (curso['sala'] ?? '').toString();
          final modo = (curso['modalidad'] ?? '').toString();
          return sala.isNotEmpty && (modo == 'vivo' || modo == 'charla');
        }).toList();
      });
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    if (_charlas.isEmpty) return const SizedBox.shrink();
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFFF1F5F9)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Charlas', style: _estilo(size: 16, weight: FontWeight.w800)),
          const SizedBox(height: 10),
          ..._charlas.map((curso) {
            final vencido = curso['vencido'] == true;
            return Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text((curso['titulo'] ?? '').toString(), style: _estilo(weight: FontWeight.w700)),
                        Text('Fecha de la reunión ${fechaCharla(curso)}', style: _estilo(size: 12, color: const Color(0xFF64748B))),
                      ],
                    ),
                  ),
                  if (!vencido)
                    TextButton(
                      onPressed: () => widget.onUnirme((curso['id'] as num).toInt()),
                      child: const Text('Unirme a la charla'),
                    )
                  else
                    Text('La fecha límite ya se cumplió.', style: _estilo(size: 12, color: const Color(0xFFB42318))),
                ],
              ),
            );
          }),
        ],
      ),
    );
  }
}

class AulaVirtualPanel extends StatefulWidget {
  final int? unirseCursoId;
  final VoidCallback? onUnirseConsumido;
  final VoidCallback? onVerCursos;

  const AulaVirtualPanel({super.key, this.unirseCursoId, this.onUnirseConsumido, this.onVerCursos});

  @override
  State<AulaVirtualPanel> createState() => _AulaVirtualPanelState();
}

class _AulaVirtualPanelState extends State<AulaVirtualPanel> {
  final _api = AulaVirtualService();
  List<Map<String, dynamic>> _cursos = const [];
  Map<String, dynamic>? _abierto;
  String _aviso = '';
  bool _cargando = true;
  bool _videoListo = false;
  bool _terminado = false;
  bool _enSala = false;
  bool _enviando = false;
  String? _veredicto;
  int? _nota;
  List<Map<String, dynamic>> _preguntas = const [];
  List<int?> _respuestas = const [];
  int _segundos = 0;
  Timer? _reloj;
  VideoPlayerController? _video;
  Duration _visto = Duration.zero;
  bool _ajustando = false;
  bool _silencio = false;
  bool _verControles = true;
  bool _enGrande = false;
  Timer? _ocultarControles;
  String _filtro = 'todos';
  final _busca = TextEditingController();

  @override
  void initState() {
    super.initState();
    _cargar(unirse: widget.unirseCursoId);
  }

  @override
  void dispose() {
    _reloj?.cancel();
    _ocultarControles?.cancel();
    _video?.dispose();
    _busca.dispose();
    SystemChrome.setPreferredOrientations(const [DeviceOrientation.portraitUp]);
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
    super.dispose();
  }

  Future<void> _cargar({int? unirse}) async {
    setState(() {
      _cargando = true;
      _aviso = '';
    });
    try {
      final cursos = await _api.misCursos();
      if (!mounted) return;
      setState(() {
        _cursos = cursos;
        _cargando = false;
      });
      if (unirse != null) {
        widget.onUnirseConsumido?.call();
        await _abrir(unirse, entrar: true);
      }
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _cargando = false;
        _aviso = error.toString().replaceFirst('Exception: ', '');
      });
    }
  }

  Future<void> _abrir(int cursoId, {bool entrar = false}) async {
    Map<String, dynamic>? curso;
    for (final item in _cursos) {
      if ((item['id'] as num?)?.toInt() == cursoId) {
        curso = item;
        break;
      }
    }
    if (curso == null) {
      setState(() => _aviso = 'No se encontró la capacitación.');
      return;
    }
    _reloj?.cancel();
    await _video?.dispose();
    _video = null;
    setState(() {
      _abierto = curso;
      _terminado = false;
      _enSala = false;
      _enviando = false;
      _veredicto = null;
      _nota = null;
      _preguntas = const [];
      _respuestas = const [];
      _aviso = '';
      _videoListo = false;
      _visto = Duration.zero;
    });
    if (entrar) {
      await _entrarSala();
      return;
    }
    if (curso['tieneVideo'] == true && curso['vencido'] != true) {
      await _cargarVideo(curso);
    }
  }

  Future<void> _cargarVideo(Map<String, dynamic> curso) async {
    try {
      final bytes = await _api.video((curso['businessId'] as num).toInt(), (curso['id'] as num).toInt());
      final controller = await controladorVideo(bytes, 'aula-${curso['id']}.mp4');
      await controller.initialize();
      await controller.setVolume(0.5);
      await controller.setPlaybackSpeed(1);
      controller.addListener(_alMoverVideo);
      if (!mounted) {
        await controller.dispose();
        return;
      }
      setState(() {
        _video = controller;
        _videoListo = true;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _aviso = 'No se pudo abrir el video.');
    }
  }

  void _alMoverVideo() {
    final video = _video;
    if (video == null || !video.value.isInitialized || _ajustando) return;
    if (video.value.playbackSpeed != 1) {
      video.setPlaybackSpeed(1);
    }
    final posicion = video.value.position;
    if (posicion > _visto + const Duration(milliseconds: 450)) {
      _ajustando = true;
      video.seekTo(_visto).whenComplete(() => _ajustando = false);
      return;
    }
    if (posicion > _visto) _visto = posicion;
    final duracion = video.value.duration;
    if (!_terminado && duracion > Duration.zero && posicion >= duracion - const Duration(milliseconds: 350)) {
      _terminarVideo();
    }
  }

  Future<void> _terminarVideo() async {
    if (_terminado) return;
    final curso = _abierto;
    setState(() => _terminado = true);
    await _video?.pause();
    if (curso == null || curso['estado'] == 'Cumplió' || _veredicto == 'reprobado') return;
    try {
      await _api.videoVisto((curso['id'] as num).toInt());
    } catch (_) {}
    await _cargarPreguntas();
  }

  Future<void> _cargarPreguntas() async {
    final curso = _abierto;
    if (curso == null) return;
    try {
      final preguntas = await _api.iniciarEvaluacion((curso['id'] as num).toInt());
      if (!mounted) return;
      setState(() {
        _preguntas = preguntas;
        _respuestas = List<int?>.filled(preguntas.length, null);
      });
      if (preguntas.isEmpty) return;
      final minutos = (curso['minutosEvaluacion'] as num?)?.toInt() ?? 10;
      _segundos = (minutos < 1 ? 1 : minutos) * 60;
      _reloj?.cancel();
      _reloj = Timer.periodic(const Duration(seconds: 1), (_) {
        if (!mounted) return;
        if (_segundos <= 1) {
          _reloj?.cancel();
          _enviar();
          return;
        }
        setState(() => _segundos -= 1);
      });
      setState(() {});
    } catch (error) {
      if (!mounted) return;
      setState(() => _aviso = error.toString().replaceFirst('Exception: ', ''));
    }
  }

  Future<void> _entrarSala() async {
    final curso = _abierto;
    if (curso == null) return;
    final businessId = (curso['businessId'] as num).toInt();
    final cursoId = (curso['id'] as num).toInt();
    final url = Uri.parse('https://charla.improvement-solution.com/ImprovementSolutions${businessId}c$cursoId');
    setState(() => _enSala = true);
    await launchUrl(url, mode: LaunchMode.externalApplication);
    try {
      await _api.ingreso(cursoId);
    } catch (error) {
      if (!mounted) return;
      setState(() => _aviso = error.toString().replaceFirst('Exception: ', ''));
    }
  }

  Future<void> _salirSala() async {
    setState(() {
      _enSala = false;
      _terminado = true;
    });
    final curso = _abierto;
    if (curso != null && curso['estado'] != 'Cumplió') await _cargarPreguntas();
  }

  Future<void> _abrirPdf() async {
    final curso = _abierto;
    if (curso == null || curso['tienePdf'] != true) return;
    try {
      final bytes = await _api.material((curso['businessId'] as num).toInt(), (curso['id'] as num).toInt());
      await abrirArchivo(bytes, 'application/pdf', 'presentacion-${curso['id']}.pdf');
    } catch (_) {
      if (!mounted) return;
      setState(() => _aviso = 'No se pudo abrir la presentación.');
    }
  }

  Future<void> _repetir() async {
    _reloj?.cancel();
    setState(() {
      _terminado = false;
      _veredicto = null;
      _nota = null;
      _preguntas = const [];
      _respuestas = const [];
      _aviso = '';
      _visto = Duration.zero;
    });
    final video = _video;
    if (video == null) return;
    await video.seekTo(Duration.zero);
    await video.play();
  }

  Future<void> _enviar() async {
    final curso = _abierto;
    if (curso == null || _veredicto != null || _enviando) return;
    _reloj?.cancel();
    setState(() {
      _enviando = true;
      _aviso = '';
    });
    try {
      final res = await _api.responder((curso['id'] as num).toInt(), _respuestas);
      if (!mounted) return;
      final nota = (res['nota'] as num?)?.toInt() ?? 0;
      final aprobada = res['estado'] == 'CUMPLIO';
      final usados = (res['intentosUsados'] as num?)?.toInt() ?? 0;
      final intentos = (res['intentos'] as num?)?.toInt() ?? 1;
      setState(() {
        _nota = nota;
        _enviando = false;
        curso['nota'] = nota;
        if (aprobada) {
          _veredicto = 'aprobado';
          curso['estado'] = 'Cumplió';
        } else if (usados < intentos) {
          _veredicto = 'reintentar';
          curso['estado'] = 'No alcanzó';
        } else {
          _veredicto = 'reprobado';
          curso['estado'] = 'No alcanzó';
        }
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _enviando = false;
        _aviso = error.toString().replaceFirst('Exception: ', '');
      });
    }
  }

  VideoPlayerController? get video => _video;

  bool get _faltan {
    if (_respuestas.length != _preguntas.length) return true;
    return _respuestas.any((respuesta) => respuesta == null);
  }

  String get _relojLabel {
    final minutos = _segundos ~/ 60;
    final segundos = _segundos % 60;
    return '$minutos:${segundos.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    if (_cargando) {
      return const Center(child: CircularProgressIndicator(color: Color(0xFF1D4ED8)));
    }
    final curso = _abierto;
    if (curso == null) return _lista();
    return _detalle(curso);
  }

  int _cuantos(String filtro) {
    return _cursos.where((curso) => _pasaFiltro(curso, filtro)).length;
  }

  bool _pasaFiltro(Map<String, dynamic> curso, String filtro) {
    final estado = (curso['estado'] ?? 'Pendiente').toString();
    if (filtro == 'pendiente') return estado == 'Pendiente';
    if (filtro == 'no') return estado == 'No alcanzó';
    if (filtro == 'ok') return estado == 'Cumplió';
    return true;
  }

  List<Map<String, dynamic>> get _visibles {
    final texto = _busca.text.trim().toLowerCase();
    return _cursos.where((curso) {
      if (!_pasaFiltro(curso, _filtro)) return false;
      if (texto.isEmpty) return true;
      final titulo = (curso['titulo'] ?? '').toString().toLowerCase();
      final area = (curso['area'] ?? '').toString().toLowerCase();
      return titulo.contains(texto) || area.contains(texto);
    }).toList();
  }

  Widget _lista() {
    final cursos = _visibles;
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 28),
      children: [
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: const Color(0xFFEFF6FF),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: const Color(0xFFDBEAFE)),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Icon(Icons.info_outline, size: 16, color: Color(0xFF2563EB)),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  'Estas son tus capacitaciones. Los certificados emitidos siguen estando disponibles en el módulo Cursos.',
                  style: _estilo(size: 12, color: const Color(0xFF475569)),
                ),
              ),
            ],
          ),
        ),
        if (_aviso.isNotEmpty) ...[
          const SizedBox(height: 8),
          Text(_aviso, style: _estilo(size: 13, color: const Color(0xFFB42318))),
        ],
        const SizedBox(height: 12),
        TextField(
          controller: _busca,
          onChanged: (_) => setState(() {}),
          style: _estilo(size: 13),
          decoration: InputDecoration(
            hintText: 'Buscar tema, área o curso...',
            hintStyle: _estilo(size: 13, color: const Color(0xFF94A3B8)),
            prefixIcon: const Icon(Icons.search, size: 18, color: Color(0xFF94A3B8)),
            filled: true,
            fillColor: Colors.white,
            isDense: true,
            contentPadding: const EdgeInsets.symmetric(vertical: 12),
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
            enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
            focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFF2563EB), width: 1.4)),
          ),
        ),
        const SizedBox(height: 10),
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            children: [
              _filtroChip('todos', 'Todos', _cursos.length, const Color(0xFF0F172A), Colors.white),
              _filtroChip('pendiente', 'Pendientes', _cuantos('pendiente'), const Color(0xFFFEF3C7), const Color(0xFFB45309)),
              _filtroChip('no', 'No alcanzó', _cuantos('no'), const Color(0xFFFEE2E2), const Color(0xFFB42318)),
              _filtroChip('ok', 'Completados', _cuantos('ok'), const Color(0xFFD1FAE5), const Color(0xFF047857)),
            ],
          ),
        ),
        const SizedBox(height: 14),
        if (_cursos.isEmpty)
          Text('Todavía no tienes capacitaciones en el aula.', style: _estilo(size: 14, color: const Color(0xFF64748B)))
        else if (cursos.isEmpty)
          Text('Ninguna capacitación coincide con la búsqueda.', style: _estilo(size: 14, color: const Color(0xFF64748B)))
        else
          ...cursos.map(_tarjeta),
      ],
    );
  }

  Widget _filtroChip(String id, String etiqueta, int total, Color fondoConteo, Color tintaConteo) {
    final activo = _filtro == id;
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: Material(
        color: activo ? const Color(0xFF0F172A) : Colors.white,
        borderRadius: BorderRadius.circular(999),
        child: InkWell(
          borderRadius: BorderRadius.circular(999),
          onTap: () => setState(() => _filtro = id),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(999),
              border: Border.all(color: activo ? const Color(0xFF0F172A) : const Color(0xFFE2E8F0)),
            ),
            child: Row(
              children: [
                Text(etiqueta, style: _estilo(size: 12, weight: FontWeight.w700, color: activo ? Colors.white : const Color(0xFF475569))),
                const SizedBox(width: 6),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                  decoration: BoxDecoration(
                    color: activo ? Colors.white24 : fondoConteo,
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: Text('$total', style: _estilo(size: 10, weight: FontWeight.w800, color: activo ? Colors.white : tintaConteo)),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _tarjeta(Map<String, dynamic> curso) {
    final vivo = curso['modalidad'] == 'vivo' || curso['modalidad'] == 'charla';
    final vencido = curso['vencido'] == true;
    final estado = (curso['estado'] ?? 'Pendiente').toString();
    final cumplio = estado == 'Cumplió';
    final noAlcanzo = estado == 'No alcanzó';
    final area = (curso['area'] ?? '').toString();
    final limite = (curso['limite'] ?? '').toString();
    final duracion = (curso['duracion'] ?? '').toString();
    final barra = cumplio
        ? const Color(0xFF10B981)
        : noAlcanzo
            ? const Color(0xFFEF4444)
            : const Color(0xFFF59E0B);
    final borde = vencido || noAlcanzo
        ? const Color(0xFFFECACA)
        : cumplio
            ? const Color(0xFFD1FAE5)
            : const Color(0xFFFDE68A);
    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: borde),
        boxShadow: const [BoxShadow(color: Color(0x0A0F172A), blurRadius: 10, offset: Offset(0, 3))],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(height: 4, color: barra),
            Padding(
              padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      if (area.isNotEmpty)
                        Flexible(
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              color: const Color(0xFFEFF6FF),
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: const Color(0xFFDBEAFE)),
                            ),
                            child: Text(
                              area.toUpperCase(),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: _estilo(size: 11, weight: FontWeight.w700, color: const Color(0xFF1D4ED8)),
                            ),
                          ),
                        ),
                      const Spacer(),
                      _estadoPastilla(estado, vencido),
                    ],
                  ),
                  const SizedBox(height: 8),
                  InkWell(
                    onTap: () => _abrir((curso['id'] as num).toInt()),
                    child: Text((curso['titulo'] ?? '').toString(), style: _estilo(size: 16, weight: FontWeight.w800)),
                  ),
                  const SizedBox(height: 8),
                  if (limite.isNotEmpty && limite != 'Por definir')
                    Row(
                      children: [
                        Icon(Icons.calendar_today_outlined, size: 14, color: vencido ? const Color(0xFFB42318) : const Color(0xFFB45309)),
                        const SizedBox(width: 6),
                        Expanded(
                          child: Text(
                            'Fecha límite: $limite',
                            style: _estilo(size: 12, weight: FontWeight.w600, color: vencido ? const Color(0xFFB42318) : const Color(0xFFB45309)),
                          ),
                        ),
                      ],
                    ),
                  if (vivo) ...[
                    const SizedBox(height: 4),
                    Text('Fecha de la reunión ${fechaCharla(curso)}', style: _estilo(size: 12, color: const Color(0xFF64748B))),
                  ],
                  if (duracion.isNotEmpty) ...[
                    const SizedBox(height: 4),
                    Text(duracion, style: _estilo(size: 12, color: const Color(0xFF64748B))),
                  ],
                  if (cumplio && curso['nota'] != null) ...[
                    const SizedBox(height: 6),
                    Text('Aprobado con ${curso['nota']} de 100.', style: _estilo(size: 12, color: const Color(0xFF047857))),
                  ],
                  const SizedBox(height: 10),
                  const Divider(height: 1, color: Color(0xFFF1F5F9)),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          vivo
                              ? (curso['modalidad'] == 'charla' ? 'Charla virtual' : 'Reunión en vivo')
                              : cumplio
                                  ? 'El certificado está en Cursos'
                                  : 'Video',
                          style: _estilo(size: 11, weight: FontWeight.w600, color: const Color(0xFF94A3B8)),
                        ),
                      ),
                      if (vencido)
                        Text('Bloqueada', style: _estilo(size: 12, weight: FontWeight.w800, color: const Color(0xFFB42318)))
                      else if (vivo)
                        _botonTarjeta('Unirme a la charla', () => _abrir((curso['id'] as num).toInt(), entrar: true), oscuro: false)
                      else if (cumplio && widget.onVerCursos != null)
                        _botonTarjeta('Ver en Cursos', widget.onVerCursos!, oscuro: true)
                      else
                        _botonTarjeta(cumplio ? 'Abrir' : 'Iniciar capacitación', () => _abrir((curso['id'] as num).toInt()), oscuro: cumplio),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _estadoPastilla(String estado, bool vencido) {
    final color = estado == 'Cumplió'
        ? const Color(0xFF047857)
        : estado == 'No alcanzó'
            ? const Color(0xFFB42318)
            : const Color(0xFFB45309);
    final fondo = estado == 'Cumplió'
        ? const Color(0xFFECFDF5)
        : estado == 'No alcanzó'
            ? const Color(0xFFFEF2F2)
            : const Color(0xFFFFFBEB);
    final borde = estado == 'Cumplió'
        ? const Color(0xFFA7F3D0)
        : estado == 'No alcanzó'
            ? const Color(0xFFFECACA)
            : const Color(0xFFFDE68A);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(color: fondo, borderRadius: BorderRadius.circular(999), border: Border.all(color: borde)),
      child: Text(vencido && estado == 'Pendiente' ? 'Vencida' : estado, style: _estilo(size: 11, weight: FontWeight.w800, color: color)),
    );
  }

  Widget _botonTarjeta(String texto, VoidCallback onTap, {required bool oscuro}) {
    return FilledButton(
      onPressed: onTap,
      style: FilledButton.styleFrom(
        backgroundColor: oscuro ? const Color(0xFF0F172A) : const Color(0xFF2563EB),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        minimumSize: Size.zero,
        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
      child: Text(texto, style: _estilo(size: 12, weight: FontWeight.w700, color: Colors.white)),
    );
  }

  Widget _detalle(Map<String, dynamic> curso) {
    final vencido = curso['vencido'] == true;
    final tieneVideo = curso['tieneVideo'] == true;
    final vivo = curso['modalidad'] == 'vivo' || curso['modalidad'] == 'charla';
    final limite = (curso['limite'] ?? '').toString();
    final area = (curso['area'] ?? '').toString();
    final estado = (curso['estado'] ?? 'Pendiente').toString();
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 28),
      children: [
        Align(
          alignment: Alignment.centerLeft,
          child: TextButton.icon(
            onPressed: () => setState(() => _abierto = null),
            style: TextButton.styleFrom(foregroundColor: const Color(0xFF475569), padding: EdgeInsets.zero),
            icon: const Icon(Icons.chevron_left, size: 22),
            label: Text('Capacitaciones', style: _estilo(size: 13, weight: FontWeight.w700, color: const Color(0xFF475569))),
          ),
        ),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          crossAxisAlignment: WrapCrossAlignment.center,
          children: [
            if (area.isNotEmpty)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: const Color(0xFFEFF6FF),
                  borderRadius: BorderRadius.circular(999),
                  border: Border.all(color: const Color(0xFFDBEAFE)),
                ),
                child: Text(area.toUpperCase(), style: _estilo(size: 11, weight: FontWeight.w700, color: const Color(0xFF1D4ED8))),
              ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(color: const Color(0xFFF1F5F9), borderRadius: BorderRadius.circular(6)),
              child: Text(estado, style: _estilo(size: 12, weight: FontWeight.w600, color: const Color(0xFF64748B))),
            ),
          ],
        ),
        const SizedBox(height: 10),
        Text((curso['titulo'] ?? '').toString(), style: _estilo(size: 20, weight: FontWeight.w800)),
        if (_aviso.isNotEmpty) ...[
          const SizedBox(height: 8),
          Text(_aviso, style: _estilo(size: 13, color: const Color(0xFFB42318))),
        ],
        if (limite.isNotEmpty && limite != 'Por definir') ...[
          const SizedBox(height: 12),
          _fechaLimite(limite, vencido),
        ],
        if (vencido)
          Padding(
            padding: const EdgeInsets.only(top: 10),
            child: Text(
              'La fecha límite ya se cumplió. Esta capacitación está bloqueada.',
              style: _estilo(weight: FontWeight.w700, color: const Color(0xFFB42318)),
            ),
          ),
        if (!vencido) ...[
          if (tieneVideo && !_enSala) ...[
            const SizedBox(height: 14),
            _reproductor(),
            const SizedBox(height: 8),
            _instructor(curso),
            const SizedBox(height: 12),
            _progreso(),
          ],
          if (vivo && tieneVideo && !_enSala)
            _avisoCaja(
              'El mismo tema en vivo',
              'Si el instructor está presentando ahora, entras a la reunión. El video grabado sigue aquí. Las preguntas salen solo cuando el video termina.',
              'Unirme a la clase',
              _entrarSala,
            ),
          if (vivo && tieneVideo && _enSala)
            _avisoCaja(
              'Charla abierta',
              'La charla Improvement Solutions se abrió en otra ventana. Ahí tiene cámara, micrófono, chat y mano alzada.',
              'Volver a abrir la charla',
              _entrarSala,
              secundario: 'Volver al video',
              onSecundario: () async {
                setState(() => _enSala = false);
                final actual = _abierto;
                if (actual != null && actual['tieneVideo'] == true && _video == null) {
                  await _cargarVideo(actual);
                }
              },
            ),
          if (vivo && !tieneVideo && !_enSala)
            _avisoCaja(
              curso['modalidad'] == 'charla' ? 'Charla virtual' : 'Clase en vivo',
              'Fecha de la reunión ${fechaCharla(curso)}${_textoInstructor(curso)}',
              'Unirme a la charla',
              _entrarSala,
            ),
          if (vivo && !tieneVideo && _enSala)
            _avisoCaja(
              'Charla abierta',
              'La charla se abrió en otra ventana. Cuando termine, pulse salir para las preguntas, si las hay.',
              'Volver a abrir la charla',
              _entrarSala,
              secundario: 'Salir de la clase',
              onSecundario: _salirSala,
            ),
          if (curso['tienePdf'] == true) ...[
            const SizedBox(height: 16),
            _material(curso),
          ],
          const SizedBox(height: 16),
          _evaluacion(curso),
          if (_terminado && _preguntas.isEmpty && _veredicto == null)
            Padding(
              padding: const EdgeInsets.only(top: 10),
              child: Text('Terminaste. Esta capacitación no tiene evaluación.', style: _estilo(size: 13, color: const Color(0xFF64748B))),
            ),
          if (curso['estado'] == 'Cumplió' && _nota == null && _veredicto == null)
            Padding(
              padding: const EdgeInsets.only(top: 10),
              child: Text(
                'Ya cumpliste esta capacitación con ${curso['nota'] ?? '—'} puntos.',
                style: _estilo(weight: FontWeight.w700, color: const Color(0xFF059669)),
              ),
            ),
          if (_veredicto == 'aprobado')
            Padding(
              padding: const EdgeInsets.only(top: 10),
              child: Text(
                'Aprobado. Tu nota es $_nota de 100. El mínimo era ${curso['notaMinima']}.',
                style: _estilo(weight: FontWeight.w800, color: const Color(0xFF059669)),
              ),
            ),
          if (_veredicto == 'reintentar') ...[
            Padding(
              padding: const EdgeInsets.only(top: 10),
              child: Text(
                'No aprobaste. Tu nota es $_nota de 100. Vuelve a revisar el video y responde otra vez.',
                style: _estilo(weight: FontWeight.w700, color: const Color(0xFFD97706)),
              ),
            ),
            TextButton(onPressed: _repetir, child: const Text('Volver a ver el video')),
          ],
          if (_veredicto == 'reprobado')
            Padding(
              padding: const EdgeInsets.only(top: 10),
              child: Text(
                'Reprobado. Tu nota es $_nota de 100. Póngase en contacto con su tutor.',
                style: _estilo(weight: FontWeight.w800, color: const Color(0xFFB42318)),
              ),
            ),
          if (_terminado && _preguntas.isNotEmpty && _veredicto == null) ...[
            const SizedBox(height: 14),
            _examen(curso),
          ],
        ],
      ],
    );
  }

  Widget _fechaLimite(String limite, bool vencido) {
    final fondo = vencido ? const Color(0xFFFEF2F2) : const Color(0xFFFFFBEB);
    final borde = vencido ? const Color(0xFFFECACA) : const Color(0xFFFDE68A);
    final tinta = vencido ? const Color(0xFFB42318) : const Color(0xFF92400E);
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: fondo,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: borde),
      ),
      child: Row(
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(color: vencido ? const Color(0xFFFEE2E2) : const Color(0xFFFEF3C7), borderRadius: BorderRadius.circular(10)),
            child: Icon(Icons.schedule, size: 18, color: tinta),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Fecha límite de la evaluación', style: _estilo(size: 12, weight: FontWeight.w800, color: tinta)),
                Text(limite, style: _estilo(size: 13, weight: FontWeight.w600, color: tinta)),
              ],
            ),
          ),
        ],
      ),
    );
  }

  String _textoInstructor(Map<String, dynamic> curso) {
    final nombre = (curso['instructor'] ?? '').toString().trim();
    return nombre.isEmpty ? '' : '. Instructor: $nombre';
  }

  Widget _instructor(Map<String, dynamic> curso) {
    final nombre = (curso['instructor'] ?? '').toString().trim();
    if (nombre.isEmpty) return const SizedBox.shrink();
    return Row(
      children: [
        const Icon(Icons.person_outline, size: 16, color: Color(0xFF94A3B8)),
        const SizedBox(width: 6),
        Text('Instructor: ', style: _estilo(size: 12, color: const Color(0xFF64748B))),
        Flexible(child: Text(nombre, style: _estilo(size: 12, weight: FontWeight.w700, color: const Color(0xFF334155)))),
      ],
    );
  }

  Widget _progreso() {
    final video = _video;
    if (video == null) return const SizedBox.shrink();
    return ValueListenableBuilder<VideoPlayerValue>(
      valueListenable: video,
      builder: (context, value, _) {
        final total = value.duration.inMilliseconds;
        final visto = value.position.inMilliseconds.clamp(0, total == 0 ? 0 : total);
        final avance = total == 0 ? 0.0 : visto / total;
        final porcentaje = (avance * 100).round();
        return Container(
          padding: const EdgeInsets.all(16),
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
                  Text('Progreso de la sesión', style: _estilo(size: 12, weight: FontWeight.w700, color: const Color(0xFF334155))),
                  const Spacer(),
                  Text('$porcentaje% completado', style: _estilo(size: 12, weight: FontWeight.w700, color: const Color(0xFF2563EB))),
                ],
              ),
              const SizedBox(height: 8),
              ClipRRect(
                borderRadius: BorderRadius.circular(999),
                child: LinearProgressIndicator(
                  value: avance,
                  minHeight: 8,
                  backgroundColor: const Color(0xFFF1F5F9),
                  color: const Color(0xFF2563EB),
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'Las preguntas se habilitan cuando termina el video.',
                style: _estilo(size: 11, color: const Color(0xFF94A3B8)),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _evaluacion(Map<String, dynamic> curso) {
    final minutos = (curso['minutosEvaluacion'] as num?)?.toInt() ?? 10;
    final minimo = curso['notaMinima'] ?? 80;
    final cantidad = (curso['porTrabajador'] as num?)?.toInt();
    final abierta = _terminado && _preguntas.isNotEmpty && _veredicto == null;
    final esperaVideo = curso['tieneVideo'] == true;
    final detalle = cantidad == null || cantidad < 1
        ? 'Nota mínima $minimo%'
        : '$cantidad preguntas • Nota mínima $minimo%';
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(18),
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFF0F172A), Color(0xFF1E293B)],
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.schedule, size: 16, color: Color(0xFFFBBF24)),
                        const SizedBox(width: 6),
                        Text('Paso requerido', style: _estilo(size: 12, weight: FontWeight.w700, color: const Color(0xFFFBBF24))),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text('Evaluación de conocimiento', style: _estilo(size: 14, weight: FontWeight.w800, color: Colors.white)),
                    const SizedBox(height: 2),
                    Text(detalle, style: _estilo(size: 12, color: const Color(0xFFCBD5E1))),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(color: const Color(0x1AFFFFFF), borderRadius: BorderRadius.circular(8)),
                child: Text(abierta ? _relojLabel : '$minutos min', style: _estilo(size: 12, weight: FontWeight.w700, color: const Color(0xFFCBD5E1))),
              ),
            ],
          ),
          const SizedBox(height: 14),
          SizedBox(
            width: double.infinity,
            child: FilledButton(
              onPressed: null,
              style: FilledButton.styleFrom(
                backgroundColor: abierta ? const Color(0xFF1D4ED8) : const Color(0xFF334155),
                disabledBackgroundColor: abierta ? const Color(0xFF1D4ED8) : const Color(0xFF334155),
                disabledForegroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              child: Text(
                abierta
                    ? 'Responda las preguntas de abajo'
                    : esperaVideo
                        ? 'Se habilita al terminar el video'
                        : 'Se habilita al salir de la charla',
                style: _estilo(size: 14, weight: FontWeight.w700, color: Colors.white),
              ),
            ),
          ),
        ],
      ),
    );
  }

  void _programarOcultar() {
    _ocultarControles?.cancel();
    final video = _video;
    if (video == null || !video.value.isPlaying) return;
    _ocultarControles = Timer(const Duration(milliseconds: 1800), () {
      if (mounted && (_video?.value.isPlaying ?? false)) {
        setState(() => _verControles = false);
      }
    });
  }

  void _tocarVideo() {
    final video = _video;
    if (video == null) return;
    if (!_verControles) {
      setState(() => _verControles = true);
      _programarOcultar();
      return;
    }
    if (video.value.isPlaying) {
      video.pause();
      _ocultarControles?.cancel();
      setState(() => _verControles = true);
    } else {
      video.play();
      setState(() => _verControles = true);
      _programarOcultar();
    }
  }

  Future<void> _abrirGrande() async {
    final video = _video;
    if (video == null || !mounted) return;
    setState(() => _enGrande = true);
    await SystemChrome.setPreferredOrientations(const [
      DeviceOrientation.landscapeLeft,
      DeviceOrientation.landscapeRight,
    ]);
    await SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
    if (!mounted) return;
    await Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => _VideoGrande(
          video: video,
          silencio: _silencio,
          onSilencio: (silencio) async {
            _silencio = silencio;
            await video.setVolume(silencio ? 0 : 0.5);
          },
        ),
      ),
    );
    await SystemChrome.setPreferredOrientations(const [DeviceOrientation.portraitUp]);
    await SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
    if (mounted) {
      setState(() => _enGrande = false);
      _programarOcultar();
    }
  }

  Widget _reproductor() {
    final video = _video;
    if (!_videoListo || video == null || !video.value.isInitialized || _enGrande) {
      return Container(
        height: 190,
        alignment: Alignment.center,
        decoration: BoxDecoration(color: const Color(0xFF0F172A), borderRadius: BorderRadius.circular(16)),
        child: _enGrande
            ? Text('Pantalla completa', style: _estilo(size: 13, color: Colors.white))
            : const CircularProgressIndicator(color: Colors.white),
      );
    }
    return LayoutBuilder(
      builder: (context, constraints) {
        final relacion = video.value.aspectRatio == 0 ? 16 / 9 : video.value.aspectRatio;
        final alto = (constraints.maxWidth / relacion).clamp(150.0, 210.0);
        return ValueListenableBuilder<VideoPlayerValue>(
          valueListenable: video,
          builder: (context, value, _) {
            final total = value.duration.inMilliseconds;
            final visto = value.position.inMilliseconds.clamp(0, total == 0 ? 0 : total);
            final avance = total == 0 ? 0.0 : visto / total;
            return ClipRRect(
              borderRadius: BorderRadius.circular(16),
              child: GestureDetector(
                onTap: _tocarVideo,
                child: SizedBox(
                  height: alto,
                  width: double.infinity,
                  child: ColoredBox(
                    color: const Color(0xFF0F172A),
                    child: Stack(
                      alignment: Alignment.center,
                      children: [
                        Center(
                          child: SizedBox(
                            height: alto,
                            width: alto * relacion,
                            child: VideoPlayer(video),
                          ),
                        ),
                        if (_verControles) ...[
                          Positioned.fill(
                            child: DecoratedBox(
                              decoration: BoxDecoration(
                                gradient: LinearGradient(
                                  begin: Alignment.topCenter,
                                  end: Alignment.bottomCenter,
                                  colors: [Colors.transparent, Colors.black.withValues(alpha: 0.55)],
                                ),
                              ),
                            ),
                          ),
                          Material(
                            color: const Color(0xE62563EB),
                            shape: const CircleBorder(),
                            child: InkWell(
                              customBorder: const CircleBorder(),
                              onTap: _tocarVideo,
                              child: SizedBox(
                                width: 48,
                                height: 48,
                                child: Icon(value.isPlaying ? Icons.pause : Icons.play_arrow, color: Colors.white, size: 28),
                              ),
                            ),
                          ),
                          Positioned(
                            left: 10,
                            right: 4,
                            bottom: 2,
                            child: Row(
                              children: [
                                Expanded(
                                  child: ClipRRect(
                                    borderRadius: BorderRadius.circular(999),
                                    child: LinearProgressIndicator(
                                      value: avance,
                                      minHeight: 3,
                                      backgroundColor: Colors.white24,
                                      color: const Color(0xFF3B82F6),
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Text(
                                  '${_tiempo(value.position)} / ${_tiempo(value.duration)}',
                                  style: _estilo(size: 10, weight: FontWeight.w700, color: Colors.white),
                                ),
                                IconButton(
                                  visualDensity: VisualDensity.compact,
                                  padding: EdgeInsets.zero,
                                  constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
                                  onPressed: () async {
                                    _silencio = !_silencio;
                                    await video.setVolume(_silencio ? 0 : 0.5);
                                    if (mounted) setState(() {});
                                  },
                                  icon: Icon(_silencio ? Icons.volume_off : Icons.volume_up, color: Colors.white, size: 18),
                                  tooltip: 'Volumen',
                                ),
                                IconButton(
                                  visualDensity: VisualDensity.compact,
                                  padding: EdgeInsets.zero,
                                  constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
                                  onPressed: _abrirGrande,
                                  icon: const Icon(Icons.screen_rotation, color: Colors.white, size: 18),
                                  tooltip: 'Pantalla grande',
                                ),
                              ],
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                ),
              ),
            );
          },
        );
      },
    );
  }

  Widget _material(Map<String, dynamic> curso) {
    final nombre = (curso['material'] ?? 'Presentación del módulo').toString();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('MATERIAL DE APOYO', style: _estilo(size: 11, weight: FontWeight.w800, color: const Color(0xFF94A3B8))),
        const SizedBox(height: 8),
        Material(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          child: InkWell(
            borderRadius: BorderRadius.circular(14),
            onTap: _abrirPdf,
            child: Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Row(
                children: [
                  Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      color: const Color(0xFFEFF6FF),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: const Color(0xFFDBEAFE)),
                    ),
                    child: const Icon(Icons.description_outlined, color: Color(0xFF2563EB), size: 20),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(nombre, style: _estilo(size: 14, weight: FontWeight.w700)),
                        Text('Presentación • PDF', style: _estilo(size: 12, color: const Color(0xFF94A3B8))),
                      ],
                    ),
                  ),
                  const Icon(Icons.download_outlined, color: Color(0xFF94A3B8)),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _examen(Map<String, dynamic> curso) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(child: Text('Por favor, responda las siguientes preguntas', style: _estilo(size: 16, weight: FontWeight.w800))),
            Text('Tiempo $_relojLabel', style: _estilo(weight: FontWeight.w800, color: const Color(0xFF1D4ED8))),
          ],
        ),
        const SizedBox(height: 6),
        Text(
          'Tiene ${curso['minutosEvaluacion'] ?? 10} minutos. Si el tiempo se acaba, la evaluación se envía con lo que haya marcado.',
          style: _estilo(size: 12, color: const Color(0xFF64748B)),
        ),
        const SizedBox(height: 10),
        ...List.generate(_preguntas.length, (indice) {
          final pregunta = _preguntas[indice];
          final opciones = (pregunta['opciones'] as List?)?.map((e) => e.toString()).toList() ?? const <String>[];
          return Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('${indice + 1}. ${pregunta['texto'] ?? ''}', style: _estilo(weight: FontWeight.w700)),
                const SizedBox(height: 6),
                ...List.generate(opciones.length, (opcion) {
                  final marcada = _respuestas[indice] == opcion;
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 6),
                    child: OutlinedButton(
                      onPressed: () => setState(() => _respuestas[indice] = opcion),
                      style: OutlinedButton.styleFrom(
                        backgroundColor: marcada ? const Color(0xFF1D4ED8) : Colors.white,
                        foregroundColor: marcada ? Colors.white : const Color(0xFF0F172A),
                        alignment: Alignment.centerLeft,
                      ),
                      child: Text(opciones[opcion], style: _estilo(color: marcada ? Colors.white : const Color(0xFF0F172A))),
                    ),
                  );
                }),
              ],
            ),
          );
        }),
        FilledButton(
          onPressed: _faltan || _enviando ? null : _enviar,
          style: FilledButton.styleFrom(backgroundColor: const Color(0xFF1D4ED8)),
          child: Text(_enviando ? 'Enviando…' : 'Enviar respuestas'),
        ),
      ],
    );
  }

  Widget _avisoCaja(String titulo, String texto, String accion, VoidCallback onTap, {String? secundario, VoidCallback? onSecundario}) {
    return Container(
      margin: const EdgeInsets.symmetric(vertical: 8),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFFEFF6FF),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(titulo, style: _estilo(weight: FontWeight.w800)),
          const SizedBox(height: 4),
          Text(texto, style: _estilo(size: 13, color: const Color(0xFF334155))),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            children: [
              FilledButton(
                onPressed: onTap,
                style: FilledButton.styleFrom(backgroundColor: const Color(0xFF1D4ED8)),
                child: Text(accion),
              ),
              if (secundario != null) TextButton(onPressed: onSecundario, child: Text(secundario)),
            ],
          ),
        ],
      ),
    );
  }

  String _tiempo(Duration valor) {
    final minutos = valor.inMinutes;
    final segundos = valor.inSeconds % 60;
    return '$minutos:${segundos.toString().padLeft(2, '0')}';
  }
}

class _VideoGrande extends StatefulWidget {
  final VideoPlayerController video;
  final bool silencio;
  final Future<void> Function(bool silencio) onSilencio;

  const _VideoGrande({required this.video, required this.silencio, required this.onSilencio});

  @override
  State<_VideoGrande> createState() => _VideoGrandeState();
}

class _VideoGrandeState extends State<_VideoGrande> {
  late bool _silencio = widget.silencio;
  bool _ver = true;
  Timer? _ocultar;

  @override
  void initState() {
    super.initState();
    _programar();
  }

  @override
  void dispose() {
    _ocultar?.cancel();
    super.dispose();
  }

  void _programar() {
    _ocultar?.cancel();
    if (!widget.video.value.isPlaying) return;
    _ocultar = Timer(const Duration(milliseconds: 1800), () {
      if (mounted && widget.video.value.isPlaying) setState(() => _ver = false);
    });
  }

  void _tocar() {
    final video = widget.video;
    if (!_ver) {
      setState(() => _ver = true);
      _programar();
      return;
    }
    if (video.value.isPlaying) {
      video.pause();
      _ocultar?.cancel();
      setState(() => _ver = true);
    } else {
      video.play();
      setState(() => _ver = true);
      _programar();
    }
  }

  String _reloj(Duration valor) {
    final minutos = valor.inMinutes;
    final segundos = valor.inSeconds % 60;
    return '$minutos:${segundos.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    final video = widget.video;
    return Scaffold(
      backgroundColor: Colors.black,
      body: GestureDetector(
        onTap: _tocar,
        child: ValueListenableBuilder<VideoPlayerValue>(
          valueListenable: video,
          builder: (context, value, _) {
            final relacion = value.aspectRatio == 0 ? 16 / 9 : value.aspectRatio;
            return Stack(
              alignment: Alignment.center,
              children: [
                Center(child: AspectRatio(aspectRatio: relacion, child: VideoPlayer(video))),
                if (_ver) ...[
                  Material(
                    color: const Color(0xE62563EB),
                    shape: const CircleBorder(),
                    child: InkWell(
                      customBorder: const CircleBorder(),
                      onTap: _tocar,
                      child: SizedBox(
                        width: 64,
                        height: 64,
                        child: Icon(value.isPlaying ? Icons.pause : Icons.play_arrow, color: Colors.white, size: 36),
                      ),
                    ),
                  ),
                  Positioned(
                    top: 8,
                    left: 8,
                    child: SafeArea(
                      child: IconButton(
                        onPressed: () => Navigator.pop(context),
                        icon: const Icon(Icons.close, color: Colors.white),
                      ),
                    ),
                  ),
                  Positioned(
                    left: 16,
                    right: 8,
                    bottom: 8,
                    child: SafeArea(
                      child: Row(
                        children: [
                          Text(
                            '${_reloj(value.position)} / ${_reloj(value.duration)}',
                            style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w700),
                          ),
                          const Spacer(),
                          IconButton(
                            onPressed: () async {
                              final siguiente = !_silencio;
                              setState(() => _silencio = siguiente);
                              await widget.onSilencio(siguiente);
                            },
                            icon: Icon(_silencio ? Icons.volume_off : Icons.volume_up, color: Colors.white),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ],
            );
          },
        ),
      ),
    );
  }
}

String fechaCharla(Map<String, dynamic> curso) {
  final hora = curso['hora'];
  if (hora == null) return 'Por definir';
  if (hora is List && hora.length >= 3) {
    final anio = hora[0];
    final mes = hora[1].toString().padLeft(2, '0');
    final dia = hora[2].toString().padLeft(2, '0');
    final hh = hora.length > 3 ? hora[3].toString().padLeft(2, '0') : '00';
    final mm = hora.length > 4 ? hora[4].toString().padLeft(2, '0') : '00';
    return '$anio-$mes-$dia $hh:$mm';
  }
  return hora.toString().replaceFirst('T', ' ').split('.').first;
}

TextStyle _estilo({
  double size = 14,
  FontWeight weight = FontWeight.w500,
  Color color = const Color(0xFF0F172A),
}) {
  return GoogleFonts.plusJakartaSans(fontSize: size, fontWeight: weight, color: color, height: 1.3);
}
