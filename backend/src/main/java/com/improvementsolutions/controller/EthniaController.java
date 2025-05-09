package com.improvementsolutions.controller;

import com.improvementsolutions.model.Etnia;
import com.improvementsolutions.repository.EthniaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/ethnias") // IMPORTANTE: No incluir /api/v1 porque ya está configurado en server.servlet.context-path
public class EthniaController {

    private final EthniaRepository ethniaRepository;

    @Autowired
    public EthniaController(EthniaRepository ethniaRepository) {
        this.ethniaRepository = ethniaRepository;
    }

    @GetMapping
    public ResponseEntity<List<Etnia>> getAllEthnias() {
        List<Etnia> ethnias = ethniaRepository.findAll();
        return new ResponseEntity<>(ethnias, HttpStatus.OK);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Etnia> getEthniaById(@PathVariable Long id) {
        Optional<Etnia> ethnia = ethniaRepository.findById(id);
        return ethnia.map(value -> new ResponseEntity<>(value, HttpStatus.OK))
                .orElseGet(() -> new ResponseEntity<>(HttpStatus.NOT_FOUND));
    }

    @PostMapping
    public ResponseEntity<Etnia> createEthnia(@RequestBody Etnia ethnia) {
        Etnia newEthnia = ethniaRepository.save(ethnia);
        return new ResponseEntity<>(newEthnia, HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Etnia> updateEthnia(@PathVariable Long id, @RequestBody Etnia ethnia) {
        if (!ethniaRepository.existsById(id)) {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
        ethnia.setId(id);
        Etnia updatedEthnia = ethniaRepository.save(ethnia);
        return new ResponseEntity<>(updatedEthnia, HttpStatus.OK);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<HttpStatus> deleteEthnia(@PathVariable Long id) {
        if (!ethniaRepository.existsById(id)) {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
        ethniaRepository.deleteById(id);
        return new ResponseEntity<>(HttpStatus.NO_CONTENT);
    }
}