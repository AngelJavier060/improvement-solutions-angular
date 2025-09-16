package com.improvementsolutions.controller;

import com.improvementsolutions.dto.ContractorBlockDto;
import com.improvementsolutions.service.ContractorBlockService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/contractor-blocks")
@RequiredArgsConstructor
public class ContractorBlockController {

    private final ContractorBlockService contractorBlockService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<List<ContractorBlockDto>> getAllBlocks() {
        List<ContractorBlockDto> blocks = contractorBlockService.getAllBlocks();
        return ResponseEntity.ok(blocks);
    }

    @GetMapping("/active")
    @PreAuthorize("hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<List<ContractorBlockDto>> getAllActiveBlocks() {
        List<ContractorBlockDto> blocks = contractorBlockService.getAllActiveBlocks();
        return ResponseEntity.ok(blocks);
    }

    @GetMapping("/by-company/{companyId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<List<ContractorBlockDto>> getBlocksByCompanyId(@PathVariable Long companyId) {
        List<ContractorBlockDto> blocks = contractorBlockService.getBlocksByCompanyId(companyId);
        return ResponseEntity.ok(blocks);
    }

    @GetMapping("/by-company/{companyId}/active")
    @PreAuthorize("hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<List<ContractorBlockDto>> getActiveBlocksByCompanyId(@PathVariable Long companyId) {
        List<ContractorBlockDto> blocks = contractorBlockService.getActiveBlocksByCompanyId(companyId);
        return ResponseEntity.ok(blocks);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<ContractorBlockDto> getBlockById(@PathVariable Long id) {
        return contractorBlockService.getBlockById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/by-code/{code}")
    @PreAuthorize("hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<ContractorBlockDto> getBlockByCode(@PathVariable String code) {
        return contractorBlockService.getBlockByCode(code)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/search")
    @PreAuthorize("hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<List<ContractorBlockDto>> searchBlocksByName(@RequestParam String name) {
        List<ContractorBlockDto> blocks = contractorBlockService.searchBlocksByName(name);
        return ResponseEntity.ok(blocks);
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> createBlock(@RequestBody ContractorBlockDto blockDto) {
        try {
            ContractorBlockDto createdBlock = contractorBlockService.createBlock(blockDto);
            return new ResponseEntity<>(createdBlock, HttpStatus.CREATED);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> updateBlock(@PathVariable Long id, @RequestBody ContractorBlockDto blockDto) {
        try {
            return contractorBlockService.updateBlock(id, blockDto)
                    .map(ResponseEntity::ok)
                    .orElse(ResponseEntity.notFound().build());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deleteBlock(@PathVariable Long id) {
        try {
            if (contractorBlockService.deleteBlock(id)) {
                return ResponseEntity.noContent().build();
            }
            return ResponseEntity.notFound().build();
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PatchMapping("/{id}/toggle-status")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<String> toggleBlockStatus(@PathVariable Long id) {
        if (contractorBlockService.toggleBlockStatus(id)) {
            return ResponseEntity.ok("Estado actualizado correctamente");
        }
        return ResponseEntity.notFound().build();
    }
}