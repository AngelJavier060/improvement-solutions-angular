package com.improvementsolutions.controller;

import com.improvementsolutions.model.aula.AulaCurso;
import com.improvementsolutions.service.AulaVirtualService;
import com.improvementsolutions.storage.StorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/aula")
@RequiredArgsConstructor
public class AulaVirtualController {

    private final AulaVirtualService aulaService;
    private final StorageService storageService;

    @GetMapping("/business/{businessId}")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    public List<Map<String, Object>> listar(@PathVariable Long businessId, Authentication auth) {
        return aulaService.listar(businessId, auth);
    }

    @PostMapping(value = "/business/{businessId}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    public Map<String, Object> crear(@PathVariable Long businessId,
                                     @RequestPart("datos") String datos,
                                     @RequestPart(value = "video", required = false) MultipartFile video,
                                     @RequestPart(value = "pdf", required = false) MultipartFile pdf,
                                     Authentication auth) {
        return aulaService.crear(businessId, datos, video, pdf, auth);
    }

    @PatchMapping("/business/{businessId}/{cursoId}/limite")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    public Map<String, Object> cambiarLimite(@PathVariable Long businessId,
                                             @PathVariable Long cursoId,
                                             @RequestBody Map<String, String> body,
                                             Authentication auth) {
        return aulaService.cambiarLimite(businessId, cursoId, body == null ? null : body.get("horaLimite"), auth);
    }

    @PutMapping("/business/{businessId}/{cursoId}/preguntas")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    public Map<String, Object> preguntas(@PathVariable Long businessId,
                                         @PathVariable Long cursoId,
                                         @RequestBody Map<String, Object> body,
                                         Authentication auth) {
        return aulaService.reemplazarPreguntas(businessId, cursoId, body == null ? null : body.get("preguntas"), auth);
    }

    @DeleteMapping("/business/{businessId}/{cursoId}")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    public void eliminar(@PathVariable Long businessId, @PathVariable Long cursoId, Authentication auth) {
        aulaService.eliminar(businessId, cursoId, auth);
    }

    @GetMapping("/business/{businessId}/{cursoId}/video")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN','EMPLOYEE')")
    public ResponseEntity<Resource> video(@PathVariable Long businessId, @PathVariable Long cursoId, Authentication auth) {
        AulaCurso curso = aulaService.archivo(businessId, cursoId, true, auth);
        return archivo(curso.getVideoPath(), curso.getVideoNombre(), true);
    }

    @GetMapping("/business/{businessId}/{cursoId}/material")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN','EMPLOYEE')")
    public ResponseEntity<Resource> material(@PathVariable Long businessId, @PathVariable Long cursoId, Authentication auth) {
        AulaCurso curso = aulaService.archivo(businessId, cursoId, false, auth);
        return archivo(curso.getMaterialPath(), curso.getMaterialNombre(), false);
    }

    @GetMapping("/my")
    @PreAuthorize("hasRole('EMPLOYEE')")
    public List<Map<String, Object>> mios(Authentication auth) {
        return aulaService.misCursos(auth);
    }

    @PostMapping("/my/{cursoId}/ingreso")
    @PreAuthorize("hasRole('EMPLOYEE')")
    public void ingreso(@PathVariable Long cursoId, Authentication auth) {
        aulaService.ingresarSala(cursoId, auth);
    }

    @PostMapping("/my/{cursoId}/video-visto")
    @PreAuthorize("hasRole('EMPLOYEE')")
    public void videoVisto(@PathVariable Long cursoId, Authentication auth) {
        aulaService.marcarVideo(cursoId, auth);
    }

    @PostMapping("/my/{cursoId}/evaluacion/iniciar")
    @PreAuthorize("hasRole('EMPLOYEE')")
    public Map<String, Object> iniciar(@PathVariable Long cursoId, Authentication auth) {
        return aulaService.iniciarEvaluacion(cursoId, auth);
    }

    @PostMapping("/my/{cursoId}/evaluacion")
    @PreAuthorize("hasRole('EMPLOYEE')")
    public Map<String, Object> responder(@PathVariable Long cursoId, @RequestBody Map<String, List<Integer>> body, Authentication auth) {
        return aulaService.responder(cursoId, body == null ? List.of() : body.get("respuestas"), auth);
    }

    private ResponseEntity<Resource> archivo(String path, String nombre, boolean video) {
        Resource resource = storageService.loadAsResource(path);
        String tipo = video ? "video/mp4" : "application/pdf";
        if (nombre != null && nombre.toLowerCase().endsWith(".webm")) tipo = "video/webm";
        if (nombre != null && nombre.toLowerCase().endsWith(".mov")) tipo = "video/quicktime";
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + (nombre == null ? "archivo" : nombre) + "\"")
                .contentType(MediaType.parseMediaType(tipo))
                .body(resource);
    }
}
