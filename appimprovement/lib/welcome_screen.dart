import 'package:flutter/material.dart';
import 'services/biometric_auth_service.dart';
import 'services/auth_service.dart';

class WelcomeScreen extends StatefulWidget {
  const WelcomeScreen({super.key});

  @override
  State<WelcomeScreen> createState() => _WelcomeScreenState();
}

class _WelcomeScreenState extends State<WelcomeScreen> {
  final PageController _pageController = PageController();
  int _currentPage = 0;

  final List<String> _images = [
    'assets/images/Principal.jpg',
    'assets/images/Principal1.jpg',
    'assets/images/Principal2.jpg',
    'assets/images/Principal3.jpg',
  ];

  final List<Map<String, String>> _messages = [
    {
      'title': 'Bienvenido a',
      'highlight': 'Improvement Solutions',
      'subtitle': 'Tu aliado en gestión empresarial',
    },
    {
      'title': 'Gestión Integral',
      'highlight': 'Todo en un solo lugar',
      'subtitle': 'Talento humano, seguridad y cumplimiento legal',
    },
    {
      'title': 'Eficiencia y Control',
      'highlight': 'Optimiza tus procesos',
      'subtitle': 'Toma decisiones informadas en tiempo real',
    },
    {
      'title': 'Tecnología Avanzada',
      'highlight': 'Innovación constante',
      'subtitle': 'Soluciones modernas para empresas exitosas',
    },
  ];

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        children: [
          // Carrusel de imágenes
          PageView.builder(
            controller: _pageController,
            physics: const BouncingScrollPhysics(),
            onPageChanged: (index) {
              setState(() {
                _currentPage = index;
              });
            },
            itemCount: _images.length,
            itemBuilder: (context, index) {
              return SizedBox(
                width: MediaQuery.of(context).size.width,
                height: MediaQuery.of(context).size.height,
                child: Image.asset(
                  _images[index],
                  fit: BoxFit.cover,
                  errorBuilder: (context, error, stackTrace) {
                    return Container(
                      color: const Color(0xFF6B8CA6),
                      child: Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Icon(Icons.image_not_supported, size: 64, color: Colors.white),
                            const SizedBox(height: 16),
                            Text(
                              'Imagen ${index + 1} no encontrada:\n${_images[index]}',
                              textAlign: TextAlign.center,
                              style: const TextStyle(color: Colors.white),
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
              );
            },
          ),

          // Overlay oscuro (sin bloquear gestos)
          Positioned.fill(
            child: IgnorePointer(
              child: Container(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [
                      Colors.black.withOpacity(0.3),
                      Colors.black.withOpacity(0.6),
                    ],
                  ),
                ),
              ),
            ),
          ),

          // Contenido principal
          SafeArea(
            child: Column(
              children: [
                // Texto de ayuda en la parte superior
                Padding(
                  padding: const EdgeInsets.only(top: 20),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.swipe, color: Colors.white.withOpacity(0.7), size: 20),
                      const SizedBox(width: 8),
                      Text(
                        'Desliza para ver más',
                        style: TextStyle(
                          color: Colors.white.withOpacity(0.9),
                          fontSize: 14,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                ),
                
                const Spacer(),
                
                // Mensajes centrales
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 32),
                  child: Column(
                    children: [
                      Text(
                        _messages[_currentPage]['title']!,
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 20,
                          fontWeight: FontWeight.w400,
                          letterSpacing: 0.5,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        _messages[_currentPage]['highlight']!,
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 32,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 1.2,
                          height: 1.2,
                          shadows: [
                            Shadow(
                              color: Color(0x66000000),
                              offset: Offset(0, 2),
                              blurRadius: 8,
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 12),
                      Text(
                        _messages[_currentPage]['subtitle']!,
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          color: Colors.white.withOpacity(0.9),
                          fontSize: 16,
                          fontWeight: FontWeight.w400,
                          letterSpacing: 0.3,
                        ),
                      ),
                    ],
                  ),
                ),
                
                const Spacer(),
                
                // Indicadores de página
                Padding(
                  padding: const EdgeInsets.only(bottom: 40),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: List.generate(
                      _images.length,
                      (index) => AnimatedContainer(
                        duration: const Duration(milliseconds: 300),
                        margin: const EdgeInsets.symmetric(horizontal: 4),
                        width: _currentPage == index ? 24 : 8,
                        height: 8,
                        decoration: BoxDecoration(
                          color: _currentPage == index
                              ? Colors.white
                              : Colors.white.withOpacity(0.4),
                          borderRadius: BorderRadius.circular(4),
                        ),
                      ),
                    ),
                  ),
                ),

                // Botones de acceso
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 32),
                  child: Row(
                    children: [
                      Expanded(
                        child: _AccessButton(
                          icon: Icons.lock,
                          label: 'Usuario\nContraseña',
                          onTap: () {
                            Navigator.pushReplacementNamed(context, '/login');
                          },
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: _AccessButton(
                          icon: Icons.fingerprint,
                          label: 'Huella',
                          onTap: _onFingerprintTap,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 48),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _onFingerprintTap() async {
    try {
      final bio = BiometricAuthService();
      final supported = await bio.isDeviceSupported();
      final can = await bio.canCheckBiometrics();
      if (!supported || !can) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Biometría no soportada en este dispositivo'), backgroundColor: Colors.orange),
        );
        return;
      }

      final enabled = await bio.isBiometricEnabled();
      if (!enabled) {
        if (!mounted) return;
        final goLogin = await showDialog<bool>(
          context: context,
          builder: (ctx) => AlertDialog(
            title: const Text('Activar ingreso con huella'),
            content: const Text('Para usar la huella, inicia sesión con tus credenciales y elige "Sí, activar".'),
            actions: [
              TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancelar')),
              ElevatedButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Ir a login')),
            ],
          ),
        );
        if (goLogin == true) {
          if (!mounted) return;
          Navigator.pushReplacementNamed(context, '/login');
        }
        return;
      }

      final ok = await bio.authenticate(reason: 'Autentícate con tu huella');
      if (!ok) return;

      final creds = await bio.readRefreshToken();
      if (creds == null) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Primero activa la huella iniciando sesión una vez'), backgroundColor: Colors.orange),
        );
        return;
      }

      await AuthService().refreshLogin(refreshToken: creds['refreshToken']!);
      if (!mounted) return;
      Navigator.pushReplacementNamed(context, '/home');
    } catch (e) {
      try { await BiometricAuthService().clear(); } catch (_) {}
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('No se pudo iniciar sesión con huella: ${e.toString().replaceFirst('Exception: ', '')}'), backgroundColor: Colors.red),
      );
    }
  }
}

class _AccessButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  const _AccessButton({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 16),
          decoration: BoxDecoration(
            color: Colors.black.withOpacity(0.4),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: Colors.white.withOpacity(0.3),
              width: 1.5,
            ),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                icon,
                size: 40,
                color: Colors.white,
              ),
              const SizedBox(height: 8),
              Text(
                label,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  height: 1.2,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
