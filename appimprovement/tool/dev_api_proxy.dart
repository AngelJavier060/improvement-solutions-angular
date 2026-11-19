import 'dart:io';
import 'dart:typed_data';

/// Puente local para `flutter run -d chrome`.
/// El navegador no puede llamar directo a producción; aquí la petición sí sale
/// y se le devuelve el permiso que Chrome exige.
const String _upstream = 'improvement-solution.com';
const int _port = 8095;

Future<void> main() async {
  final client = HttpClient();
  final servers = <HttpServer>[
    await HttpServer.bind(InternetAddress.loopbackIPv4, _port),
  ];
  try {
    servers.add(await HttpServer.bind(InternetAddress.loopbackIPv6, _port));
  } catch (error) {
    stderr.writeln('Sin IPv6: $error');
  }
  stdout.writeln('Puente listo en http://localhost:$_port -> https://$_upstream');
  await Future.wait(servers.map((server) async {
    await for (final request in server) {
      try {
        await _forward(client, request);
      } catch (error) {
        request.response.statusCode = HttpStatus.badGateway;
        _allowBrowser(request.response, request);
        request.response.headers.contentType = ContentType.json;
        request.response.write('{"message":"No se pudo llegar al servidor"}');
        await request.response.close();
        stderr.writeln(error);
      }
    }
  }));
}

Future<void> _forward(HttpClient client, HttpRequest request) async {
  if (request.method == 'OPTIONS') {
    request.response.statusCode = HttpStatus.noContent;
    _allowBrowser(request.response, request);
    await request.response.close();
    return;
  }

  final target = Uri.https(_upstream, request.uri.path, request.uri.queryParameters.isEmpty ? null : request.uri.queryParameters);
  final outgoing = await client.openUrl(request.method, target);
  request.headers.forEach((name, values) {
    final lower = name.toLowerCase();
    if (lower == 'host' || lower == 'content-length' || lower == 'connection') return;
    for (final value in values) {
      outgoing.headers.add(name, value);
    }
  });
  outgoing.headers.host = _upstream;
  await outgoing.addStream(request);
  final incoming = await outgoing.close();

  final bytes = await incoming.fold<BytesBuilder>(BytesBuilder(), (builder, chunk) {
    builder.add(chunk);
    return builder;
  }).then((builder) => builder.takeBytes());
  stdout.writeln('  respuesta ${incoming.statusCode} bytes=${bytes.length}');
  request.response.statusCode = incoming.statusCode;
  incoming.headers.forEach((name, values) {
    final lower = name.toLowerCase();
    if (lower == 'transfer-encoding' ||
        lower == 'connection' ||
        lower == 'content-length' ||
        lower == 'content-encoding' ||
        lower.startsWith('access-control-')) {
      return;
    }
    for (final value in values) {
      request.response.headers.add(name, value);
    }
  });
  _allowBrowser(request.response, request);
  request.response.contentLength = bytes.length;
  request.response.add(bytes);
  await request.response.close();
}

void _allowBrowser(HttpResponse response, HttpRequest request) {
  final origin = request.headers.value('origin');
  final requested = request.headers.value('access-control-request-headers');
  stdout.writeln('${request.method} ${request.uri.path} origin=$origin headers=$requested');
  response.headers.set(HttpHeaders.accessControlAllowOriginHeader, origin ?? '*');
  response.headers.set(HttpHeaders.accessControlAllowMethodsHeader, 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  response.headers.set(
    HttpHeaders.accessControlAllowHeadersHeader,
    (requested == null || requested.trim().isEmpty)
        ? 'Authorization, Content-Type, Accept, Origin, X-Requested-With'
        : requested,
  );
  response.headers.set('Access-Control-Allow-Private-Network', 'true');
  response.headers.set(HttpHeaders.accessControlMaxAgeHeader, '3600');
  if (origin != null) {
    response.headers.set(HttpHeaders.accessControlAllowCredentialsHeader, 'true');
  }
}
