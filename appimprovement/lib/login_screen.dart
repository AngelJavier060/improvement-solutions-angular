import 'package:flutter/material.dart';
import 'dart:ui';
import 'services/auth_service.dart';
import 'services/biometric_auth_service.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final TextEditingController _usernameController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();
  bool _isLoading = false;
  bool _bioAvailable = false;
  bool _bioEnabled = false;
  bool _bioBusy = false;

  @override
  void initState() {
    super.initState();
    _initBiometricAvailability();
  }

  Future<void> _initBiometricAvailability() async {
    final bio = BiometricAuthService();
    final supported = await bio.isDeviceSupported();
    final canCheck = await bio.canCheckBiometrics();
    final enabled = await bio.isBiometricEnabled();
    if (!mounted) return;
    setState(() {
      _bioAvailable = supported && canCheck;
      _bioEnabled = enabled;
    });
    // Auto-prompt biometrics if already enabled (banking-like UX)
    if (_bioAvailable && _bioEnabled) {
      // slight delay to let UI build
      Future.microtask(() => _tryBiometricLogin());
    }
  }

  void _login() async {
    final username = _usernameController.text.trim();
    final password = _passwordController.text.trim();

    if (username.isEmpty || password.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Por favor, completa todos los campos'),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    setState(() => _isLoading = true);
    try {
      await AuthService().login(username: username, password: password);
      if (!mounted) return;

      // Ofrecer activar huella tras login exitoso
      await _maybeOfferEnableBiometric(username, password);

      if (!mounted) return;
      Navigator.pushReplacementNamed(context, '/home');
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(e.toString().replaceFirst('Exception: ', '')),
          backgroundColor: Colors.red,
        ),
      );
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  Future<void> _maybeOfferEnableBiometric(String username, String password) async {
    try {
      final bio = BiometricAuthService();
      if (!_bioAvailable) return;
      final already = await bio.isBiometricEnabled();
      if (already) return;

      final want = await showDialog<bool>(
        context: context,
        builder: (ctx) {
          return AlertDialog(
            title: const Text('Activar ingreso con huella'),
            content: const Text('¿Deseas habilitar el ingreso con huella dactilar para futuros accesos en este dispositivo?'),
            actions: [
              TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('No')),
              ElevatedButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Sí, activar')),
            ],
          );
        },
      );
      if (want != true) return;

      final ok = await bio.authenticate(reason: 'Confirma tu huella para activar el acceso');
      if (!ok) return;

      final rt = AuthService().refreshToken;
      if (rt == null || rt.isEmpty) {
        // Si no hay refresh en respuesta, no habilitar
        return;
      }
      await bio.saveRefreshToken(username, rt);
      if (!mounted) return;
      setState(() {
        _bioEnabled = true;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Ingreso con huella activado'), backgroundColor: Colors.green),
      );
    } catch (_) {}
  }

  Future<void> _tryBiometricLogin() async {
    if (!_bioAvailable) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Biometría no soportada en este dispositivo'), backgroundColor: Colors.orange),
      );
      return;
    }
    setState(() => _bioBusy = true);
    try {
      final bio = BiometricAuthService();
      final ok = await bio.authenticate(reason: 'Autentícate con tu huella');
      if (!ok) return;

      final creds = await bio.readRefreshToken();
      if (creds == null) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Primero activa el acceso con huella iniciando sesión una vez'), backgroundColor: Colors.orange),
        );
        return;
      }

      await AuthService().refreshLogin(refreshToken: creds['refreshToken']!);
      if (!mounted) return;
      Navigator.pushReplacementNamed(context, '/home');
    } catch (e) {
      if (!mounted) return;
      // Si falla con 401/credenciales, limpiar credenciales biométricas guardadas
      try { await BiometricAuthService().clear(); } catch (_) {}
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('No se pudo iniciar sesión con huella: ${e.toString().replaceFirst('Exception: ', '')}'), backgroundColor: Colors.red),
      );
    } finally {
      if (mounted) setState(() => _bioBusy = false);
    }
  }


  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        children: [
          // Fondo con gradiente
          Container(
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [
                  Color(0xFF667eea),
                  Color(0xFF764ba2),
                ],
              ),
            ),
          ),

          // Imagen de fondo
            SizedBox.expand(
              child: Image.asset(
                'assets/images/Imagen3.png',
                fit: BoxFit.cover,
              ),
            ),

          // Capa de oscurecimiento
            SizedBox.expand(
              child: Container(
                color: Colors.black.withOpacity(0.55),
              ),
            ),

          // Contenido principal
          SafeArea(
            child: Center(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 16.0),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    // Logo o ícono
                    Container(
                      width: 96,
                      height: 96,
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.12),
                        shape: BoxShape.circle,
                        border: Border.all(color: Colors.white.withOpacity(0.2)),
                      ),
                      child: const Icon(
                        Icons.business,
                        size: 44,
                        color: Colors.white,
                      ),
                    ),

                    const SizedBox(height: 24),

                    // Título
                    const Text(
                      'Improvements Solutions',
                      style: TextStyle(
                        fontSize: 30,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 0.3,
                        color: Colors.white,
                      ),
                    ),

                    const SizedBox(height: 8),

                    Text(
                      'Bienvenido de vuelta',
                      style: TextStyle(
                        fontSize: 16,
                        color: Colors.white.withOpacity(0.8),
                        height: 1.3,
                      ),
                    ),

                    const SizedBox(height: 48),

                    // Formulario
                    ConstrainedBox(
                      constraints: const BoxConstraints(maxWidth: 420),
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(20),
                        child: BackdropFilter(
                          filter: ImageFilter.blur(sigmaX: 12, sigmaY: 12),
                          child: Container(
                            padding: const EdgeInsets.all(24),
                            decoration: BoxDecoration(
                              color: Colors.white.withOpacity(0.08),
                              borderRadius: BorderRadius.circular(20),
                              border: Border.all(color: Colors.white.withOpacity(0.12)),
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.black.withOpacity(0.25),
                                  blurRadius: 24,
                                  offset: const Offset(0, 12),
                                ),
                              ],
                            ),
                            child: Column(
                              children: [
                                // Campo usuario
                                TextField(
                                  controller: _usernameController,
                                  style: const TextStyle(color: Colors.white),
                                  decoration: InputDecoration(
                                    labelText: 'Usuario',
                                    labelStyle: TextStyle(color: Colors.white.withOpacity(0.8)),
                                    prefixIcon: Icon(Icons.person, color: Colors.white.withOpacity(0.8)),
                                    enabledBorder: OutlineInputBorder(
                                      borderRadius: BorderRadius.circular(14),
                                      borderSide: BorderSide(color: Colors.white.withOpacity(0.18)),
                                    ),
                                    focusedBorder: OutlineInputBorder(
                                      borderRadius: BorderRadius.circular(14),
                                      borderSide: BorderSide(color: Colors.white.withOpacity(0.6), width: 1.2),
                                    ),
                                    filled: true,
                                    fillColor: Colors.white.withOpacity(0.12),
                                    hintText: 'Ingresa tu usuario',
                                    hintStyle: TextStyle(color: Colors.white.withOpacity(0.6)),
                                  ),
                                ),

                                const SizedBox(height: 16),

                                // Campo contraseña
                                TextField(
                                  controller: _passwordController,
                                  style: const TextStyle(color: Colors.white),
                                  decoration: InputDecoration(
                                    labelText: 'Contraseña',
                                    labelStyle: TextStyle(color: Colors.white.withOpacity(0.8)),
                                    prefixIcon: Icon(Icons.lock, color: Colors.white.withOpacity(0.8)),
                                    enabledBorder: OutlineInputBorder(
                                      borderRadius: BorderRadius.circular(14),
                                      borderSide: BorderSide(color: Colors.white.withOpacity(0.18)),
                                    ),
                                    focusedBorder: OutlineInputBorder(
                                      borderRadius: BorderRadius.circular(14),
                                      borderSide: BorderSide(color: Colors.white.withOpacity(0.6), width: 1.2),
                                    ),
                                    filled: true,
                                    fillColor: Colors.white.withOpacity(0.12),
                                    hintText: 'Ingresa tu contraseña',
                                    hintStyle: TextStyle(color: Colors.white.withOpacity(0.6)),
                                  ),
                                  obscureText: true,
                                ),

                                const SizedBox(height: 24),

                                // Botón de login
                                SizedBox(
                                  width: double.infinity,
                                  height: 50,
                                  child: ElevatedButton(
                                    onPressed: _isLoading ? null : _login,
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: const Color(0xFF5B67F1),
                                      foregroundColor: Colors.white,
                                      elevation: 2,
                                      shape: RoundedRectangleBorder(
                                        borderRadius: BorderRadius.circular(14),
                                      ),
                                    ),
                                    child: _isLoading
                                        ? const SizedBox(
                                            width: 22,
                                            height: 22,
                                            child: CircularProgressIndicator(strokeWidth: 2.4, color: Colors.white),
                                          )
                                        : const Text(
                                            'Iniciar Sesión',
                                            style: TextStyle(
                                              fontSize: 16,
                                              fontWeight: FontWeight.w700,
                                              letterSpacing: 0.3,
                                            ),
                                          ),
                                  ),
                                ),

                                const SizedBox(height: 16),

                                // Enlace de recuperación
                                TextButton(
                                  onPressed: () {},
                                  child: const Text(
                                    '¿Olvidaste tu contraseña?',
                                    style: TextStyle(color: Color(0xFF9FA6FF)),
                                  ),
                                ),

                                const SizedBox(height: 8),

                                if (_bioAvailable)
                                  SizedBox(
                                    width: double.infinity,
                                    child: OutlinedButton.icon(
                                      onPressed: _bioBusy ? null : (_bioEnabled ? _tryBiometricLogin : () {
                                        ScaffoldMessenger.of(context).showSnackBar(
                                          const SnackBar(content: Text('Para activar la huella, inicia sesión una vez con tus credenciales'), backgroundColor: Colors.blue),
                                        );
                                      }),
                                      icon: Icon(Icons.fingerprint, color: _bioEnabled ? Colors.white : Colors.white70),
                                      label: Text(
                                        _bioEnabled ? 'Ingresar con huella' : 'Configurar huella',
                                        style: const TextStyle(color: Colors.white),
                                      ),
                                      style: OutlinedButton.styleFrom(
                                        side: BorderSide(color: Colors.white.withOpacity(0.3)),
                                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                                        backgroundColor: Colors.white.withOpacity(0.08),
                                      ),
                                    ),
                                  ),

                                if (_bioAvailable && _bioEnabled)
                                  TextButton(
                                    onPressed: () async {
                                      try {
                                        await BiometricAuthService().clear();
                                        if (!mounted) return;
                                        setState(() => _bioEnabled = false);
                                        ScaffoldMessenger.of(context).showSnackBar(
                                          const SnackBar(content: Text('Ingreso con huella desactivado'), backgroundColor: Colors.green),
                                        );
                                      } catch (_) {}
                                    },
                                    child: const Text('Desactivar huella'),
                                  ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ),

                    const SizedBox(height: 24),

                    // Texto de registro (sin overflow en pantallas pequeñas)
                    Wrap(
                      alignment: WrapAlignment.center,
                      crossAxisAlignment: WrapCrossAlignment.center,
                      spacing: 4,
                      children: [
                        Text(
                          '¿No tienes cuenta? ',
                          style: TextStyle(color: Colors.white.withOpacity(0.8)),
                          softWrap: true,
                        ),
                        TextButton(
                          onPressed: () {},
                          child: const Text(
                            'Regístrate',
                            style: TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}