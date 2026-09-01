package com.improvementsolutions.service.inventory;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Objects;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.improvementsolutions.model.Business;
import com.improvementsolutions.model.inventory.InventorySupplier;
import com.improvementsolutions.model.inventory.InventorySupplierGlobal;
import com.improvementsolutions.repository.inventory.InventorySupplierRepository;

@Service
public class InventorySupplierService {

    private final InventorySupplierRepository supplierRepository;
    private final InventoryAuthorizationService authService;

    public InventorySupplierService(InventorySupplierRepository supplierRepository,
            InventoryAuthorizationService authService) {
        this.supplierRepository = supplierRepository;
        this.authService = authService;
    }

    @Transactional(readOnly = true)
    public List<InventorySupplier> list(String ruc) {
        Business business = authService.requireBusinessForRucAndCurrentUser(ruc);
        return supplierRepository.findByBusiness_Id(business.getId());
    }

    /**
     * Proveedores asignados a la empresa en Inventario-Bodega
     * (Configuración → Proveedores → asignados en Empresas).
     * Sincroniza a inventory_suppliers local para poder enlazar entradas.
     */
    @Transactional
    public List<InventorySupplier> listFromBodega(String ruc) {
        Business business = authService.requireBusinessForRucAndCurrentUser(ruc);
        if (business.getInventorySupplierGlobals() != null) {
            business.getInventorySupplierGlobals().size();
        }
        List<InventorySupplier> locals = new ArrayList<>(supplierRepository.findByBusiness_Id(business.getId()));
        List<InventorySupplier> result = new ArrayList<>();
        if (business.getInventorySupplierGlobals() == null || business.getInventorySupplierGlobals().isEmpty()) {
            return result;
        }
        for (InventorySupplierGlobal g : business.getInventorySupplierGlobals()) {
            if (g == null || g.getName() == null || g.getName().isBlank()) continue;
            InventorySupplier local = findMatchingLocal(locals, g);
            if (local == null) {
                local = new InventorySupplier();
                local.setBusiness(business);
                local.setName(g.getName().trim());
                local.setRuc(trimToNull(g.getRuc()));
                local.setPhone(trimToNull(g.getPhone()));
                local.setEmail(trimToNull(g.getEmail()));
                local.setAddress(trimToNull(g.getAddress()));
                local.setActive(Boolean.TRUE);
                local = supplierRepository.save(local);
                locals.add(local);
            } else {
                // Mantener datos al día desde el catálogo global
                local.setName(g.getName().trim());
                if (trimToNull(g.getRuc()) != null) local.setRuc(trimToNull(g.getRuc()));
                local.setPhone(trimToNull(g.getPhone()));
                local.setEmail(trimToNull(g.getEmail()));
                local.setAddress(trimToNull(g.getAddress()));
                local.setActive(Boolean.TRUE);
                local = supplierRepository.save(local);
            }
            result.add(local);
        }
        result.sort(Comparator.comparing(s -> s.getName() == null ? "" : s.getName(), String.CASE_INSENSITIVE_ORDER));
        return result;
    }

    private InventorySupplier findMatchingLocal(List<InventorySupplier> locals, InventorySupplierGlobal g) {
        String gRuc = normalizeKey(g.getRuc());
        String gName = normalizeKey(g.getName());
        for (InventorySupplier s : locals) {
            if (s == null) continue;
            String sRuc = normalizeKey(s.getRuc());
            if (!gRuc.isEmpty() && !sRuc.isEmpty() && Objects.equals(gRuc, sRuc)) {
                return s;
            }
        }
        for (InventorySupplier s : locals) {
            if (s == null) continue;
            String sName = normalizeKey(s.getName());
            if (!gName.isEmpty() && Objects.equals(gName, sName)) {
                // Si ambos tienen RUC distinto, no es el mismo
                String sRuc = normalizeKey(s.getRuc());
                if (!gRuc.isEmpty() && !sRuc.isEmpty() && !Objects.equals(gRuc, sRuc)) continue;
                return s;
            }
        }
        return null;
    }

    private String normalizeKey(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    }

    private String trimToNull(String value) {
        if (value == null) return null;
        String t = value.trim();
        return t.isEmpty() ? null : t;
    }

