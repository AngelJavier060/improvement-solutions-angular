package com.improvementsolutions.service.inventory;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;

import com.improvementsolutions.model.Business;
import com.improvementsolutions.model.inventory.*;
import com.improvementsolutions.model.inventory.enums.EntryStatus;
import com.improvementsolutions.model.inventory.enums.MovementType;
import com.improvementsolutions.repository.BusinessRepository;
import com.improvementsolutions.repository.inventory.*;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class InventoryEntryService {
    
    private final InventoryEntryRepository entryRepository;
    private final InventoryVariantRepository variantRepository;
    private final InventoryMovementRepository movementRepository;
    private final InventoryLotRepository lotRepository;
    private final BusinessRepository businessRepository;
    private final InventoryAuthorizationService authService;
    
    /**
     * Crear una nueva entrada de inventario
     * IMPORTANTE: Aplica costeo promedio ponderado y actualiza stock
     */
    @Transactional
    public InventoryEntry create(String ruc, InventoryEntry entry) {
        // Validar empresa y permisos del usuario
        Business business = authService.requireBusinessForRucAndCurrentUser(ruc);
        
        // Normalizar y resolver número de documento único (evita bloquear al usuario)
        String desiredNumber = entry.getEntryNumber() != null ? entry.getEntryNumber().trim() : null;
        String uniqueNumber = ensureUniqueEntryNumber(business.getId(), desiredNumber);
        if (desiredNumber != null && !desiredNumber.equals(uniqueNumber)) {
            // Preservar el número solicitado en observaciones para trazabilidad
            String notes = entry.getNotes();
            String info = "[DOC_ORIGINAL:" + desiredNumber + "]";
            entry.setNotes(notes == null || notes.isBlank() ? info : (notes + " " + info));
        }
        entry.setEntryNumber(uniqueNumber);
        entry.setEntryType(normalizeEntryTypeForPersistence(entry.getEntryType()));

        entry.setBusiness(business);

        // Registrar usuario que realiza la acción
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.isAuthenticated()) {
                entry.setCreatedBy(auth.getName());
            }
        } catch (Exception ignored) {}

        // Enlazar detalles con la cabecera y adjuntar variantes como referencias gestionadas
        if (entry.getDetails() != null) {
            for (InventoryEntryDetail d : entry.getDetails()) {
                d.setEntry(entry);
                Long vId = (d.getVariant() != null) ? d.getVariant().getId() : null;
                if (vId == null) {
                    throw new IllegalArgumentException("Detalle de entrada sin variante");
                }
                // Adjuntar referencia gestionada para evitar 'detached entity ... version null'
                InventoryVariant vRef = variantRepository.getReferenceById(vId);
                // Validar pertenencia a la misma empresa (tenant safety)
                if (vRef.getProduct() == null || vRef.getProduct().getBusiness() == null
                    || !vRef.getProduct().getBusiness().getId().equals(business.getId())) {
                    throw new IllegalArgumentException("La variante no pertenece a la empresa");
                }
                d.setVariant(vRef);

                // Precalcular impuestos/totales si faltan, para cumplir NOT NULL del esquema
                if (d.getTaxPercentage() == null) {
                    d.setTaxPercentage(java.math.BigDecimal.ZERO);
                }
                if (d.getTaxAmount() == null) {
                    d.setTaxAmount(d.getUnitCost() != null
                        ? d.getUnitCost().multiply(d.getTaxPercentage()).divide(new java.math.BigDecimal("100"), 4, java.math.RoundingMode.HALF_UP)
                        : java.math.BigDecimal.ZERO);
                }
                if (d.getTotalCost() == null && d.getQuantity() != null && d.getUnitCost() != null) {
                    java.math.BigDecimal costWithTax = d.getUnitCost().add(d.getTaxAmount() != null ? d.getTaxAmount() : java.math.BigDecimal.ZERO);
                    d.setTotalCost(d.getQuantity().multiply(costWithTax));
                }
            }
        }

        // Guardar cabecera (y detalles por cascada)
        InventoryEntry saved = entryRepository.save(entry);
        
        // Si está confirmada, procesar detalles (afectar stock)
        if (entry.getStatus() == EntryStatus.CONFIRMADO) {
            processEntryDetails(saved);
        }
        
        return saved;
    }
    
    /**
     * Compatibilidad con CHECK antiguo (COMPRA/DEVOLUCION/…) y catálogo por nombre ("Compra").
     * Si coincide con un tipo legacy, persiste el código; si no, el nombre libre.
     */
    private String normalizeEntryTypeForPersistence(String raw) {
        if (raw == null || raw.isBlank()) {
            throw new IllegalArgumentException("El tipo de entrada es obligatorio");
        }
        String trimmed = raw.trim();
        String key = java.text.Normalizer.normalize(trimmed, java.text.Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "")
                .toUpperCase(java.util.Locale.ROOT)
                .replace('-', '_')
                .replace(' ', '_');
        return switch (key) {
            case "COMPRA", "DEVOLUCION", "TRANSFERENCIA", "AJUSTE", "DONACION" -> key;
            default -> trimmed.length() > 80 ? trimmed.substring(0, 80) : trimmed;
        };
    }

    private String ensureUniqueEntryNumber(Long businessId, String preferred) {
        String base = preferred != null ? preferred.trim() : "";
        // Si viene vacío o con formato viejo por timestamp, asignar consecutivo del año.
        if (base.isEmpty() || looksLikeLegacyTimestampNumber(base)) {
            return allocateNextConsecutive(businessId, LocalDate.now().getYear());
        }
        if (!entryRepository.existsByBusinessIdAndEntryNumber(businessId, base)) {
            return base;
        }
        // Si el solicitado ya existe y es del patrón ENT-AAAA-####, dar el siguiente.
        if (base.toUpperCase().matches("^ENT-\\d{4}-\\d+$")) {
            return allocateNextConsecutive(businessId, LocalDate.now().getYear());
        }
        // Otros formatos: sufijo corto para no bloquear (compatibilidad).
        String candidate = base;
        int attempts = 0;
        while (entryRepository.existsByBusinessIdAndEntryNumber(businessId, candidate) && attempts < 50) {
            String suffix = "-" + (System.currentTimeMillis() % 100000) + ((int) (Math.random() * 900) + 100);
            candidate = base + suffix;
            attempts++;
        }
        return candidate;
    }

    private boolean looksLikeLegacyTimestampNumber(String value) {
        String v = value.toUpperCase();
        // ENT-20260831-203045  /  ING-20260831-203045
        return v.matches("^(ENT|ING)-\\d{8}-\\d{4,6}$");
    }

    /**
     * Consecutivo simple por empresa y año: ENT-2026-0001, ENT-2026-0002, ...
     */
    public String nextEntryNumber(String ruc) {
        Business business = authService.requireBusinessForRucAndCurrentUser(ruc);
        return allocateNextConsecutive(business.getId(), LocalDate.now().getYear());
    }

    private String allocateNextConsecutive(Long businessId, int year) {
        String prefix = "ENT-" + year + "-";
        List<String> existing = entryRepository.findEntryNumbersByBusinessIdAndPrefix(businessId, prefix);
        int max = 0;
        for (String num : existing) {
            if (num == null) continue;
            String upper = num.trim().toUpperCase();
            if (!upper.startsWith(prefix)) continue;
            String tail = upper.substring(prefix.length());
            try {
                int n = Integer.parseInt(tail);
                if (n > max) max = n;
            } catch (NumberFormatException ignored) {}
        }
        int next = max + 1;
        String candidate = prefix + String.format("%04d", next);
        // Seguridad ante carrera: avanzar si ya existe.
        int guard = 0;
        while (entryRepository.existsByBusinessIdAndEntryNumber(businessId, candidate) && guard < 9999) {
            next++;
            candidate = prefix + String.format("%04d", next);
            guard++;
        }
        return candidate;
    }
    
    /**
     * Procesar detalles de entrada: actualizar stock, costeo, movimientos y lotes
     */
    private void processEntryDetails(InventoryEntry entry) {
        for (InventoryEntryDetail detail : entry.getDetails()) {
            Long variantId = detail.getVariant() != null ? detail.getVariant().getId() : null;
            if (variantId == null) {
                throw new IllegalArgumentException("Detalle de entrada sin variante");
            }
            InventoryVariant variant = variantRepository.findById(variantId)
                .orElseThrow(() -> new IllegalArgumentException("Variante no encontrada"));
            if (!variant.getProduct().getBusiness().getId().equals(entry.getBusiness().getId())) {
                throw new IllegalArgumentException("La variante no pertenece a la empresa");
            }
            
            // 1. COSTEO PROMEDIO PONDERADO
            BigDecimal currentQty = variant.getCurrentQty() != null ? variant.getCurrentQty() : BigDecimal.ZERO;
            BigDecimal currentCost = variant.getUnitCost() != null ? variant.getUnitCost() : BigDecimal.ZERO;
            BigDecimal newQty = detail.getQuantity();
            BigDecimal newCost = detail.getUnitCost().add(detail.getTaxAmount() != null ? detail.getTaxAmount() : BigDecimal.ZERO);
            
            // Cálculo: (stock_anterior * costo_anterior + cantidad_nueva * costo_nuevo) / (stock_anterior + cantidad_nueva)
            BigDecimal totalCurrentValue = currentQty.multiply(currentCost);
            BigDecimal totalNewValue = newQty.multiply(newCost);
            BigDecimal totalQty = currentQty.add(newQty);
            
            BigDecimal newAverageCost = BigDecimal.ZERO;
            if (totalQty.compareTo(BigDecimal.ZERO) > 0) {
                newAverageCost = totalCurrentValue.add(totalNewValue)
                    .divide(totalQty, 4, RoundingMode.HALF_UP);
            }
            
            // 2. ACTUALIZAR VARIANTE
            variant.setCurrentQty(totalQty);
            variant.setUnitCost(newAverageCost);
            variantRepository.save(variant);
            
            // 3. REGISTRAR MOVIMIENTO EN KARDEX
            InventoryMovement movement = new InventoryMovement();
            movement.setBusiness(entry.getBusiness());
            movement.setVariant(variant);
            movement.setMovementDate(entry.getEntryDate().atStartOfDay());
            movement.setMovementType(MovementType.ENTRADA);
            movement.setDocumentType(entry.getEntryType() != null ? entry.getEntryType() : "ENTRADA");
            movement.setDocumentNumber(entry.getEntryNumber());
            movement.setQuantity(newQty);
            movement.setQty(newQty.intValue()); // Campo legacy
            movement.setUnitCost(newCost);
            movement.setBalanceQty(totalQty);
            movement.setBalanceCost(newAverageCost);
            movement.setReferenceId(entry.getId());
            movement.setNotes(detail.getNotes());
            movement.setCreatedBy(entry.getReceivedBy());
            movementRepository.save(movement);
            
            // 4. GESTIÓN DE LOTES (si aplica)
            if (detail.getLotNumber() != null && !detail.getLotNumber().isEmpty()) {
                processLot(entry.getBusiness(), variant, detail);
            }
        }
    }
    
    /**
     * Crear o actualizar lote
     */
    private void processLot(Business business, InventoryVariant variant, InventoryEntryDetail detail) {
        InventoryLot lot = lotRepository.findByBusinessIdAndVariantIdAndLotNumber(
            business.getId(), variant.getId(), detail.getLotNumber()
        ).orElse(new InventoryLot());
        
        if (lot.getId() == null) {
            // Nuevo lote
            lot.setBusiness(business);
            lot.setVariant(variant);
            lot.setLotNumber(detail.getLotNumber());
            lot.setManufacturingDate(detail.getManufacturingDate());
            lot.setExpirationDate(detail.getExpirationDate());
            lot.setCurrentQty(detail.getQuantity());
            lot.setWarehouseLocation(detail.getWarehouseLocation());
            lot.setItemCondition(detail.getItemCondition());
        } else {
            // Actualizar lote existente
            lot.setCurrentQty(lot.getCurrentQty().add(detail.getQuantity()));
        }
        
        lotRepository.save(lot);
    }
    
    /**
     * Listar entradas
     */
    @Transactional(readOnly = true)
    public List<InventoryEntry> list(String ruc) {
        Business business = authService.requireBusinessForRucAndCurrentUser(ruc);
        List<InventoryEntry> list = entryRepository.findByBusinessIdOrderByEntryDateDesc(business.getId());
        list.forEach(e -> e.getDetails().size());
        return list;
    }

    /** Tipos de entrada asignados a la empresa (dinámicos). */
    @Transactional(readOnly = true)
    public List<java.util.Map<String, Object>> listEntryTypesForBusiness(String ruc) {
        Business business = authService.requireBusinessForRucAndCurrentUser(ruc);
        if (business.getInventoryEntryTypes() != null) {
            business.getInventoryEntryTypes().size();
        }
        List<java.util.Map<String, Object>> out = new java.util.ArrayList<>();
        if (business.getInventoryEntryTypes() == null) {
            return out;
        }
        business.getInventoryEntryTypes().stream()
                .filter(t -> t != null && !Boolean.FALSE.equals(t.getActive()))
                .sorted((a, b) -> String.valueOf(a.getName()).compareToIgnoreCase(String.valueOf(b.getName())))
                .forEach(t -> {
                    java.util.Map<String, Object> m = new java.util.HashMap<>();
                    m.put("id", t.getId());
                    m.put("name", t.getName());
                    m.put("description", t.getDescription());
                    out.add(m);
                });
        return out;
    }
    
    /**
     * Buscar por rango de fechas
     */
    public List<InventoryEntry> findByDateRange(String ruc, LocalDate startDate, LocalDate endDate) {
        Business business = authService.requireBusinessForRucAndCurrentUser(ruc);
        return entryRepository.findByBusinessAndDateRange(business.getId(), startDate, endDate);
    }
    
    /**
     * Buscar por proveedor
     */
    public List<InventoryEntry> findBySupplier(String ruc, Long supplierId) {
        Business business = authService.requireBusinessForRucAndCurrentUser(ruc);
        return entryRepository.findByBusinessIdAndSupplierIdOrderByEntryDateDesc(business.getId(), supplierId);
    }
    
    /**
     * Obtener Kardex de una variante
     */
    public List<InventoryMovement> getKardex(String ruc, Long variantId) {
        Business business = authService.requireBusinessForRucAndCurrentUser(ruc);
        return movementRepository.findKardexByVariant(business.getId(), variantId);
    }

    /**
     * Confirmar una entrada existente (procesa stock, costeo y kardex).
     */
    @Transactional
    public InventoryEntry confirm(String ruc, Long entryId) {
        Business business = authService.requireBusinessForRucAndCurrentUser(ruc);
        InventoryEntry entry = entryRepository.findById(entryId)
            .orElseThrow(() -> new IllegalArgumentException("Entrada de inventario no encontrada"));
        if (!entry.getBusiness().getId().equals(business.getId())) {
            throw new AccessDeniedException("La entrada no pertenece a la empresa seleccionada");
        }
        if (entry.getStatus() == EntryStatus.ANULADO) {
            throw new IllegalArgumentException("No se puede confirmar una entrada anulada");
        }
        if (entry.getStatus() != EntryStatus.CONFIRMADO) {
            entry.setStatus(EntryStatus.CONFIRMADO);
            entry.getDetails().size();
            processEntryDetails(entry);
            entry = entryRepository.save(entry);
        }
        return entry;
    }

    /**
     * Anula una entrada en BORRADOR (no toca stock).
     */
    @Transactional
    public InventoryEntry cancel(String ruc, Long entryId) {
        Business business = authService.requireBusinessForRucAndCurrentUser(ruc);
        InventoryEntry entry = entryRepository.findById(entryId)
            .orElseThrow(() -> new IllegalArgumentException("Entrada de inventario no encontrada"));
        if (!entry.getBusiness().getId().equals(business.getId())) {
            throw new AccessDeniedException("La entrada no pertenece a la empresa seleccionada");
        }
        if (entry.getStatus() == EntryStatus.CONFIRMADO) {
            throw new IllegalArgumentException("No se puede anular una entrada confirmada desde este flujo (ya afectó stock)");
        }
        if (entry.getStatus() != EntryStatus.ANULADO) {
            entry.setStatus(EntryStatus.ANULADO);
            entry = entryRepository.save(entry);
        }
        return entry;
    }
}
