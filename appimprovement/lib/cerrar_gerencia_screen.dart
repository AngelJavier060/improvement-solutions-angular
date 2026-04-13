import 'package:flutter/material.dart';
import 'services/gerencia_viaje_service.dart';
import 'widgets/cierre_gerencia_km_panel.dart';

/// Pantalla dedicada para cerrar una gerencia abierta (acceso rápido desde avisos).
class CerrarGerenciaScreen extends StatelessWidget {
  final GerenciaViajeDto gerencia;
  final GerenciaViajeDto? ultimaGerenciaMismaPlaca;

  const CerrarGerenciaScreen({
    super.key,
    required this.gerencia,
    this.ultimaGerenciaMismaPlaca,
  });

  @override
  Widget build(BuildContext context) {
    final codigo = gerencia.codigo ?? 'Gerencia';
    final placa = gerencia.vehiculoInicio ?? '—';
    final conductor = gerencia.conductor ?? '—';

    return Scaffold(
      backgroundColor: const Color(0xFFF5F7F9),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          onPressed: () => Navigator.pop(context, false),
          icon: const Icon(Icons.arrow_back, color: Color(0xFF2563EB)),
        ),
        title: Text(
          'Cerrar $codigo',
          style: const TextStyle(
            color: Color(0xFF1E293B),
            fontSize: 17,
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Viaje abierto',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: Color(0xFF64748B),
                      letterSpacing: 0.5,
                    ),
                  ),
                  const SizedBox(height: 8),
                  _infoRow(Icons.tag, 'Código', codigo),
                  const SizedBox(height: 6),
                  _infoRow(Icons.directions_car, 'Placa', placa),
                  const SizedBox(height: 6),
                  _infoRow(Icons.person_outline, 'Conductor', conductor),
                ],
              ),
            ),
            const SizedBox(height: 20),
            const Text(
              'Kilometraje de cierre',
              style: TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w800,
                color: Color(0xFF0F172A),
              ),
            ),
            const SizedBox(height: 8),
            CierreGerenciaKmPanel(
              gerencia: gerencia,
              ultimaGerenciaMismaPlaca: ultimaGerenciaMismaPlaca,
              onSubmit: (km) async {
                final id = gerencia.id;
                if (id == null) {
                  throw Exception('Gerencia sin id válido');
                }
                final service = GerenciaViajeService();
                await service.cerrar(id, km);
              },
              onSuccess: () {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Gerencia cerrada correctamente'),
                    backgroundColor: Colors.green,
                  ),
                );
                Navigator.pop(context, true);
              },
              onCancel: () => Navigator.pop(context, false),
            ),
          ],
        ),
      ),
    );
  }

  static Widget _infoRow(IconData icon, String label, String value) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 18, color: const Color(0xFF0050D4)),
        const SizedBox(width: 10),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label.toUpperCase(),
                style: const TextStyle(
                  fontSize: 9,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF94A3B8),
                  letterSpacing: 0.6,
                ),
              ),
              Text(
                value,
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: Color(0xFF1E293B),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