    @Transactional
    public InventorySupplier create(String ruc, InventorySupplier input) {
        Business business = authService.requireBusinessForRucAndCurrentUser(ruc);
        if (input.getName() == null || input.getName().trim().isEmpty()) {
            throw new IllegalArgumentException("El nombre del proveedor es obligatorio");
        }
        InventorySupplier sup = new InventorySupplier();
        sup.setBusiness(business);
        sup.setName(input.getName().trim());
        sup.setRuc(input.getRuc());
        sup.setPhone(input.getPhone());
        sup.setEmail(input.getEmail());
        sup.setAddress(input.getAddress());
        sup.setActive(input.getActive() == null ? Boolean.TRUE : input.getActive());
        return supplierRepository.save(sup);
    }

    @Transactional
    public InventorySupplier update(String ruc, Long id, InventorySupplier input) {
        Business business = authService.requireBusinessForRucAndCurrentUser(ruc);
        if (id == null) throw new IllegalArgumentException("ID inválido");
        InventorySupplier sup = supplierRepository.findByBusiness_RucAndId(ruc, id)
            .orElseThrow(() -> new IllegalArgumentException("Proveedor no encontrado"));
        String name = (input.getName() == null ? "" : input.getName().trim());
        if (name.isEmpty()) throw new IllegalArgumentException("El nombre del proveedor es obligatorio");
        String newRuc = input.getRuc();
        if (newRuc != null && !newRuc.isBlank()) {
            String trimmed = newRuc.trim();
            if (!trimmed.equalsIgnoreCase(sup.getRuc() == null ? "" : sup.getRuc())) {
                boolean exists = supplierRepository.existsByBusiness_IdAndRuc(business.getId(), trimmed);
                if (exists) throw new IllegalArgumentException("Ya existe un proveedor con ese RUC");
                sup.setRuc(trimmed);
            }
        } else {
            sup.setRuc(null);
        }
        sup.setName(name);
        sup.setPhone(input.getPhone());
        sup.setEmail(input.getEmail());
        sup.setAddress(input.getAddress());
        if (input.getActive() != null) sup.setActive(input.getActive());
        return supplierRepository.save(sup);
    }

    @Transactional
    public void delete(String ruc, Long id) {
        authService.requireBusinessForRucAndCurrentUser(ruc);
        if (id == null) throw new IllegalArgumentException("ID inválido");
        InventorySupplier sup = supplierRepository.findByBusiness_RucAndId(ruc, id)
            .orElseThrow(() -> new IllegalArgumentException("Proveedor no encontrado"));
        supplierRepository.delete(sup);
    }

    @Transactional
    public int importFromRuc(String targetRuc, String sourceRuc) {
        Business target = authService.requireBusinessForRucAndCurrentUser(targetRuc);
        Business source = authService.requireBusinessForRucAndCurrentUser(sourceRuc);
        List<InventorySupplier> src = supplierRepository.findByBusiness_Id(source.getId());
        List<InventorySupplier> tgt = supplierRepository.findByBusiness_Id(target.getId());
        java.util.Set<String> existingRucs = new java.util.HashSet<>();
        java.util.Set<String> existingNames = new java.util.HashSet<>();
        for (InventorySupplier s : tgt) {
            if (s.getRuc() != null && !s.getRuc().isBlank()) existingRucs.add(s.getRuc().trim().toLowerCase());
            if (s.getName() != null && !s.getName().isBlank()) existingNames.add(s.getName().trim().toLowerCase());
        }
        int created = 0;
        for (InventorySupplier s : src) {
            String name = s.getName() == null ? "" : s.getName().trim();
            String ruc = s.getRuc() == null ? null : s.getRuc().trim();
            if (name.isEmpty()) continue;
            if (ruc != null && !ruc.isBlank() && existingRucs.contains(ruc.toLowerCase())) continue;
            if (ruc == null || ruc.isBlank()) {
                if (existingNames.contains(name.toLowerCase())) continue;
            }
            InventorySupplier ns = new InventorySupplier();
            ns.setBusiness(target);
            ns.setName(name);
            ns.setRuc(ruc);
            ns.setPhone(s.getPhone());
            ns.setEmail(s.getEmail());
            ns.setAddress(s.getAddress());
            ns.setActive(Boolean.FALSE);
            supplierRepository.save(ns);
            if (ruc != null && !ruc.isBlank()) existingRucs.add(ruc.toLowerCase());
            existingNames.add(name.toLowerCase());
            created++;
        }
        return created;
    }
}
