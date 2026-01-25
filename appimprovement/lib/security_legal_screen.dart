import 'package:flutter/material.dart';

import 'services/legal_service.dart';
import 'services/auth_service.dart';

class SecurityLegalScreen extends StatefulWidget {
  const SecurityLegalScreen({super.key});

  @override
  State<SecurityLegalScreen> createState() => _SecurityLegalScreenState();
}

class _SecurityLegalScreenState extends State<SecurityLegalScreen> {
  late Future<List<Map<String, dynamic>>> _future;
  String? _ruc;
  String? _businessName;
  final GlobalKey _legalSectionKey = GlobalKey();

  @override
  void initState() {
    super.initState();
    final ruc = AuthService().getPrimaryBusinessRuc();
    _ruc = ruc;
    _businessName = AuthService().getPrimaryBusinessName();
    _future = (ruc != null && ruc.isNotEmpty)
        ? LegalService().getLegalSummaryByRuc(ruc)
        : Future.value(<Map<String, dynamic>>[]);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF6B8CA6),
      appBar: AppBar(
        backgroundColor: const Color(0xFF6B8CA6),
        foregroundColor: Colors.white,
        elevation: 0,
        centerTitle: true,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            const Text('Seguridad Industrial', style: TextStyle(color: Colors.white)),
            if (_businessName != null && _businessName!.isNotEmpty)
              Text(
                _businessName!,
                style: const TextStyle(color: Color(0xFFC8D5DE), fontSize: 12),
              ),
          ],
        ),
      ),
      body: FutureBuilder<List<Map<String, dynamic>>>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Text(
                  snapshot.error.toString().replaceFirst('Exception: ', ''),
                  textAlign: TextAlign.center,
                ),
              ),
            );
          }
          return Stack(
            fit: StackFit.expand,
            children: [
              Image.asset(
                'assets/images/Imagen1.jpg',
                fit: BoxFit.cover,
              ),
              Container(
                color: const Color(0xFF6B8CA6).withOpacity(0.92),
              ),
              ListView(
                padding: const EdgeInsets.all(12),
                children: [
                  GridView.count(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    crossAxisCount: 2,
                    crossAxisSpacing: 12,
                    mainAxisSpacing: 12,
                    childAspectRatio: 1.35,
                    children: [
                      _MenuTile(
                        icon: Icons.policy,
                        label: 'Cumplimiento legal',
                        onTap: () {
                          Navigator.pushNamed(context, '/legal-compliance');
                        },
                      ),
                      _MenuTile(
                        icon: Icons.school,
                        label: 'Capacitaciones',
                        onTap: () {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('Capacitaciones: próximamente')),
                          );
                        },
                      ),
                      _MenuTile(
                        icon: Icons.stacked_line_chart,
                        label: 'Índices de accidentabilidad',
                        onTap: () {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('Índices de accidentabilidad: próximamente')),
                          );
                        },
                      ),
                      _MenuTile(
                        icon: Icons.report_problem,
                        label: 'Accidentes',
                        onTap: () {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('Accidentes: próximamente')),
                          );
                        },
                      ),
                    ],
                  ),
                ],
              ),
            ],
          );
        },
      ),
    );
  }
}

extension on _SecurityLegalScreenState {
  void _showLegalBottomSheet(List<Map<String, dynamic>> items) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (context) {
        return SafeArea(
          child: SizedBox(
            height: MediaQuery.of(context).size.height * 0.7,
            child: Column(
              children: [
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Cumplimiento legal',
                              style: TextStyle(fontWeight: FontWeight.w600, fontSize: 16),
                            ),
                            if (_ruc != null)
                              Text(
                                'RUC: $_ruc',
                                style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                              ),
                          ],
                        ),
                      ),
                      IconButton(
                        icon: const Icon(Icons.close),
                        onPressed: () => Navigator.of(context).pop(),
                      ),
                    ],
                  ),
                ),
                const Divider(height: 1),
                Expanded(
                  child: items.isEmpty
                      ? Center(
                          child: Padding(
                            padding: const EdgeInsets.all(24.0),
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(Icons.inbox, size: 64, color: Colors.grey[400]),
                                const SizedBox(height: 16),
                                const Text(
                                  'No hay requisitos legales registrados.',
                                  textAlign: TextAlign.center,
                                  style: TextStyle(fontSize: 16),
                                ),
                                const SizedBox(height: 8),
                                Text(
                                  'Empresa: ${_businessName ?? "N/A"}\nRUC: ${_ruc ?? "N/A"}',
                                  textAlign: TextAlign.center,
                                  style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                                ),
                              ],
                            ),
                          ),
                        )
                      : ListView.separated(
                          padding: const EdgeInsets.all(12),
                          itemCount: items.length,
                          separatorBuilder: (_, __) => const Divider(height: 1),
                          itemBuilder: (context, index) => _LegalItemTile(it: items[index]),
                        ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}

class _MenuTile extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  const _MenuTile({required this.icon, required this.label, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Material(
      color: const Color(0xFF6E7E89),
      elevation: 4,
      borderRadius: BorderRadius.circular(16),
      shadowColor: Colors.black26,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, size: 36, color: const Color(0xFFAFC7D9)),
              const SizedBox(height: 10),
              Text(
                label,
                textAlign: TextAlign.center,
                style: const TextStyle(fontWeight: FontWeight.w600, color: Colors.white),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _LegalItemTile extends StatelessWidget {
  final Map<String, dynamic> it;
  const _LegalItemTile({required this.it});

  @override
  Widget build(BuildContext context) {
    final name = (it['name'] ?? '').toString();
    final pdfs = (it['pdfs'] as List?)?.cast<Map<String, dynamic>>() ?? const [];
    return ListTile(
      title: Text(name, style: const TextStyle(fontWeight: FontWeight.w600)),
      subtitle: Padding(
        padding: const EdgeInsets.only(top: 6),
        child: Wrap(
          spacing: 6,
          runSpacing: 6,
          children: [
            if (pdfs.isEmpty)
              const Text('— Sin archivos PDF —')
            else
              for (int i = 0; i < pdfs.length; i++)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: Theme.of(context).colorScheme.primary.withOpacity(0.08),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.picture_as_pdf, size: 16, color: Theme.of(context).colorScheme.primary),
                      const SizedBox(width: 4),
                      Text('PDF ${i + 1}', style: TextStyle(fontSize: 12, color: Theme.of(context).colorScheme.primary)),
                    ],
                  ),
                ),
          ],
        ),
      ),
    );
  }
}
