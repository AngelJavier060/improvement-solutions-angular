package com.improvementsolutions.controller.inventory;

import com.improvementsolutions.model.inventory.InventoryCategory;
import com.improvementsolutions.model.inventory.InventorySupplier;
import com.improvementsolutions.repository.inventory.InventoryCategoryRepository;
import com.improvementsolutions.repository.inventory.InventorySupplierRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.*;

@RestController
@RequestMapping("/api/inventory/catalog")
public class InventoryCatalogController {

    private final InventoryCategoryRepository categoryRepository;
    private final InventorySupplierRepository supplierRepository;

    public InventoryCatalogController(InventoryCategoryRepository categoryRepository,
                                      InventorySupplierRepository supplierRepository) {
        this.categoryRepository = categoryRepository;
        this.supplierRepository = supplierRepository;
    }

    public static class CategoryCatalogDto {
        public String name;
        public String description;
        public CategoryCatalogDto(String name, String description) {
            this.name = name;
            this.description = description;
        }
    }

    public static class SupplierCatalogDto {
        public String name;
        public String ruc;
        public String phone;
        public String email;
        public String address;
        public SupplierCatalogDto(String name, String ruc, String phone, String email, String address) {
            this.name = name;
            this.ruc = ruc;
            this.phone = phone;
            this.email = email;
            this.address = address;
        }
    }

    @GetMapping("/categories")
    @PreAuthorize("hasAnyRole('ADMIN','USER')")
    public ResponseEntity<List<CategoryCatalogDto>> listCategoryCatalog() {
        List<InventoryCategory> all = categoryRepository.findAll();
        Map<String, CategoryCatalogDto> byName = new LinkedHashMap<>();
        for (InventoryCategory c : all) {
            if (c == null) continue;
            String name = c.getName() == null ? "" : c.getName().trim();
            if (name.isEmpty()) continue;
            String key = name.toLowerCase(Locale.ROOT);
            if (!byName.containsKey(key)) {
                byName.put(key, new CategoryCatalogDto(name, c.getDescription()));
            }
        }
        return ResponseEntity.ok(new ArrayList<>(byName.values()));
    }

    @GetMapping("/suppliers")
    @PreAuthorize("hasAnyRole('ADMIN','USER')")
    public ResponseEntity<List<SupplierCatalogDto>> listSupplierCatalog() {
        List<InventorySupplier> all = supplierRepository.findAll();
        // Usar RUC como clave cuando exista; si no, deduplicar por nombre en minúsculas
        Map<String, SupplierCatalogDto> map = new LinkedHashMap<>();
        for (InventorySupplier s : all) {
            if (s == null) continue;
            String name = s.getName() == null ? "" : s.getName().trim();
            String ruc = s.getRuc() == null ? null : s.getRuc().trim();
            if (name.isEmpty() && (ruc == null || ruc.isBlank())) continue;
            String key = (ruc != null && !ruc.isBlank()) ? ("R:" + ruc) : ("N:" + name.toLowerCase(Locale.ROOT));
            if (!map.containsKey(key)) {
                map.put(key, new SupplierCatalogDto(name, ruc, s.getPhone(), s.getEmail(), s.getAddress()));
            }
        }
        return ResponseEntity.ok(new ArrayList<>(map.values()));
    }
}
