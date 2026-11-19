import 'dart:async';

import 'package:flutter/material.dart';
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

  const AulaVirtualPanel({super.key, this.unirseCursoId, this.onUnirseConsumido});

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

  @override
  void initState() {
    super.initState();
    _cargar(unirse: widget.unirseCursoId);
  }

  @override
  void dispose() {
    _reloj?.cancel();
    _video?.dispose();
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
    setState(() => _enviando = true);
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

  Widget _lista() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text('Estas son tus capacitaciones. Los certificados siguen en Cursos.', style: _estilo(size: 13, color: const Color(0xFF64748B))),
        if (_aviso.isNotEmpty) ...[
          const SizedBox(height: 8),
          Text(_aviso, style: _estilo(size: 13, color: const Color(0xFFB42318))),
        ],
        const SizedBox(height: 12),
        if (_cursos.isEmpty)
          Text('Todavía no tienes capacitaciones en el aula.', style: _estilo(size: 14, color: const Color(0xFF64748B)))
        else
          ..._cursos.map(_tarjeta),
      ],
    );
  }

  Widget _tarjeta(Map<String, dynamic> curso) {
    final vivo = curso['modalidad'] == 'vivo' || curso['modalidad'] == 'charla';
    final vencido = curso['vencido'] == true;
    final cumplio = curso['estado'] == 'Cumplió';
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFF1F5F9)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          InkWell(
            onTap: () => _abrir((curso['id'] as num).toInt()),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text((curso['area'] ?? '').toString(), style: _estilo(size: 12, color: const Color(0xFF64748B))),
                Text((curso['titulo'] ?? '').toString(), style: _estilo(size: 16, weight: FontWeight.w800)),
                if ((curso['limite'] ?? '').toString().isNotEmpty && curso['limite'] != 'Por definir')
                  Text('Fecha límite ${curso['limite']}', style: _estilo(size: 12, color: const Color(0xFFB42318))),
                if (vivo) Text('Fecha de la reunión ${fechaCharla(curso)}', style: _estilo(size: 12, color: const Color(0xFF64748B))),
              ],
            ),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              if (vivo && !vencido)
                FilledButton(
                  onPressed: () => _abrir((curso['id'] as num).toInt(), entrar: true),
                  style: FilledButton.styleFrom(backgroundColor: const Color(0xFF1D4ED8)),
                  child: const Text('Unirme a la charla'),
                ),
              const Spacer(),
              if (!vivo)
                Text(
                  (curso['estado'] ?? 'Pendiente').toString(),
                  style: _estilo(size: 12, weight: FontWeight.w800, color: cumplio ? const Color(0xFF059669) : const Color(0xFFD97706)),
                ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _detalle(Map<String, dynamic> curso) {
    final vencido = curso['vencido'] == true;
    final tieneVideo = curso['tieneVideo'] == true;
    final vivo = curso['modalidad'] == 'vivo' || curso['modalidad'] == 'charla';
    final limite = (curso['limite'] ?? '').toString();
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text((curso['area'] ?? '').toString(), style: _estilo(size: 12, color: const Color(0xFF64748B))),
                  Text((curso['titulo'] ?? '').toString(), style: _estilo(size: 18, weight: FontWeight.w800)),
                ],
              ),
            ),
            TextButton(onPressed: () => setState(() => _abierto = null), child: const Text('Volver')),
          ],
        ),
        if (_aviso.isNotEmpty) Text(_aviso, style: _estilo(size: 13, color: const Color(0xFFB42318))),
        if (limite.isNotEmpty && limite != 'Por definir')
          Text('Fecha límite de la evaluación $limite', style: _estilo(size: 13, weight: FontWeight.w700, color: const Color(0xFFB42318))),
        if (vencido)
          Padding(
            padding: const EdgeInsets.only(top: 8),
            child: Text('La fecha límite ya se cumplió. Esta capacitación está bloqueada.', style: _estilo(weight: FontWeight.w700)),
          ),
        if (!vencido) ...[
          if (tieneVideo && !_enSala) _reproductor(),
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
              'Fecha de la reunión ${fechaCharla(curso)}',
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
          _material(curso),
          if (_terminado && _preguntas.isEmpty && _veredicto == null)
            Text('Terminaste. Esta capacitación no tiene evaluación.', style: _estilo(size: 13, color: const Color(0xFF64748B))),
          if (curso['estado'] == 'Cumplió' && _nota == null && _veredicto == null)
            Text('Ya cumpliste esta capacitación con ${curso['nota'] ?? '—'} puntos.', style: _estilo(weight: FontWeight.w700, color: const Color(0xFF059669))),
          if (_veredicto == 'aprobado')
            Text('Aprobado. Tu nota es $_nota de 100. El mínimo era ${curso['notaMinima']}.', style: _estilo(weight: FontWeight.w800, color: const Color(0xFF059669))),
          if (_veredicto == 'reintentar') ...[
            Text('No aprobaste. Tu nota es $_nota de 100. Vuelve a revisar el video y responde otra vez.', style: _estilo(weight: FontWeight.w700, color: const Color(0xFFD97706))),
            TextButton(onPressed: _repetir, child: const Text('Volver a ver el video')),
          ],
          if (_veredicto == 'reprobado')
            Text('Reprobado. Tu nota es $_nota de 100. Póngase en contacto con su tutor.', style: _estilo(weight: FontWeight.w800, color: const Color(0xFFB42318))),
          if (_terminado && _preguntas.isNotEmpty && _veredicto == null) _examen(curso),
        ],
      ],
    );
  }

  Widget _reproductor() {
    final video = _video;
    if (!_videoListo || video == null || !video.value.isInitialized) {
      return const Padding(
        padding: EdgeInsets.symmetric(vertical: 24),
        child: Center(child: CircularProgressIndicator(color: Color(0xFF1D4ED8))),
      );
    }
    final relacion = video.value.aspectRatio == 0 ? 16 / 9 : video.value.aspectRatio;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 12),
      child: Column(
        children: [
          SizedBox(
            height: 380,
            width: double.infinity,
            child: Center(
              child: SizedBox(
                height: 380,
                width: 380 * relacion,
                child: VideoPlayer(video),
              ),
            ),
          ),
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              IconButton(
                onPressed: () {
                  if (video.value.isPlaying) {
                    video.pause();
                  } else {
                    video.play();
                  }
                  setState(() {});
                },
                icon: Icon(video.value.isPlaying ? Icons.pause_circle : Icons.play_circle, color: const Color(0xFF1D4ED8), size: 36),
              ),
              Text(_tiempo(video.value.position), style: _estilo(size: 12, color: const Color(0xFF64748B))),
            ],
          ),
        ],
      ),
    );
  }

  Widget _material(Map<String, dynamic> curso) {
    return Container(
      margin: const EdgeInsets.symmetric(vertical: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14)),
      child: Row(
        children: [
          const Icon(Icons.description_outlined, color: Color(0xFF1D4ED8)),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Presentación', style: _estilo(weight: FontWeight.w800)),
                Text((curso['material'] ?? 'Sin presentación').toString(), style: _estilo(size: 12, color: const Color(0xFF64748B))),
              ],
            ),
          ),
          if (curso['tienePdf'] == true) TextButton(onPressed: _abrirPdf, child: const Text('Abrir PDF')),
        ],
      ),
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
