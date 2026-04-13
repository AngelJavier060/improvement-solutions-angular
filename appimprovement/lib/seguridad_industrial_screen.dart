import 'package:flutter/material.dart';
import 'services/auth_service.dart';
import 'indicadores_reactivos/indicadores_reactivos_dashboard_screen.dart';

class SeguridadIndustrialScreen extends StatelessWidget {
  const SeguridadIndustrialScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final authService = AuthService();
    final businessName = authService.getPrimaryBusinessName() ?? 'Empresa';
    
    return Scaffold(
      backgroundColor: const Color(0xFFF5F7F9),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 1,
        leading: IconButton(
          onPressed: () => Navigator.pop(context),
          icon: const Icon(Icons.arrow_back, color: Color(0xFF2563EB)),
        ),
        title: const Text(
          'Seguridad Industrial',
          style: TextStyle(
            color: Color(0xFF1E293B),
            fontSize: 18,
            fontWeight: FontWeight.bold,
          ),
        ),
        centerTitle: false,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header section
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF0050D4), Color(0xFF3B82F6)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.2),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Text(
                      'INDUSTRIAL SAFETY HUB',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 1,
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    businessName,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 22,
                      fontWeight: FontWeight.w800,
                      height: 1.2,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Gestión integral de riesgos y monitoreo de seguridad operacional.',
                    style: TextStyle(
                      color: Colors.white.withOpacity(0.85),
                      fontSize: 13,
                    ),
                  ),
                ],
              ),
            ),
            
            const SizedBox(height: 20),
            
            // Cards Grid - 2 columns
            GridView.count(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              crossAxisCount: 2,
              crossAxisSpacing: 12,
              mainAxisSpacing: 12,
              childAspectRatio: 0.95,
              children: [
                _ModuleCard(
                  title: 'Cumplimiento\nLegal',
                  subtitle: 'Auditorías y normativas',
                  icon: Icons.verified_user,
                  accentColor: const Color(0xFF00675E),
                  onTap: () => Navigator.pushNamed(context, '/legal-compliance'),
                ),
                _ModuleCard(
                  title: 'Capacitaciones',
                  subtitle: 'Formación y registro',
                  icon: Icons.school,
                  accentColor: const Color(0xFF702AE1),
                  onTap: () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text('Módulo en desarrollo'),
                        backgroundColor: Colors.orange,
                      ),
                    );
                  },
                ),
                _ModuleCard(
                  title: 'Índices de\nAccidentabilidad',
                  subtitle: 'IF, TRIF, IG, TR (datos reales)',
                  icon: Icons.analytics,
                  accentColor: const Color(0xFF0050D4),
                  isHighlighted: true,
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => const IndicadoresReactivosDashboardScreen(),
                      ),
                    );
                  },
                ),
                _ModuleCard(
                  title: 'Accidentes',
                  subtitle: 'Reportes y correctivas',
                  icon: Icons.warning_amber_rounded,
                  accentColor: const Color(0xFFB31B25),
                  onTap: () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text('Módulo en desarrollo'),
                        backgroundColor: Colors.red,
                      ),
                    );
                  },
                ),
                _ModuleCard(
                  title: 'Gerencias de\nViajes',
                  subtitle: 'Logística y flota',
                  icon: Icons.local_shipping,
                  accentColor: const Color(0xFF2563EB),
                  onTap: () => Navigator.pushNamed(context, '/gerencias-viajes'),
                ),
              ],
            ),
            
            const SizedBox(height: 80),
          ],
        ),
      ),
      bottomNavigationBar: BottomNavigationBar(
        type: BottomNavigationBarType.fixed,
        backgroundColor: Colors.white,
        elevation: 8,
        selectedItemColor: const Color(0xFF2563EB),
        unselectedItemColor: const Color(0xFF64748B),
        selectedLabelStyle: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold),
        unselectedLabelStyle: const TextStyle(fontSize: 11),
        currentIndex: 0,
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.dashboard), label: 'Dashboard'),
          BottomNavigationBarItem(icon: Icon(Icons.analytics), label: 'Reportes'),
          BottomNavigationBarItem(icon: Icon(Icons.settings), label: 'Ajustes'),
        ],
      ),
    );
  }
}

class _ModuleCard extends StatelessWidget {
  final String title;
  final String subtitle;
  final IconData icon;
  final Color accentColor;
  final VoidCallback onTap;
  final bool isHighlighted;

  const _ModuleCard({
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.accentColor,
    required this.onTap,
    this.isHighlighted = false,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(
          color: isHighlighted ? accentColor : Colors.white,
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.06),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Column(
          children: [
            // Accent bar at top
            if (!isHighlighted)
              Container(
                height: 5,
                decoration: BoxDecoration(
                  color: accentColor,
                  borderRadius: const BorderRadius.only(
                    topLeft: Radius.circular(16),
                    topRight: Radius.circular(16),
                  ),
                ),
              ),
            
            Expanded(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    // Icon container
                    Container(
                      width: 48,
                      height: 48,
                      decoration: BoxDecoration(
                        color: isHighlighted
                            ? Colors.white.withOpacity(0.2)
                            : accentColor.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Icon(
                        icon,
                        size: 24,
                        color: isHighlighted ? Colors.white : accentColor,
                      ),
                    ),
                    const SizedBox(height: 12),
                    // Title
                    Text(
                      title,
                      textAlign: TextAlign.center,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.bold,
                        color: isHighlighted ? Colors.white : const Color(0xFF1E293B),
                        height: 1.2,
                      ),
                    ),
                    const SizedBox(height: 4),
                    // Subtitle
                    Text(
                      subtitle,
                      textAlign: TextAlign.center,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: 11,
                        color: isHighlighted
                            ? Colors.white.withOpacity(0.8)
                            : const Color(0xFF64748B),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
