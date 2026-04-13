import 'package:flutter/foundation.dart';

/// URL base del API (Spring). Los datos vienen del servidor; la app no abre la BD directamente.
///
/// **Producción (release/profile):** por defecto `https://improvement-solution.com` (misma API que la web).
///
/// **Desarrollo (debug):** emulador → `10.0.2.2:8081`, resto → `localhost:8081`.
///
/// **Forzar URL en cualquier modo** (p. ej. probar producción en debug desde un teléfono):
/// ```bash
/// flutter run --dart-define=API_BASE_URL=https://improvement-solution.com
/// flutter build apk --release --dart-define=API_BASE_URL=https://tu-dominio.com
/// ```
class AppConfig {
  static const String _dartDefineBase = String.fromEnvironment('API_BASE_URL', defaultValue: '');

  /// API en producción (ajusta si tu dominio real es otro).
  static const String _defaultProductionBase = 'https://improvement-solution.com';

  static String get baseUrl {
    final override = _dartDefineBase.trim();
    if (override.isNotEmpty) {
      return _normalizeBase(override);
    }
    if (kDebugMode) {
      if (kIsWeb) return 'http://localhost:8081';
      switch (defaultTargetPlatform) {
        case TargetPlatform.android:
          return 'http://10.0.2.2:8081';
        default:
          return 'http://localhost:8081';
      }
    }
    return _normalizeBase(_defaultProductionBase);
  }

  static String _normalizeBase(String url) {
    var u = url.trim();
    if (u.endsWith('/')) {
      u = u.substring(0, u.length - 1);
    }
    return u;
  }
}
