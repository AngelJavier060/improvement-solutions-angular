package com.improvementsolutions.controller;

import com.improvementsolutions.dto.GerenciaViajeCierreRequest;
import com.improvementsolutions.dto.GerenciaViajeDto;
import com.improvementsolutions.service.GerenciaViajeService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/gerencias-viajes")
@RequiredArgsConstructor
public class GerenciaViajeController {

    private final GerenciaViajeService gerenciaService;

    // ── GET /api/gerencias-viajes/business/{ruc} ───────────────────────────
    @GetMapping("/business/{ruc}")
    @PreAuthorize("hasAnyAuthority('ROLE_SUPER_ADMIN', 'ROLE_ADMIN', 'ROLE_USER')")
    public ResponseEntity<List<GerenciaViajeDto>> getByRuc(@PathVariable String ruc) {
        return ResponseEntity.ok(gerenciaService.findByRuc(ruc));
    }

    // ── GET /api/gerencias-viajes/{id} ─────────────────────────────────────
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('ROLE_SUPER_ADMIN', 'ROLE_ADMIN', 'ROLE_USER')")
    public ResponseEntity<GerenciaViajeDto> getById(@PathVariable Long id) {
        return ResponseEntity.ok(gerenciaService.findById(id));
    }

    // ── POST /api/gerencias-viajes/business/{ruc} ──────────────────────────
    @PostMapping("/business/{ruc}")
    @PreAuthorize("hasAnyAuthority('ROLE_SUPER_ADMIN', 'ROLE_ADMIN', 'ROLE_USER')")
    public ResponseEntity<GerenciaViajeDto> create(
            @PathVariable String ruc,
            @RequestBody GerenciaViajeDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(gerenciaService.create(ruc, dto));
    }

    // ── PUT /api/gerencias-viajes/{id} ─────────────────────────────────────
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('ROLE_SUPER_ADMIN', 'ROLE_ADMIN', 'ROLE_USER')")
    public ResponseEntity<GerenciaViajeDto> update(
            @PathVariable Long id,
            @RequestBody GerenciaViajeDto dto) {
        return ResponseEntity.ok(gerenciaService.update(id, dto));
    }

    // ── PATCH /api/gerencias-viajes/{id}/estado ────────────────────────────
    @PatchMapping("/{id}/estado")
    @PreAuthorize("hasAnyAuthority('ROLE_SUPER_ADMIN', 'ROLE_ADMIN', 'ROLE_USER')")
    public ResponseEntity<GerenciaViajeDto> updateEstado(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        String estado = body.get("estado");
        if (estado == null || estado.isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok(gerenciaService.updateEstado(id, estado));
    }

    // ── DELETE /api/gerencias-viajes/{id} ──────────────────────────────────
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('ROLE_SUPER_ADMIN', 'ROLE_ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        gerenciaService.delete(id);
        return ResponseEntity.noContent().build();
    }

    // ── GET /api/gerencias-viajes/business/{ruc}/stats ─────────────────────
    @GetMapping("/business/{ruc}/stats")
    @PreAuthorize("hasAnyAuthority('ROLE_SUPER_ADMIN', 'ROLE_ADMIN', 'ROLE_USER')")
    public ResponseEntity<Map<String, Long>> getStats(@PathVariable String ruc) {
        return ResponseEntity.ok(gerenciaService.getStatsForBusiness(ruc));
    }

    // ── GET /api/gerencias-viajes/business/{ruc}/next-codigo ───────────────
    @GetMapping("/business/{ruc}/next-codigo")
    @PreAuthorize("hasAnyAuthority('ROLE_SUPER_ADMIN', 'ROLE_ADMIN', 'ROLE_USER')")
    public ResponseEntity<Map<String, String>> previewNextCodigo(@PathVariable String ruc) {
        return ResponseEntity.ok(Map.of("codigo", gerenciaService.previewNextCodigo(ruc)));
    }

    // ── GET /api/gerencias-viajes/business/{ruc}/conductor/{cedula}/abierta
    /**
     * Sin gerencia abierta devuelve 200 con cuerpo {@code null} (JSON {@code null}) para evitar 404 en consola/red
     * cuando es el caso normal “no hay viaje activo”.
     */
    @GetMapping("/business/{ruc}/conductor/{cedula}/abierta")
    @PreAuthorize("hasAnyAuthority('ROLE_SUPER_ADMIN', 'ROLE_ADMIN', 'ROLE_USER')")
    public ResponseEntity<GerenciaViajeDto> getAbiertaPorConductor(
            @PathVariable String ruc,
            @PathVariable String cedula) {
        return ResponseEntity.ok(gerenciaService.findAbiertaByRucAndCedula(ruc, cedula).orElse(null));
    }

    // ── GET /api/gerencias-viajes/business/{ruc}/conductor/{cedula} ────────
    @GetMapping("/business/{ruc}/conductor/{cedula}")
    @PreAuthorize("hasAnyAuthority('ROLE_SUPER_ADMIN', 'ROLE_ADMIN', 'ROLE_USER')")
    public ResponseEntity<List<GerenciaViajeDto>> getByConductor(
            @PathVariable String ruc,
            @PathVariable String cedula) {
        return ResponseEntity.ok(gerenciaService.findByRucAndCedula(ruc, cedula));
    }

    // ── GET /api/gerencias-viajes/business/{ruc}/vehiculo/{placa}/ultimo-km
    @GetMapping("/business/{ruc}/vehiculo/{placa}/ultimo-km")
    @PreAuthorize("hasAnyAuthority('ROLE_SUPER_ADMIN', 'ROLE_ADMIN', 'ROLE_USER')")
    public ResponseEntity<Map<String, Object>> getUltimoKmPorPlaca(
            @PathVariable String ruc,
            @PathVariable String placa) {
        Map<String, Object> body = new HashMap<>();
        body.put("ultimoKm", gerenciaService.getUltimoKmRegistradoParaPlaca(ruc, placa).orElse(null));
        return ResponseEntity.ok(body);
    }

    // ── PATCH /api/gerencias-viajes/{id}/cierre ───────────────────────────
    @PatchMapping("/{id}/cierre")
    @PreAuthorize("hasAnyAuthority('ROLE_SUPER_ADMIN', 'ROLE_ADMIN', 'ROLE_USER')")
    public ResponseEntity<GerenciaViajeDto> cerrar(
            @PathVariable Long id,
            @RequestBody GerenciaViajeCierreRequest body) {
        return ResponseEntity.ok(gerenciaService.cerrar(id, body));
    }
}
