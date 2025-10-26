import 'package:flutter/material.dart';

import 'config/app_config.dart';
import 'services/auth_service.dart';

class EmployeeDetailScreen extends StatelessWidget {
  final Map<String, dynamic> employee;
  const EmployeeDetailScreen({super.key, required this.employee});

  String _displayName(Map<String, dynamic> e) {
    final name = (e['name'] as String?)?.trim();
    final nombres = (e['nombres'] as String?)?.trim();
    final apellidos = (e['apellidos'] as String?)?.trim();
    if (name != null && name.isNotEmpty) return name;
    final combined = [nombres, apellidos].where((s) => s != null && s!.isNotEmpty).join(' ');
    return combined.isNotEmpty ? combined : (e['cedula']?.toString() ?? 'Empleado');
  }

  String? _photoUrl(Map<String, dynamic> e) {
    final raw = (e['profile_picture'] ?? e['imagePath'] ?? e['profilePicture'] ?? e['photo'] ?? e['foto'] ?? e['image'])?.toString();
    final path = raw?.trim();
    if (path == null || path.isEmpty) return null;
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    if (path.startsWith('/api/')) {
      final lastSlash = path.lastIndexOf('/');
      final prefix = path.substring(0, lastSlash + 1);
      final last = path.substring(lastSlash + 1);
      return '${AppConfig.baseUrl}$prefix${Uri.encodeComponent(last)}';
    }
    var normalized = path.replaceAll('\\', '/');
    while (normalized.startsWith('/')) normalized = normalized.substring(1);
    if (normalized.startsWith('uploads/')) normalized = normalized.substring('uploads/'.length);
    final hasSlash = normalized.contains('/');
    final filename = hasSlash ? (normalized.split('/').last) : normalized;
    final lower = normalized.toLowerCase();
    if (lower.startsWith('profiles/')) {
      final encoded = normalized.split('/').map(Uri.encodeComponent).join('/');
      return '${AppConfig.baseUrl}/api/files/$encoded';
    }
    if (!hasSlash) {
      return '${AppConfig.baseUrl}/api/files/profiles/${Uri.encodeComponent(filename)}';
    }
    final encoded = normalized.split('/').map(Uri.encodeComponent).join('/');
    return '${AppConfig.baseUrl}/api/files/$encoded';
  }

  Widget _infoRow(IconData icon, String label, String value) {
    if (value.trim().isEmpty) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 18, color: Colors.grey.shade700),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label, style: TextStyle(fontSize: 12, color: Colors.grey.shade600)),
                const SizedBox(height: 2),
                Text(value, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
              ],
            ),
          )
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final title = _displayName(employee);
    final cedula = employee['cedula']?.toString() ?? '';
    final phone = employee['phone']?.toString() ?? '';
    final email = employee['email']?.toString() ?? '';
    final position = employee['positionName']?.toString() ?? employee['position']?.toString() ?? '';
    final photo = _photoUrl(employee);

    return Scaffold(
      appBar: AppBar(
        title: Text(title),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 640),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child: Container(
                    width: 160,
                    height: 160,
                    color: Colors.grey.shade200,
                    child: photo != null
                        ? Image.network(
                            photo,
                            fit: BoxFit.cover,
                            loadingBuilder: (context, child, loadingProgress) {
                              if (loadingProgress == null) return child;
                              return const Center(child: Icon(Icons.person, size: 72, color: Colors.grey));
                            },
                            errorBuilder: (_, __, ___) => const Icon(Icons.person, size: 72, color: Colors.grey),
                          )
                        : const Icon(Icons.person, size: 72, color: Colors.grey),
                  ),
                ),
                const SizedBox(height: 16),
                Text(title, style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold)),
                const SizedBox(height: 4),
                if (position.isNotEmpty)
                  Text(position, style: TextStyle(color: Colors.grey.shade700)),
                const SizedBox(height: 16),
                Card(
                  elevation: 0.5,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Información', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
                        const SizedBox(height: 8),
                        _infoRow(Icons.badge, 'Cédula', cedula),
                        _infoRow(Icons.phone, 'Teléfono', phone),
                        _infoRow(Icons.email, 'Email', email),
                      ],
                    ),
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
