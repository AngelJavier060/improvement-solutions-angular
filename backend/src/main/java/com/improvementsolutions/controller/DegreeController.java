package com.improvementsolutions.controller;

import com.improvementsolutions.dto.DegreeDto;
import com.improvementsolutions.service.DegreeService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/estudios") // Ruta corregida sin /api para evitar duplicidad con el context-path
@CrossOrigin(origins = "http://localhost:4200") // Añadir anotación para permitir peticiones desde el frontend
public class DegreeController {

    private final DegreeService degreeService;

    @Autowired
    public DegreeController(DegreeService degreeService) {
        this.degreeService = degreeService;
    }

    @GetMapping
    public ResponseEntity<List<DegreeDto>> getAllDegrees() {
        return ResponseEntity.ok(degreeService.getAllDegrees());
    }

    @GetMapping("/{id}")
    public ResponseEntity<DegreeDto> getDegreeById(@PathVariable Long id) {
        return ResponseEntity.ok(degreeService.getDegreeById(id));
    }

    @PostMapping
    public ResponseEntity<DegreeDto> createDegree(@RequestBody DegreeDto degreeDto) {
        return new ResponseEntity<>(degreeService.createDegree(degreeDto), HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    public ResponseEntity<DegreeDto> updateDegree(@PathVariable Long id, @RequestBody DegreeDto degreeDto) {
        return ResponseEntity.ok(degreeService.updateDegree(id, degreeDto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteDegree(@PathVariable Long id) {
        degreeService.deleteDegree(id);
        return ResponseEntity.noContent().build();
    }
}