import 'package:flutter/material.dart';

import 'services/auth_service.dart';
import 'services/employees_service.dart';
import 'config/app_config.dart';
import 'employee_detail_screen.dart';

class EmployeesListScreen extends StatefulWidget {
  final String? businessRuc;
  const EmployeesListScreen({super.key, this.businessRuc});

  @override
  State<EmployeesListScreen> createState() => _EmployeesListScreenState();
}

class _EmployeesListScreenState extends State<EmployeesListScreen> {
  late Future<List<Map<String, dynamic>>> _future;
  String? _ruc;

  @override
  void initState() {
    super.initState();
    final ruc = widget.businessRuc ?? AuthService().getPrimaryBusinessRuc();
    _ruc = ruc;
    _future = _load(ruc);
  }

  Future<List<Map<String, dynamic>>> _load(String? ruc) async {
    if (ruc == null || ruc.isEmpty) {
      throw Exception('No se encontró el RUC de la empresa del usuario.');
    }
    return EmployeesService().getEmployeesByBusinessRuc(ruc);
  }

  String _displayName(Map<String, dynamic> e) {
    final name = (e['name'] as String?)?.trim();
    final nombres = (e['nombres'] as String?)?.trim();
    final apellidos = (e['apellidos'] as String?)?.trim();
    if (name != null && name.isNotEmpty) return name;
    final combined = [nombres, apellidos].where((s) => s != null && s!.isNotEmpty).join(' ');
    return combined.isNotEmpty ? combined : (e['cedula']?.toString() ?? 'Empleado');
  }

  String _initials(String name) {
    final parts = name.trim().split(RegExp(r"\s+"));
    final first = parts.isNotEmpty ? parts.first : '';
    final last = parts.length > 1 ? parts.last : '';
    final initials = ((first.isNotEmpty ? first[0] : '') + (last.isNotEmpty ? last[0] : '')).toUpperCase();
    return initials.isNotEmpty ? initials : 'E';
  }

  String? _photoUrl(Map<String, dynamic> e) {
    final raw = (e['profile_picture'] ?? e['imagePath'] ?? e['profilePicture'] ?? e['photo'] ?? e['foto'] ?? e['image'])?.toString();
    final path = raw?.trim();
    if (path == null || path.isEmpty) return null;
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }
    if (path.startsWith('/api/')) {
      final lastSlash = path.lastIndexOf('/');
      final prefix = path.substring(0, lastSlash + 1);
      final last = path.substring(lastSlash + 1);
      final encodedLast = Uri.encodeComponent(last);
      final apiPath = '$prefix$encodedLast';
      return '${AppConfig.baseUrl}$apiPath';
    }
    var normalized = path.replaceAll('\\', '/');
    while (normalized.startsWith('/')) {
      normalized = normalized.substring(1);
    }
    if (normalized.startsWith('uploads/')) {
      normalized = normalized.substring('uploads/'.length);
    }
    final hasSlash = normalized.contains('/');
    final filename = hasSlash ? (normalized.split('/').last) : normalized;
    final lower = normalized.toLowerCase();
    if (lower.startsWith('profiles/')) {
      final normalizedEncoded = normalized.split('/').map(Uri.encodeComponent).join('/');
      return '${AppConfig.baseUrl}/api/files/$normalizedEncoded';
    }
    if (!hasSlash) {
      final encoded = Uri.encodeComponent(filename);
      return '${AppConfig.baseUrl}/api/files/profiles/$encoded';
    }
    final normalizedEncoded = normalized.split('/').map(Uri.encodeComponent).join('/');
    return '${AppConfig.baseUrl}/api/files/$normalizedEncoded';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Talento Humano'),
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
          final employees = snapshot.data ?? [];
          if (employees.isEmpty) {
            return const Center(child: Text('No hay personas registradas.'));
          }
          return ListView.builder(
            itemCount: employees.length,
            itemBuilder: (context, index) {
              final e = employees[index];
              final title = _displayName(e);
              final cedula = e['cedula']?.toString() ?? '';
              final phone = e['phone']?.toString() ?? '';
              final email = e['email']?.toString() ?? '';
              final subtitleParts = [
                if (cedula.isNotEmpty) 'Cédula: $cedula',
                if (phone.isNotEmpty) 'Tel: $phone',
                if (email.isNotEmpty) email,
              ];
              final photo = _photoUrl(e);
              return Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  ListTile(
                    leading: CircleAvatar(
                      backgroundColor: Theme.of(context).colorScheme.primaryContainer,
                      foregroundColor: Theme.of(context).colorScheme.onPrimaryContainer,
                      child: photo != null
                          ? ClipOval(
                              child: Image.network(
                                photo,
                                fit: BoxFit.cover,
                                width: 40,
                                height: 40,
                                loadingBuilder: (context, child, loadingProgress) {
                                  if (loadingProgress == null) return child;
                                  return Center(child: Text(_initials(title)));
                                },
                                errorBuilder: (context, error, stackTrace) {
                                  return Center(child: Text(_initials(title)));
                                },
                              ),
                            )
                          : Text(_initials(title)),
                    ),
                    title: Text(title),
                    subtitle: subtitleParts.isNotEmpty ? Text(subtitleParts.join(' · ')) : null,
                    onTap: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => EmployeeDetailScreen(employee: e),
                        ),
                      );
                    },
                  ),
                  const Divider(height: 1),
                ],
              );
            },
          );
        },
      ),
    );
  }
}
