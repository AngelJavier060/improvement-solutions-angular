import 'package:flutter/foundation.dart';
import 'package:local_auth/local_auth.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'dart:io' show Platform;
import 'package:android_intent_plus/android_intent.dart';

class BiometricAuthService {
  static final BiometricAuthService _instance = BiometricAuthService._internal();
  factory BiometricAuthService() => _instance;
  BiometricAuthService._internal();

  final LocalAuthentication _auth = LocalAuthentication();
  final FlutterSecureStorage _storage = const FlutterSecureStorage();

  static const _kBioEnabled = 'bio_enabled';
  static const _kBioUsername = 'bio_username';
  static const _kBioRefresh = 'bio_refresh_token';
  static const _kRememberMe = 'remember_me';

  Future<bool> isDeviceSupported() async {
    try {
      return await _auth.isDeviceSupported();
    } catch (_) {
      return false;
    }
  }

  Future<bool> canCheckBiometrics() async {
    try {
      final can = await _auth.canCheckBiometrics;
      final enrolled = await _auth.getAvailableBiometrics();
      return can && enrolled.isNotEmpty;
    } catch (_) {
      return false;
    }
  }

  Future<bool> isEnrolled() async {
    try {
      final list = await _auth.getAvailableBiometrics();
      return list.isNotEmpty;
    } catch (_) {
      return false;
    }
  }

  Future<bool> isBiometricEnabled() async {
    final flag = await _storage.read(key: _kBioEnabled);
    final user = await _storage.read(key: _kBioUsername);
    final refresh = await _storage.read(key: _kBioRefresh);
    return flag == '1' && user != null && refresh != null && user.isNotEmpty && refresh.isNotEmpty;
  }

  Future<String?> getBiometricUsername() => _storage.read(key: _kBioUsername);

  Future<bool> authenticate({String reason = 'Autentícate para continuar'}) async {
    try {
      final ok = await _auth.authenticate(
        localizedReason: reason,
        options: const AuthenticationOptions(biometricOnly: true, stickyAuth: false),
      );
      return ok;
    } catch (e) {
      if (kDebugMode) {
        debugPrint('Biometric authenticate error: $e');
      }
      return false;
    }
  }

  Future<void> saveRefreshToken(String username, String refreshToken) async {
    await _storage.write(key: _kBioEnabled, value: '1');
    await _storage.write(key: _kBioUsername, value: username);
    await _storage.write(key: _kBioRefresh, value: refreshToken);
    // limpiar posible clave anterior basada en password
    await _storage.delete(key: 'bio_password');
  }

  Future<Map<String, String>?> readRefreshToken() async {
    final user = await _storage.read(key: _kBioUsername);
    final refresh = await _storage.read(key: _kBioRefresh);
    if (user == null || refresh == null) return null;
    return {'username': user, 'refreshToken': refresh};
  }

  Future<void> clear() async {
    await _storage.delete(key: _kBioEnabled);
    await _storage.delete(key: _kBioUsername);
    await _storage.delete(key: _kBioRefresh);
    await _storage.delete(key: 'bio_password');
  }

  Future<bool> getRememberMe() async {
    final v = await _storage.read(key: _kRememberMe);
    if (v == null) return true; // por defecto activado
    return v == '1';
  }

  Future<void> setRememberMe(bool value) async {
    await _storage.write(key: _kRememberMe, value: value ? '1' : '0');
  }

  Future<void> openEnrollSettings() async {
    if (!Platform.isAndroid) return;
    try {
      const intent = AndroidIntent(action: 'android.settings.BIOMETRIC_ENROLL');
      await intent.launch();
    } catch (_) {
      try {
        const intent = AndroidIntent(action: 'android.settings.SECURITY_SETTINGS');
        await intent.launch();
      } catch (_) {}
    }
  }
}
