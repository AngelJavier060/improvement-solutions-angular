package com.improvementsolutions.controller;

import com.improvementsolutions.dto.training.*;
import com.improvementsolutions.service.training.TrainingPlanService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/ssa-training/{ruc}")
@RequiredArgsConstructor
public class TrainingPlanController {

    private final TrainingPlanService trainingPlanService;

    @GetMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'USER')")
    public ResponseEntity<TrainingYearDto> year(
            @PathVariable String ruc,
            @RequestParam(required = false) Integer year,
            Authentication auth) {
        return ResponseEntity.ok(trainingPlanService.getYear(ruc, year, auth));
    }

    @GetMapping("/sessions")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'USER')")
    public ResponseEntity<List<TrainingSessionDto>> sessions(
            @PathVariable String ruc,
            @RequestParam(required = false) Integer year) {
        return ResponseEntity.ok(trainingPlanService.sessions(ruc, year));
    }

    @GetMapping("/workers")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'USER')")
    public ResponseEntity<List<TrainingWorkerDto>> workers(
            @PathVariable String ruc,
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) String q) {
        return ResponseEntity.ok(trainingPlanService.workers(ruc, year, q));
    }

    @GetMapping("/workers/{employeeId}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'USER')")
    public ResponseEntity<TrainingWorkerDto> worker(
            @PathVariable String ruc,
            @PathVariable Long employeeId,
            @RequestParam(required = false) Integer year) {
        return ResponseEntity.ok(trainingPlanService.worker(ruc, employeeId, year));
    }

    @GetMapping("/items/{itemId}/missing")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'USER')")
    public ResponseEntity<TrainingMissingDto> missing(
            @PathVariable String ruc,
            @PathVariable Long itemId) {
        return ResponseEntity.ok(trainingPlanService.missing(ruc, itemId));
    }

    @GetMapping("/items/{itemId}/people")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'USER')")
    public ResponseEntity<List<TrainingPersonDto>> people(
            @PathVariable String ruc,
            @PathVariable Long itemId) {
        return ResponseEntity.ok(trainingPlanService.obligatedPeople(ruc, itemId));
    }

    @GetMapping("/people")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'USER')")
    public ResponseEntity<List<TrainingPersonDto>> audiencePeople(
            @PathVariable String ruc,
            @RequestParam(required = false, defaultValue = "ALL") String audience) {
        return ResponseEntity.ok(trainingPlanService.audiencePeople(ruc, audience));
    }

    @PostMapping(value = "/sessions", consumes = MediaType.APPLICATION_JSON_VALUE)
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    public ResponseEntity<TrainingSessionDto> createSession(
            @PathVariable String ruc,
            @RequestBody TrainingSessionRequest body,
            Authentication auth) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(trainingPlanService.createSession(ruc, body, auth));
    }

    @PostMapping(value = "/sessions", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    public ResponseEntity<TrainingSessionDto> createSessionWithEvidence(
            @PathVariable String ruc,
            @RequestPart("data") TrainingSessionRequest body,
            @RequestPart(value = "file", required = false) org.springframework.web.multipart.MultipartFile file,
            @RequestPart(value = "photos", required = false) List<org.springframework.web.multipart.MultipartFile> photos,
            Authentication auth) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(trainingPlanService.createSession(ruc, body, file, photos, auth));
    }

    @PostMapping(value = "/items/eventual", consumes = MediaType.APPLICATION_JSON_VALUE)
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    public ResponseEntity<TrainingItemDto> addEventual(
            @PathVariable String ruc,
            @RequestBody TrainingItemDto body,
            Authentication auth) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(trainingPlanService.addEventual(ruc, body, auth));
    }

    @PostMapping(value = "/items/eventual", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    public ResponseEntity<TrainingItemDto> addEventualWithEvidence(
            @PathVariable String ruc,
            @RequestPart("data") TrainingItemDto body,
            @RequestPart(value = "pdf", required = false) org.springframework.web.multipart.MultipartFile pdf,
            @RequestPart(value = "photos", required = false) List<org.springframework.web.multipart.MultipartFile> photos,
            Authentication auth) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(trainingPlanService.addEventual(ruc, body, pdf, photos, auth));
    }

    @PostMapping("/document")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    public ResponseEntity<TrainingYearDto> approveDocument(
            @PathVariable String ruc,
            @RequestParam(required = false) Integer year,
            @RequestParam("file") org.springframework.web.multipart.MultipartFile file,
            Authentication auth) {
        return ResponseEntity.ok(trainingPlanService.approveDocument(ruc, year, file, auth));
    }

    @PutMapping(value = "/items/{itemId}", consumes = MediaType.APPLICATION_JSON_VALUE)
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    public ResponseEntity<TrainingItemDto> updateItem(
            @PathVariable String ruc,
            @PathVariable Long itemId,
            @RequestBody TrainingItemDto body,
            Authentication auth) {
        return ResponseEntity.ok(trainingPlanService.updateItem(ruc, itemId, body, auth));
    }

    @PutMapping(value = "/items/{itemId}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    public ResponseEntity<TrainingItemDto> updateItemWithEvidence(
            @PathVariable String ruc,
            @PathVariable Long itemId,
            @RequestPart("data") TrainingItemDto body,
            @RequestPart(value = "pdf", required = false) org.springframework.web.multipart.MultipartFile pdf,
            @RequestPart(value = "photos", required = false) List<org.springframework.web.multipart.MultipartFile> photos,
            Authentication auth) {
        return ResponseEntity.ok(trainingPlanService.updateItem(ruc, itemId, body, pdf, photos, auth));
    }

    @DeleteMapping("/items/{itemId}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    public ResponseEntity<Void> deleteItem(
            @PathVariable String ruc,
            @PathVariable Long itemId,
            Authentication auth) {
        trainingPlanService.deleteItem(ruc, itemId, auth);
        return ResponseEntity.noContent().build();
    }
}
