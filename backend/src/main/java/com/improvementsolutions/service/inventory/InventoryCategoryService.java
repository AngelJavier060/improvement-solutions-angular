package com.improvementsolutions.service.inventory;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.improvementsolutions.model.Business;
import com.improvementsolutions.model.inventory.InventoryCategory;
import com.improvementsolutions.repository.inventory.InventoryCategoryRepository;

@Service
public class InventoryCategoryService {

    private final InventoryCategoryRepository categoryRepository;
    private final InventoryAuthorizationService authService;

    public InventoryCategoryService(InventoryCategoryRepository categoryRepository,
            InventoryAuthorizationService authService) {
        this.categoryRepository = categoryRepository;
        this.authService = authService;
    }

    @Transactional(readOnly = true)
    public List<InventoryCategory> list(String ruc) {
        Business business = authService.requireBusinessForRucAndCurrentUser(ruc);
        return categoryRepository.findByBusiness_Id(business.getId());
    }

    @Transactional
    public InventoryCategory create(String ruc, InventoryCategory input) {
        Business business = authService.requireBusinessForRucAndCurrentUser(ruc);
        if (input.getName() == null || input.getName().trim().isEmpty()) {
            throw new IllegalArgumentException("El nombre de la categoría es obligatorio");
        }
        categoryRepository.findByBusiness_IdAndNameIgnoreCase(business.getId(), input.getName().trim())
            .ifPresent(existing -> { throw new IllegalArgumentException("Ya existe una categoría con ese nombre"); });
        InventoryCategory cat = new InventoryCategory();
        cat.setBusiness(business);
        cat.setName(input.getName().trim());
        cat.setDescription(input.getDescription());
        cat.setActive(input.getActive() == null ? Boolean.TRUE : input.getActive());
        // Jerarquía (opcional)
        if (input.getParent() != null && input.getParent().getId() != null) {
            InventoryCategory parent = categoryRepository.findById(input.getParent().getId())
                .orElseThrow(() -> new IllegalArgumentException("Categoría padre no encontrada"));
            if (!parent.getBusiness().getId().equals(business.getId())) {
                throw new IllegalArgumentException("La categoría padre no pertenece a la empresa");
            }
            cat.setParent(parent);
            cat.setLevel(parent.getLevel() == null ? 2 : parent.getLevel() + 1);
        } else {
            cat.setParent(null);
            cat.setLevel(1);
        }
        return categoryRepository.save(cat);
    }

    @Transactional
    public InventoryCategory update(String ruc, Long id, InventoryCategory input) {
        Business business = authService.requireBusinessForRucAndCurrentUser(ruc);
        if (id == null) throw new IllegalArgumentException("ID inválido");
        InventoryCategory cat = categoryRepository.findByIdAndBusiness_Id(id, business.getId())
            .orElseThrow(() -> new IllegalArgumentException("Categoría no encontrada"));
        String name = (input.getName() == null ? "" : input.getName().trim());
        if (name.isEmpty()) throw new IllegalArgumentException("El nombre de la categoría es obligatorio");
        categoryRepository.findByBusiness_IdAndNameIgnoreCase(business.getId(), name)
            .ifPresent(existing -> { if (!existing.getId().equals(cat.getId())) throw new IllegalArgumentException("Ya existe una categoría con ese nombre"); });
        cat.setName(name);
        cat.setDescription(input.getDescription());
        if (input.getActive() != null) cat.setActive(input.getActive());
        // Jerarquía (opcional)
        if (input.getParent() != null && input.getParent().getId() != null) {
            InventoryCategory parent = categoryRepository.findById(input.getParent().getId())
                .orElseThrow(() -> new IllegalArgumentException("Categoría padre no encontrada"));
            if (!parent.getBusiness().getId().equals(business.getId())) {
                throw new IllegalArgumentException("La categoría padre no pertenece a la empresa");
            }
            cat.setParent(parent);
            cat.setLevel(parent.getLevel() == null ? 2 : parent.getLevel() + 1);
        } else if (input.getParent() == null) {
            cat.setParent(null);
            cat.setLevel(1);
        }
        return categoryRepository.save(cat);
    }

    @Transactional
    public void delete(String ruc, Long id) {
        Business business = authService.requireBusinessForRucAndCurrentUser(ruc);
        if (id == null) throw new IllegalArgumentException("ID inválido");
        InventoryCategory cat = categoryRepository.findByIdAndBusiness_Id(id, business.getId())
            .orElseThrow(() -> new IllegalArgumentException("Categoría no encontrada"));
        categoryRepository.delete(cat);
    }

    @Transactional
    public int importFromRuc(String targetRuc, String sourceRuc) {
        Business target = authService.requireBusinessForRucAndCurrentUser(targetRuc);
        Business source = authService.requireBusinessForRucAndCurrentUser(sourceRuc);
        List<InventoryCategory> src = categoryRepository.findByBusiness_Id(source.getId());
        int created = 0;
        for (InventoryCategory c : src) {
            String name = (c.getName() == null ? "" : c.getName().trim());
            if (name.isEmpty()) continue;
            if (categoryRepository.findByBusiness_IdAndNameIgnoreCase(target.getId(), name).isPresent()) continue;
            InventoryCategory nc = new InventoryCategory();
            nc.setBusiness(target);
            nc.setName(name);
            nc.setDescription(c.getDescription());
            nc.setActive(Boolean.FALSE);
            categoryRepository.save(nc);
            created++;
        }
        return created;
    }
}
