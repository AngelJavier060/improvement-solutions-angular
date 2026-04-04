package com.improvementsolutions.controller;

import com.improvementsolutions.dto.ErrorResponse;
import com.improvementsolutions.dto.fleet.FleetVehicleWriteDto;
import com.improvementsolutions.service.FleetVehicleService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/fleet")
@RequiredArgsConstructor
@Slf4j
public class FleetController {

    private final FleetVehicleService fleetVehicleService;

    /**
     * Catálogos de ficha técnica según la configuración de mantenimiento de la empresa (por RUC).
     */
    @GetMapping("/{ruc}/ficha-catalogs")
    public ResponseEntity<?> getFichaCatalogs(@PathVariable String ruc) {
        try {
            return ResponseEntity.ok(fleetVehicleService.getFichaCatalogsByRuc(ruc));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(new ErrorResponse(e.getMessage(), "NOT_FOUND", 404));
        } catch (Exception e) {
            log.error("[Fleet] ficha-catalogs: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponse("Error al cargar catálogos", "INTERNAL", 500));
        }
    }

    @GetMapping("/{ruc}/vehicles")
    public ResponseEntity<?> listVehicles(
            @PathVariable String ruc,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "25") int pageSize) {
        try {
            return ResponseEntity.ok(fleetVehicleService.listVehicles(ruc, page, pageSize));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(new ErrorResponse(e.getMessage(), "NOT_FOUND", 404));
        } catch (Exception e) {
            log.error("[Fleet] list: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponse("Error al listar flota", "INTERNAL", 500));
        }
    }

    @PostMapping("/{ruc}/vehicles")
    public ResponseEntity<?> createVehicle(@PathVariable String ruc, @RequestBody FleetVehicleWriteDto body) {
        try {
            Map<String, Object> created = fleetVehicleService.createVehicle(ruc, body);
            return ResponseEntity.status(HttpStatus.CREATED).body(created);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(new ErrorResponse(e.getMessage(), "BAD_REQUEST", 400));
        } catch (Exception e) {
            log.error("[Fleet] create: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponse("Error al guardar la ficha", "INTERNAL", 500));
        }
    }

    @GetMapping("/{ruc}/vehicles/{id}")
    public ResponseEntity<?> getVehicle(@PathVariable String ruc, @PathVariable Long id) {
        try {
            return ResponseEntity.ok(fleetVehicleService.getVehicleByRucAndId(ruc, id));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(new ErrorResponse(e.getMessage(), "NOT_FOUND", 404));
        } catch (Exception e) {
            log.error("[Fleet] get: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponse("Error al obtener el vehículo", "INTERNAL", 500));
        }
    }

    @PutMapping("/{ruc}/vehicles/{id}")
    public ResponseEntity<?> updateVehicle(
            @PathVariable String ruc,
            @PathVariable Long id,
            @RequestBody FleetVehicleWriteDto body) {
        try {
            return ResponseEntity.ok(fleetVehicleService.updateVehicle(ruc, id, body));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(new ErrorResponse(e.getMessage(), "BAD_REQUEST", 400));
        } catch (Exception e) {
            log.error("[Fleet] update: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponse("Error al actualizar la ficha", "INTERNAL", 500));
        }
    }

    @DeleteMapping("/{ruc}/vehicles/{id}")
    public ResponseEntity<?> deleteVehicle(@PathVariable String ruc, @PathVariable Long id) {
        try {
            fleetVehicleService.deleteVehicle(ruc, id);
            return ResponseEntity.noContent().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(new ErrorResponse(e.getMessage(), "NOT_FOUND", 404));
        } catch (Exception e) {
            log.error("[Fleet] delete: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponse("Error al eliminar el vehículo", "INTERNAL", 500));
        }
    }

    @GetMapping("/{ruc}/vehicles/{id}/documents")
    public ResponseEntity<?> listVehicleDocuments(@PathVariable String ruc, @PathVariable Long id) {
        try {
            List<Map<String, Object>> list = fleetVehicleService.listVehicleDocuments(ruc, id);
            return ResponseEntity.ok(list);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(new ErrorResponse(e.getMessage(), "NOT_FOUND", 404));
        } catch (Exception e) {
            log.error("[Fleet] list documents: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponse("Error al listar documentos", "INTERNAL", 500));
        }
    }

    @PostMapping(value = "/{ruc}/vehicles/{id}/documents", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> uploadVehicleDocument(
            @PathVariable String ruc,
            @PathVariable Long id,
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "description", required = false) String description) {
        try {
            Map<String, Object> created = fleetVehicleService.addVehicleDocument(ruc, id, file, description);
            return ResponseEntity.status(HttpStatus.CREATED).body(created);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(new ErrorResponse(e.getMessage(), "BAD_REQUEST", 400));
        } catch (Exception e) {
            log.error("[Fleet] upload document: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponse("Error al subir el documento", "INTERNAL", 500));
        }
    }

    @DeleteMapping("/{ruc}/vehicles/{id}/documents/{docId}")
    public ResponseEntity<?> deleteVehicleDocument(
            @PathVariable String ruc,
            @PathVariable Long id,
            @PathVariable Long docId) {
        try {
            fleetVehicleService.deleteVehicleDocument(ruc, id, docId);
            return ResponseEntity.noContent().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(new ErrorResponse(e.getMessage(), "NOT_FOUND", 404));
        } catch (Exception e) {
            log.error("[Fleet] delete document: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponse("Error al eliminar el documento", "INTERNAL", 500));
        }
    }
}
