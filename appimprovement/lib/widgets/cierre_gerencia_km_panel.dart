import 'package:flutter/material.dart';
import '../services/gerencia_viaje_service.dart';
import '../services/vehicle_service.dart';

String _fmtKmRef(double v) {
  if (v == v.roundToDouble()) return v.round().toString();
  return v.toStringAsFixed(1);
}

double? _maxKmReferencias(Iterable<double?> values) {
  final nums = values.whereType<double>().where((x) => !x.isNaN);
  if (nums.isEmpty) return null;
  return nums.reduce((a, b) => a > b ? a : b);
}

/// Formulario de kilometraje final y referencias para cerrar una gerencia ACTIVO.
class CierreGerenciaKmPanel extends StatefulWidget {
  final GerenciaViajeDto gerencia;
  final GerenciaViajeDto? ultimaGerenciaMismaPlaca;
  final Future<void> Function(double kmFinal) onSubmit;
  final VoidCallback onSuccess;
  final VoidCallback onCancel;

  const CierreGerenciaKmPanel({
    super.key,
    required this.gerencia,
    this.ultimaGerenciaMismaPlaca,
    required this.onSubmit,
    required this.onSuccess,
    required this.onCancel,
  });

  @override
  State<CierreGerenciaKmPanel> createState() => _CierreGerenciaKmPanelState();
}

class _CierreGerenciaKmPanelState extends State<CierreGerenciaKmPanel> {
  final _kmFinalController = TextEditingController();
  final GerenciaViajeService _gerenciaKmService = GerenciaViajeService();
  final VehicleService _vehicleService = VehicleService();
  double? _ultimoKmApi;
  int? _kmFlotaInicio;
  bool _loadingKmRefs = false;
  bool _submitting = false;

  double? get _kmMinimoPermitido => _maxKmReferencias([
        widget.gerencia.kmInicial,
        _ultimoKmApi,
        _kmFlotaInicio?.toDouble(),
      ]);

  @override
  void initState() {
    super.initState();
    _loadKmReferencias();
  }

  @override
  void dispose() {
    _kmFinalController.dispose();
    super.dispose();
  }

  Future<void> _loadKmReferencias() async {
    final placa = (widget.gerencia.vehiculoInicio ?? '').trim();
    if (placa.isEmpty) return;

    setState(() => _loadingKmRefs = true);
    try {
      final ultimo = await _gerenciaKmService.getUltimoKm(placa);
      final v = await _vehicleService.getByPlaca(placa);
      if (!mounted) return;
      setState(() {
        _ultimoKmApi = ultimo;
        _kmFlotaInicio = v?.kmInicio;
      });
    } finally {
      if (mounted) setState(() => _loadingKmRefs = false);
    }
  }

  String _lineaUltimoViajeCerrado() {
    final u = widget.ultimaGerenciaMismaPlaca!;
    final buf = StringBuffer('Último viaje cerrado: ${u.codigo ?? '—'}');
    if (u.kmFinal != null) buf.write(' · km final ${_fmtKmRef(u.kmFinal!)}');
    final d = u.fechaCierre ?? u.fechaHora;
    if (d != null) {
      buf.write(
        ' · ${d.day.toString().padLeft(2, '0')}/${d.month.toString().padLeft(2, '0')}/${d.year}',
      );
    }
    return buf.toString();
  }

