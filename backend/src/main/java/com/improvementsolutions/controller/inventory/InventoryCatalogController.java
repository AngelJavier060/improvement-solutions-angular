package com.improvementsolutions.controller.inventory;

import com.improvementsolutions.model.inventory.InventoryCategory;
import com.improvementsolutions.model.inventory.InventorySupplier;
import com.improvementsolutions.repository.inventory.InventoryCategoryRepository;
import com.improvementsolutions.repository.inventory.InventorySupplierRepository;
import com.improvementsolutions.model.inventory.InventoryCategoryGlobal;
import com.improvementsolutions.repository.inventory.InventoryCategoryGlobalRepository;
import com.improvementsolutions.model.inventory.InventorySupplierGlobal;
import com.improvementsolutions.repository.inventory.InventorySupplierGlobalRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.http.HttpStatus;

import java.util.*;

@RestController
@RequestMapping("/api/inventory/catalog")
public class InventoryCatalogController {

    private final InventoryCategoryRepository categoryRepository;
    private final InventorySupplierRepository supplierRepository;
    private final InventorySupplierGlobalRepository globalSupplierRepository;
    private final InventoryCategoryGlobalRepository globalCategoryRepository;

    public InventoryCatalogController(InventoryCategoryRepository categoryRepository,
                                      InventorySupplierRepository supplierRepository,
                                      InventoryCategoryGlobalRepository globalCategoryRepository,
                                      InventorySupplierGlobalRepository globalSupplierRepository) {
        this.categoryRepository = categoryRepository;
        this.supplierRepository = supplierRepository;
        this.globalCategoryRepository = globalCategoryRepository;
        this.globalSupplierRepository = globalSupplierRepository;
    }

    public static class CategoryCatalogDto {
        public String name;
        public String description;
        public CategoryCatalogDto(String name, String description) {
            this.name = name;
            this.description = description;
        }
    }

