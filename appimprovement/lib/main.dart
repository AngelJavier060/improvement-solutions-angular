import 'package:flutter/material.dart';
import 'login_screen.dart';
import 'services/auth_service.dart';
import 'employees_list_screen.dart';
import 'config/app_config.dart';
import 'services/business_service.dart';
import 'security_legal_screen.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  // This widget is the root of your application.
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Improvements Solutions',
      theme: ThemeData(
        // This is the theme of your application.
        //
        // TRY THIS: Try running your application with "flutter run". You'll see
        // the application has a purple toolbar. Then, without quitting the app,
        // try changing the seedColor in the colorScheme below to Colors.green
        // and then invoke "hot reload" (save your changes or press the "hot
        // reload" button in a Flutter-supported IDE, or press "r" if you used
        // the command line to start the app).
        //
        // Notice that the counter didn't reset back to zero; the application
        // state is not lost during the reload. To reset the state, use hot
        // restart instead.
        //
        // This works for code too, not just values: Most code changes can be
        // tested with just a hot reload.
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.deepPurple),
      ),
      initialRoute: '/login',
      routes: {
        '/login': (context) => const LoginScreen(),
        '/home': (context) => const MyHomePage(title: 'Improvements Solutions'),
        '/employees': (context) => const EmployeesListScreen(),
        '/security-legal': (context) => const SecurityLegalScreen(),
      },
    );
  }
}

class MyHomePage extends StatefulWidget {
  const MyHomePage({super.key, required this.title});

  // This widget is the home page of your application. It is stateful, meaning
  // that it has a State object (defined below) that contains fields that affect
  // how it looks.

  // This class is the configuration for the state. It holds the values (in this
  // case the title) provided by the parent (in this case the App widget) and
  // used by the build method of the State. Fields in a Widget subclass are
  // always marked "final".

  final String title;

  @override
  State<MyHomePage> createState() => _MyHomePageState();
}

class _MyHomePageState extends State<MyHomePage> {
  String? _businessName;
  String? _logoUrl;

  @override
  void initState() {
    super.initState();
    _businessName = AuthService().getPrimaryBusinessName();
    final logoPath = AuthService().getPrimaryBusinessLogoPath();
    _logoUrl = _resolveLogoUrl(logoPath);
    if ((_logoUrl == null || _logoUrl!.isEmpty)) {
      final ruc = AuthService().getPrimaryBusinessRuc();
      if (ruc != null && ruc.isNotEmpty) {
        _loadLogoByRuc(ruc);
      }
    }
  }

  Future<void> _loadLogoByRuc(String ruc) async {
    try {
      final business = await BusinessService().getByRuc(ruc);
      final logo = (business != null ? business['logo'] : null);
      final url = _resolveLogoUrl(logo?.toString());
      if (mounted && url != null && url.isNotEmpty) {
        setState(() => _logoUrl = url);
      }
    } catch (_) {}
  }

  String? _resolveLogoUrl(String? path) {
    if (path == null || path.trim().isEmpty) return null;
    final p = path.trim();
    if (p.startsWith('http://') || p.startsWith('https://')) return p;
    if (p.startsWith('/api/')) {
      final lastSlash = p.lastIndexOf('/');
      final prefix = p.substring(0, lastSlash + 1);
      final last = p.substring(lastSlash + 1);
      return '${AppConfig.baseUrl}$prefix${Uri.encodeComponent(last)}';
    }
    var normalized = p.replaceAll('\\', '/');
    while (normalized.startsWith('/')) normalized = normalized.substring(1);
    if (normalized.startsWith('uploads/')) normalized = normalized.substring('uploads/'.length);
    final hasSlash = normalized.contains('/');
    final filename = hasSlash ? (normalized.split('/').last) : normalized;
    final lower = normalized.toLowerCase();
    if (lower.startsWith('logos/')) {
      final encoded = normalized.split('/').map(Uri.encodeComponent).join('/');
      return '${AppConfig.baseUrl}/api/files/$encoded';
    }
    if (!hasSlash) {
      return '${AppConfig.baseUrl}/api/files/logos/${Uri.encodeComponent(filename)}';
    }
    final encoded = normalized.split('/').map(Uri.encodeComponent).join('/');
    return '${AppConfig.baseUrl}/api/files/$encoded';
  }

  @override
  Widget build(BuildContext context) {
    final greeting = _businessName != null && _businessName!.isNotEmpty
        ? 'Bienvenido a ${_businessName!}'
        : 'Bienvenido';

    return Scaffold(
      body: Stack(
        children: [
          // Imagen de fondo
          Positioned.fill(
            child: Image.asset(
              'assets/images/Imagen 4.jpg',
              fit: BoxFit.cover,
            ),
          ),

          // Capa de oscurecimiento
          Positioned.fill(
            child: Container(
              color: Colors.black.withOpacity(0.3),
            ),
          ),

          // Contenido principal
          Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.center,
              children: <Widget>[
                if (_logoUrl != null && _logoUrl!.isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 20),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(12),
                      child: Image.network(
                        _logoUrl!,
                        width: 96,
                        height: 96,
                        fit: BoxFit.contain,
                        errorBuilder: (context, error, stackTrace) {
                          return const Icon(Icons.business, size: 64);
                        },
                      ),
                    ),
                  ),
                Text(
                  greeting,
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    fontSize: 28,
                    fontWeight: FontWeight.w700,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 12),
                const Text(
                  'Has iniciado sesión correctamente.',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 16,
                    color: Colors.white70,
                  ),
                ),
                const SizedBox(height: 40),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 24.0),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Flexible(
                        fit: FlexFit.tight,
                        child: _FeatureCard(
                          icon: Icons.group,
                          label: 'Talento Humano',
                          onTap: () => Navigator.pushNamed(context, '/employees'),
                        ),
                      ),
                      const SizedBox(width: 20),
                      Flexible(
                        fit: FlexFit.tight,
                        child: _FeatureCard(
                          icon: Icons.gavel,
                          label: 'Seguridad Industrial',
                          onTap: () => Navigator.pushNamed(context, '/security-legal'),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _FeatureCard extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  const _FeatureCard({required this.icon, required this.label, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.1),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.white.withOpacity(0.2)),
      ),
      child: Material(
        color: Colors.transparent,
        elevation: 2,
        borderRadius: BorderRadius.circular(20),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(20),
          child: Container(
            padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 16),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(icon, size: 40, color: Colors.white),
                const SizedBox(height: 12),
                Text(
                  label,
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    fontWeight: FontWeight.w600,
                    color: Colors.white,
                    fontSize: 14,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
