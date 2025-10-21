package com.improvementsolutions.service.inventory;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import org.springframework.stereotype.Service;
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

        entry.setBusiness(business);

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
    
    private String ensureUniqueEntryNumber(Long businessId, String preferred) {
        String base = (preferred != null && !preferred.isBlank()) ? preferred.trim() : ("ENT-" + System.currentTimeMillis());
        String candidate = base;
        int attempts = 0;
        while (entryRepository.existsByBusinessIdAndEntryNumber(businessId, candidate) && attempts < 50) {
            String suffix = "-" + (System.currentTimeMillis() % 100000) + ((int)(Math.random() * 900) + 100);
            candidate = base + suffix;
            attempts++;
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
            movement.setDocumentType(entry.getEntryType().name());
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
        return entryRepository.findByBusinessIdOrderByEntryDateDesc(business.getId());
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
}