    public static class GlobalCategoryDto {
        public Long id;
        public String name;
        public String description;
        public GlobalCategoryDto(Long id, String name, String description) {
            this.id = id;
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

    public static class GlobalSupplierDto {
        public Long id;
        public String name;
        public String ruc;
        public String phone;
        public String email;
        public String address;
        public GlobalSupplierDto(Long id, String name, String ruc, String phone, String email, String address) {
            this.id = id;
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
        List<InventoryCategoryGlobal> globals = globalCategoryRepository.findAll();
        Map<String, CategoryCatalogDto> byName = new LinkedHashMap<>();

        // 1) Global catalog first
        for (InventoryCategoryGlobal g : globals) {
            if (g == null) continue;
            String name = g.getName() == null ? "" : g.getName().trim();
            if (name.isEmpty()) continue;
            String key = name.toLowerCase(Locale.ROOT);
            if (!byName.containsKey(key)) {
                byName.put(key, new CategoryCatalogDto(name, g.getDescription()));
            }
        }

        // 2) Merge business categories (dedupe by lowercase name)
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

    @PostMapping("/categories")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    public ResponseEntity<?> createCategoryCatalog(@RequestBody CategoryCatalogDto input) {
        String name = input == null || input.name == null ? "" : input.name.trim();
        if (name.isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new com.improvementsolutions.dto.ErrorResponse("El nombre de la categoría es obligatorio", "BAD_REQUEST", 400));
        }
        if (globalCategoryRepository.findByNameIgnoreCase(name).isPresent()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new com.improvementsolutions.dto.ErrorResponse("Ya existe una categoría global con ese nombre", "BAD_REQUEST", 400));
        }

        InventoryCategoryGlobal g = new InventoryCategoryGlobal();
        g.setName(name);
        g.setDescription(input.description);
        InventoryCategoryGlobal saved = globalCategoryRepository.save(g);
        return new ResponseEntity<>(new CategoryCatalogDto(saved.getName(), saved.getDescription()), HttpStatus.CREATED);
    }

    @GetMapping("/categories/global")
    @PreAuthorize("hasAnyRole('ADMIN','USER')")
    public ResponseEntity<List<GlobalCategoryDto>> listGlobalCategories() {
        List<InventoryCategoryGlobal> globals = globalCategoryRepository.findAll();
        globals.sort(java.util.Comparator.comparing(
            g -> g.getName() == null ? "" : g.getName().toLowerCase(java.util.Locale.ROOT)
        ));
        List<GlobalCategoryDto> body = new ArrayList<>();
        for (InventoryCategoryGlobal g : globals) {
            body.add(new GlobalCategoryDto(g.getId(), g.getName(), g.getDescription()));
        }
        return ResponseEntity.ok(body);
    }

    @PutMapping("/categories/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    public ResponseEntity<?> updateGlobalCategory(@PathVariable Long id, @RequestBody CategoryCatalogDto input) {
        if (id == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new com.improvementsolutions.dto.ErrorResponse("ID inválido", "BAD_REQUEST", 400));
        }
        String name = input == null || input.name == null ? "" : input.name.trim();
        if (name.isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new com.improvementsolutions.dto.ErrorResponse("El nombre de la categoría es obligatorio", "BAD_REQUEST", 400));
        }
        InventoryCategoryGlobal g = globalCategoryRepository.findById(id)
            .orElse(null);
        if (g == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new com.improvementsolutions.dto.ErrorResponse("Categoría global no encontrada", "BAD_REQUEST", 400));
        }
        java.util.Optional<InventoryCategoryGlobal> dup = globalCategoryRepository.findByNameIgnoreCase(name);
        if (dup.isPresent() && !java.util.Objects.equals(dup.get().getId(), g.getId())) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new com.improvementsolutions.dto.ErrorResponse("Ya existe una categoría global con ese nombre", "BAD_REQUEST", 400));
        }
        g.setName(name);
        g.setDescription(input.description);
        InventoryCategoryGlobal saved = globalCategoryRepository.save(g);
        return ResponseEntity.ok(new GlobalCategoryDto(saved.getId(), saved.getName(), saved.getDescription()));
    }

    @DeleteMapping("/categories/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    public ResponseEntity<?> deleteGlobalCategory(@PathVariable Long id) {
        if (id == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new com.improvementsolutions.dto.ErrorResponse("ID inválido", "BAD_REQUEST", 400));
        }
        InventoryCategoryGlobal g = globalCategoryRepository.findById(id)
            .orElse(null);
        if (g == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new com.improvementsolutions.dto.ErrorResponse("Categoría global no encontrada", "BAD_REQUEST", 400));
        }
        globalCategoryRepository.delete(g);
        return ResponseEntity.noContent().build();
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

    // Global suppliers CRUD (independiente de empresa)
    @GetMapping("/suppliers/global")
    @PreAuthorize("hasAnyRole('ADMIN','USER')")
    public ResponseEntity<List<GlobalSupplierDto>> listGlobalSuppliers() {
        List<InventorySupplierGlobal> globals = globalSupplierRepository.findAll();
        globals.sort(java.util.Comparator.comparing(
            g -> g.getName() == null ? "" : g.getName().toLowerCase(java.util.Locale.ROOT)
        ));
        List<GlobalSupplierDto> body = new ArrayList<>();
        for (InventorySupplierGlobal g : globals) {
            body.add(new GlobalSupplierDto(g.getId(), g.getName(), g.getRuc(), g.getPhone(), g.getEmail(), g.getAddress()));
        }
        return ResponseEntity.ok(body);
    }

    @PostMapping("/suppliers")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    public ResponseEntity<?> createGlobalSupplier(@RequestBody SupplierCatalogDto input) {
        String name = input == null || input.name == null ? "" : input.name.trim();
        if (name.isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new com.improvementsolutions.dto.ErrorResponse("El nombre del proveedor es obligatorio", "BAD_REQUEST", 400));
        }
        if (input.ruc != null && !input.ruc.isBlank()) {
            String ruc = input.ruc.trim();
            java.util.Optional<InventorySupplierGlobal> byRuc = globalSupplierRepository.findByRuc(ruc);
            if (byRuc.isPresent()) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(new com.improvementsolutions.dto.ErrorResponse("Ya existe un proveedor global con ese RUC", "BAD_REQUEST", 400));
            }
        }
        InventorySupplierGlobal g = new InventorySupplierGlobal();
        g.setName(name);
        g.setRuc(input.ruc == null || input.ruc.isBlank() ? null : input.ruc.trim());
        g.setPhone(input.phone);
        g.setEmail(input.email);
        g.setAddress(input.address);
        InventorySupplierGlobal saved = globalSupplierRepository.save(g);
        return new ResponseEntity<>(new GlobalSupplierDto(saved.getId(), saved.getName(), saved.getRuc(), saved.getPhone(), saved.getEmail(), saved.getAddress()), HttpStatus.CREATED);
    }

    @PutMapping("/suppliers/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    public ResponseEntity<?> updateGlobalSupplier(@PathVariable Long id, @RequestBody SupplierCatalogDto input) {
        if (id == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new com.improvementsolutions.dto.ErrorResponse("ID inválido", "BAD_REQUEST", 400));
        }
        InventorySupplierGlobal g = globalSupplierRepository.findById(id).orElse(null);
        if (g == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new com.improvementsolutions.dto.ErrorResponse("Proveedor global no encontrado", "BAD_REQUEST", 400));
        }
        String name = input == null || input.name == null ? "" : input.name.trim();
        if (name.isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new com.improvementsolutions.dto.ErrorResponse("El nombre del proveedor es obligatorio", "BAD_REQUEST", 400));
        }
        String newRuc = input.ruc == null ? null : input.ruc.trim();
        if (newRuc != null && !newRuc.isBlank()) {
            java.util.Optional<InventorySupplierGlobal> byRuc = globalSupplierRepository.findByRuc(newRuc);
            if (byRuc.isPresent() && !java.util.Objects.equals(byRuc.get().getId(), g.getId())) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(new com.improvementsolutions.dto.ErrorResponse("Ya existe un proveedor global con ese RUC", "BAD_REQUEST", 400));
            }
        }
        g.setName(name);
        g.setRuc(newRuc == null || newRuc.isBlank() ? null : newRuc);
        g.setPhone(input.phone);
        g.setEmail(input.email);
        g.setAddress(input.address);
        InventorySupplierGlobal saved = globalSupplierRepository.save(g);
        return ResponseEntity.ok(new GlobalSupplierDto(saved.getId(), saved.getName(), saved.getRuc(), saved.getPhone(), saved.getEmail(), saved.getAddress()));
    }

    @DeleteMapping("/suppliers/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    public ResponseEntity<?> deleteGlobalSupplier(@PathVariable Long id) {
        if (id == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new com.improvementsolutions.dto.ErrorResponse("ID inválido", "BAD_REQUEST", 400));
        }
        InventorySupplierGlobal g = globalSupplierRepository.findById(id).orElse(null);
        if (g == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new com.improvementsolutions.dto.ErrorResponse("Proveedor global no encontrado", "BAD_REQUEST", 400));
        }
        globalSupplierRepository.delete(g);
        return ResponseEntity.noContent().build();
    }
}
