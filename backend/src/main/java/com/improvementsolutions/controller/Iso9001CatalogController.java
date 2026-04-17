package com.improvementsolutions.controller;

import com.improvementsolutions.model.Iso9001CatalogItem;
import com.improvementsolutions.service.Iso9001CatalogService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/master-data/iso-9001-catalog")
@RequiredArgsConstructor
public class Iso9001CatalogController {

    private final Iso9001CatalogService iso9001CatalogService;

    @GetMapping("/{catalogCode}")
    public ResponseEntity<List<Iso9001CatalogItem>> listByCatalog(@PathVariable String catalogCode) {
        try {
            return ResponseEntity.ok(iso9001CatalogService.findAllByCatalog(catalogCode));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @GetMapping("/{catalogCode}/{id}")
    public ResponseEntity<Iso9001CatalogItem> getOne(@PathVariable String catalogCode, @PathVariable Long id) {
        try {
            return iso9001CatalogService.findByCatalogAndId(catalogCode, id)
                    .map(ResponseEntity::ok)
                    .orElse(ResponseEntity.notFound().build());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PostMapping("/{catalogCode}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    public ResponseEntity<Iso9001CatalogItem> create(
            @PathVariable String catalogCode,
            @RequestBody Iso9001CatalogItem body) {
        try {
            Iso9001CatalogItem created = iso9001CatalogService.create(catalogCode, body);
            return ResponseEntity.status(HttpStatus.CREATED).body(created);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        } catch (IllegalStateException e) {
            if ("DUPLICATE_NAME".equals(e.getMessage())) {
                return ResponseEntity.status(HttpStatus.CONFLICT).build();
            }
            throw e;
        }
    }

    @PutMapping("/{catalogCode}/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    public ResponseEntity<Iso9001CatalogItem> update(
            @PathVariable String catalogCode,
            @PathVariable Long id,
            @RequestBody Iso9001CatalogItem body) {
        try {
            return ResponseEntity.ok(iso9001CatalogService.update(catalogCode, id, body));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        } catch (IllegalStateException e) {
            if ("NOT_FOUND".equals(e.getMessage())) {
                return ResponseEntity.notFound().build();
            }
            if ("DUPLICATE_NAME".equals(e.getMessage())) {
                return ResponseEntity.status(HttpStatus.CONFLICT).build();
            }
            throw e;
        }
    }

    @DeleteMapping("/{catalogCode}/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable String catalogCode, @PathVariable Long id) {
        try {
            iso9001CatalogService.delete(catalogCode, id);
            return ResponseEntity.ok().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        } catch (IllegalStateException e) {
            if ("NOT_FOUND".equals(e.getMessage())) {
                return ResponseEntity.notFound().build();
            }
            throw e;
        }
    }
}
