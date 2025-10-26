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

  @override
  void initState() {
    super.initState();
    final ruc = AuthService().getPrimaryBusinessRuc();
    _future = (ruc != null && ruc.isNotEmpty)
        ? LegalService().getLegalSummaryByRuc(ruc)
        : Future.value(<Map<String, dynamic>>[]);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Seguridad Industrial'),
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
          final items = snapshot.data ?? [];
          if (items.isEmpty) {
            return const Center(child: Text('No hay requisitos legales registrados.'));
          }
          return ListView.separated(
            padding: const EdgeInsets.all(12),
            itemCount: items.length,
            separatorBuilder: (_, __) => const Divider(height: 1),
            itemBuilder: (context, index) {
              final it = items[index];
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
            },
          );
        },
      ),
    );
  }
}
