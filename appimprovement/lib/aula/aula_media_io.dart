import 'dart:io';
import 'dart:typed_data';

import 'package:url_launcher/url_launcher.dart';
import 'package:video_player/video_player.dart';

Future<VideoPlayerController> controladorVideo(Uint8List bytes, String nombre) async {
  final file = File('${Directory.systemTemp.path}/$nombre');
  await file.writeAsBytes(bytes, flush: true);
  return VideoPlayerController.file(file);
}

Future<void> abrirArchivo(Uint8List bytes, String mime, String nombre) async {
  final file = File('${Directory.systemTemp.path}/$nombre');
  await file.writeAsBytes(bytes, flush: true);
  final uri = Uri.file(file.path);
  await launchUrl(uri, mode: LaunchMode.externalApplication);
}

void imprimirPagina() {}