  Future<void> _confirmar() async {
    if (_kmFinalController.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Ingrese el kilometraje final'),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }
    final km = double.tryParse(_kmFinalController.text.replaceAll(',', '.'));
    if (km == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Kilometraje inválido'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }
    final minK = _kmMinimoPermitido;
    if (minK != null && km < minK) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'El kilometraje final no puede ser menor a ${_fmtKmRef(minK)} km (referencias mostradas arriba).',
          ),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    setState(() => _submitting = true);
    try {
      await widget.onSubmit(km);
      if (!mounted) return;
      widget.onSuccess();
    } catch (e) {
      if (!mounted) return;
      final msg = e.toString().replaceFirst(RegExp(r'^Exception:\s*'), '');
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(msg), backgroundColor: Colors.red),
      );
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final kmIni = widget.gerencia.kmInicial;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFFEEF1F3).withValues(alpha: 0.5),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFD9DDE0).withValues(alpha: 0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'KILOMETRAJE FINAL',
                style: TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF595C5E),
                  letterSpacing: 0.5,
                ),
              ),
              const SizedBox(width: 4),
              Text(
                '*',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                  color: const Color(0xFF0050D4),
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            'El asterisco indica campo obligatorio.',
            style: TextStyle(
              fontSize: 10,
              color: const Color(0xFF595C5E).withValues(alpha: 0.85),
              height: 1.2,
            ),
          ),
          const SizedBox(height: 10),
          if (_loadingKmRefs)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 8),
              child: Row(
                children: [
                  SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  ),
                  SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      'Cargando referencias de kilometraje…',
                      style: TextStyle(fontSize: 11, color: Color(0xFF595C5E)),
                    ),
                  ),
                ],
              ),
            )
          else ...[
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: const Color(0xFF0050D4).withValues(alpha: 0.25)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Referencias (misma placa)',
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.w800,
                      color: Color(0xFF0050D4),
                      letterSpacing: 0.3,
                    ),
                  ),
                  const SizedBox(height: 6),
                  if (kmIni != null)
                    Text(
                      'KM al inicio de este viaje: ${_fmtKmRef(kmIni)} km',
                      style: const TextStyle(fontSize: 11, color: Color(0xFF2C2F31)),
                    ),
                  if (kmIni == null)
                    const Text(
                      'KM al inicio de este viaje: no registrado',
                      style: TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                    ),
                  const SizedBox(height: 4),
                  Text(
                    _ultimoKmApi != null
                        ? 'Mayor km en cierres anteriores (gerencias): ${_fmtKmRef(_ultimoKmApi!)} km'
                        : 'Mayor km en cierres anteriores (gerencias): sin registros previos',
                    style: TextStyle(
                      fontSize: 11,
                      color: _ultimoKmApi != null
                          ? const Color(0xFF2C2F31)
                          : const Color(0xFF64748B),
                    ),
                  ),
                  if (_kmFlotaInicio != null) ...[
                    const SizedBox(height: 4),
                    Text(
                      'KM en ficha de flota (inicio): ${_kmFlotaInicio!} km',
                      style: const TextStyle(fontSize: 11, color: Color(0xFF2C2F31)),
                    ),
                  ],
                  if (widget.ultimaGerenciaMismaPlaca != null) ...[
                    const SizedBox(height: 6),
                    Text(
                      _lineaUltimoViajeCerrado(),
                      style: const TextStyle(fontSize: 10, color: Color(0xFF475569), height: 1.25),
                    ),
                  ],
                  if (_kmMinimoPermitido != null) ...[
                    const SizedBox(height: 8),
                    Text(
                      'Mínimo permitido al cierre: ${_fmtKmRef(_kmMinimoPermitido!)} km',
                      style: const TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w800,
                        color: Color(0xFF0F172A),
                      ),
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 8),
          ],
          Container(
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: const Color(0xFFABADAF)),
            ),
            child: TextField(
              controller: _kmFinalController,
              keyboardType: TextInputType.number,
              decoration: InputDecoration(
                hintText: 'Ej. 125430',
                hintStyle: TextStyle(color: const Color(0xFF595C5E).withValues(alpha: 0.5)),
                prefixIcon: const Icon(Icons.speed, color: Color(0xFF595C5E), size: 20),
                border: InputBorder.none,
                contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
              ),
            ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: _submitting ? null : widget.onCancel,
                  style: OutlinedButton.styleFrom(
                    foregroundColor: const Color(0xFF595C5E),
                    side: const BorderSide(color: Color(0xFFABADAF)),
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                  child: const Text('Cancelar'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                flex: 2,
                child: ElevatedButton.icon(
                  onPressed: (_loadingKmRefs || _submitting) ? null : _confirmar,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF0050D4),
                    foregroundColor: Colors.white,
                    disabledBackgroundColor: const Color(0xFF94A3B8),
                    disabledForegroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    elevation: 2,
                  ),
                  icon: _submitting
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                        )
                      : const Icon(Icons.task_alt, size: 18),
                  label: Text(
                    _loadingKmRefs
                        ? 'Esperando datos…'
                        : _submitting
                            ? 'Cerrando…'
                            : 'Confirmar cierre',
                    style: const TextStyle(fontWeight: FontWeight.bold),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
