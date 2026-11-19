import 'dart:js_interop';
import 'dart:typed_data';

import 'package:video_player/video_player.dart';
import 'package:web/web.dart';

Future<VideoPlayerController> controladorVideo(Uint8List bytes, String nombre) async {
  final blob = Blob([bytes.toJS].toJS, BlobPropertyBag(type: 'video/mp4'));
  final url = URL.createObjectURL(blob);
  return VideoPlayerController.networkUrl(Uri.parse(url));
}

Future<void> abrirArchivo(Uint8List bytes, String mime, String nombre) async {
  final blob = Blob([bytes.toJS].toJS, BlobPropertyBag(type: mime));
  final url = URL.createObjectURL(blob);
  window.open(url, '_blank');
}

void imprimirPagina() {
  window.print();
}
