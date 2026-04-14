import 'package:flutter/foundation.dart';

/// URL base del API (Spring). Los datos vienen del servidor; la app no abre la BD directamente.
///
/// **Por defecto (debug y release):** `https://improvement-solution.com` — mismas credenciales que la web en producción.
///
/// **Backend en tu PC** (emulador `10.0.2.2`, Spring en puerto 8081):
/// ```bash
/// flutter run --dart-define=LOCAL_API=true
/// ```
///
/// **Otra URL** (staging, IP, etc.):
/// ```bash
/// flutter run --dart-define=API_BASE_URL=https://otro-dominio.com
/// flutter build apk --release --dart-define=API_BASE_URL=https://tu-api.com
/// ```
class AppConfig {
  static const String _dartDefineBase = String.fromEnvironment('API_BASE_URL', defaultValue: '');
  static const String _localApiFlag = String.fromEnvironment('LOCAL_API', defaultValue: '');

  /// API en producción (ajusta si tu dominio real es otro).
  static const String _defaultProductionBase = 'https://improvement-solution.com';

  static bool get _wantsLocalApi {
    final v = _localApiFlag.trim().toLowerCase();
    return v == '1' || v == 'true' || v == 'yes';
  }

  static String get baseUrl {
    final override = _dartDefineBase.trim();
    if (override.isNotEmpty) {
      return _normalizeBase(override);
    }
    if (_wantsLocalApi) {
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
