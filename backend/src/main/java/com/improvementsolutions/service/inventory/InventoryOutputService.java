package com.improvementsolutions.service.inventory;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.improvementsolutions.model.Business;
import com.improvementsolutions.model.inventory.*;
import com.improvementsolutions.model.inventory.enums.MovementType;
import com.improvementsolutions.model.inventory.enums.OutputStatus;
import com.improvementsolutions.model.inventory.enums.OutputType;
import com.improvementsolutions.repository.BusinessRepository;
import com.improvementsolutions.repository.inventory.*;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class InventoryOutputService {
    
    private final InventoryOutputRepository outputRepository;
    private final InventoryVariantRepository variantRepository;
    private final InventoryMovementRepository movementRepository;
    private final InventoryLotRepository lotRepository;
    private final BusinessRepository businessRepository;
    private final InventoryAuthorizationService authService;
    
    /**
     * Crear una nueva salida de inventario
     * IMPORTANTE: Actualiza stock y registra movimientos
     */
    @Transactional
    public InventoryOutput create(String ruc, InventoryOutput output) {
        // Validar empresa y permisos del usuario
        Business business = authService.requireBusinessForRucAndCurrentUser(ruc);
        
        // Normalizar y resolver número de documento único (evita bloquear al usuario)
        String desiredNumber = output.getOutputNumber() != null ? output.getOutputNumber().trim() : null;
        String uniqueNumber = ensureUniqueOutputNumber(business.getId(), desiredNumber);
        if (desiredNumber != null && !desiredNumber.equals(uniqueNumber)) {
            // Preservar el número solicitado en observaciones para trazabilidad
            String notes = output.getNotes();
            String info = "[DOC_ORIGINAL:" + desiredNumber + "]";
            output.setNotes(notes == null || notes.isBlank() ? info : (notes + " " + info));
        }
        output.setOutputNumber(uniqueNumber);

        output.setBusiness(business);

        // Enlazar detalles con la cabecera y adjuntar variantes como referencias gestionadas
        if (output.getDetails() != null) {
            for (InventoryOutputDetail d : output.getDetails()) {
                d.setOutput(output);
                Long vId = (d.getVariant() != null) ? d.getVariant().getId() : null;
                if (vId == null) {
                    throw new IllegalArgumentException("Detalle de salida sin variante");
                }
                // Adjuntar referencia gestionada para evitar 'detached entity ... version null'
                InventoryVariant vRef = variantRepository.getReferenceById(vId);
                // Validar pertenencia a la misma empresa (tenant safety)
                if (vRef.getProduct() == null || vRef.getProduct().getBusiness() == null
                    || !vRef.getProduct().getBusiness().getId().equals(business.getId())) {
                    throw new IllegalArgumentException("La variante no pertenece a la empresa");
                }
                d.setVariant(vRef);

                // Precalcular totales si faltan, para cumplir NOT NULL del esquema
                if (d.getTotalCost() == null && d.getQuantity() != null && d.getUnitCost() != null) {
                    d.setTotalCost(d.getQuantity().multiply(d.getUnitCost()));
                }
            }
        }

        // Guardar cabecera (y detalles por cascada)
        InventoryOutput saved = outputRepository.save(output);
        
        // Si está confirmada, procesar detalles (afectar stock)
        if (output.getStatus() == OutputStatus.CONFIRMADO) {
            processOutputDetails(saved);
        }
        
        return saved;
    }
    
    private String ensureUniqueOutputNumber(Long businessId, String preferred) {
        String base = (preferred != null && !preferred.isBlank()) ? preferred.trim() : ("SAL-" + System.currentTimeMillis());
        String candidate = base;
        int attempts = 0;
        while (outputRepository.existsByBusinessIdAndOutputNumber(businessId, candidate) && attempts < 50) {
            String suffix = "-" + (System.currentTimeMillis() % 100000) + ((int)(Math.random() * 900) + 100);
            candidate = base + suffix;
            attempts++;
        }
        return candidate;
    }
    
    /**
     * Procesar detalles de salida: actualizar stock, movimientos y lotes
     */
    private void processOutputDetails(InventoryOutput output) {
        for (InventoryOutputDetail detail : output.getDetails()) {
            Long variantId = detail.getVariant() != null ? detail.getVariant().getId() : null;
            if (variantId == null) {
                throw new IllegalArgumentException("Detalle de salida sin variante");
            }
            InventoryVariant variant = variantRepository.findById(variantId)
                .orElseThrow(() -> new IllegalArgumentException("Variante no encontrada"));
            if (!variant.getProduct().getBusiness().getId().equals(output.getBusiness().getId())) {
                throw new IllegalArgumentException("La variante no pertenece a la empresa");
            }
            
            // Validar stock disponible
            BigDecimal currentQty = variant.getCurrentQty() != null ? variant.getCurrentQty() : BigDecimal.ZERO;
            if (currentQty.compareTo(detail.getQuantity()) < 0) {
                throw new IllegalArgumentException("Stock insuficiente para la variante: " + variant.getCode());
            }
            
            // 1. ACTUALIZAR STOCK DE VARIANTE
            BigDecimal newQty = currentQty.subtract(detail.getQuantity());
            variant.setCurrentQty(newQty);
            variantRepository.save(variant);
            
            // 2. REGISTRAR MOVIMIENTO EN KARDEX
            InventoryMovement movement = new InventoryMovement();
            movement.setBusiness(output.getBusiness());
            movement.setVariant(variant);
            movement.setMovementDate(output.getOutputDate().atStartOfDay());
            movement.setMovementType(MovementType.SALIDA);
            movement.setDocumentType(output.getOutputType().name());
            movement.setDocumentNumber(output.getOutputNumber());
            movement.setQuantity(detail.getQuantity().negate()); // Negativo para salidas
            movement.setQty(detail.getQuantity().intValue() * -1); // Campo legacy
            movement.setUnitCost(detail.getUnitCost());
            movement.setBalanceQty(newQty);
            movement.setBalanceCost(variant.getUnitCost());
            movement.setReferenceId(output.getId());
            movement.setNotes(detail.getNotes());
            movement.setCreatedBy(output.getAuthorizedBy());
            movementRepository.save(movement);
            
            // 3. GESTIÓN DE LOTES (si aplica)
            if (detail.getLotNumber() != null && !detail.getLotNumber().isEmpty()) {
                processLotForOutput(output.getBusiness(), variant, detail);
            }
        }
    }
    
    /**
     * Actualizar lote para salida
     */
    private void processLotForOutput(Business business, InventoryVariant variant, InventoryOutputDetail detail) {
        InventoryLot lot = lotRepository.findByBusinessIdAndVariantIdAndLotNumber(
            business.getId(), variant.getId(), detail.getLotNumber()
        ).orElseThrow(() -> new IllegalArgumentException("Lote no encontrado: " + detail.getLotNumber()));
        
        // Validar stock en lote
        BigDecimal lotQty = lot.getCurrentQty() != null ? lot.getCurrentQty() : BigDecimal.ZERO;
        if (lotQty.compareTo(detail.getQuantity()) < 0) {
            throw new IllegalArgumentException("Stock insuficiente en lote: " + detail.getLotNumber());
        }
        
        // Actualizar cantidad en lote
        lot.setCurrentQty(lotQty.subtract(detail.getQuantity()));
        lotRepository.save(lot);
    }
    
    /**
     * Listar salidas
     */
    @Transactional(readOnly = true)
    public List<InventoryOutput> list(String ruc) {
        Business business = authService.requireBusinessForRucAndCurrentUser(ruc);
        return outputRepository.findByBusinessIdOrderByOutputDateDesc(business.getId());
    }
    
    /**
     * Buscar por rango de fechas
     */
    public List<InventoryOutput> findByDateRange(String ruc, LocalDate startDate, LocalDate endDate) {
        Business business = authService.requireBusinessForRucAndCurrentUser(ruc);
        return outputRepository.findByBusinessAndDateRange(business.getId(), startDate, endDate);
    }
    
    /**
     * Buscar por tipo de salida
     */
    public List<InventoryOutput> findByType(String ruc, String outputType) {
        Business business = authService.requireBusinessForRucAndCurrentUser(ruc);
        OutputType type;
        try {
            type = OutputType.valueOf(outputType);
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException("Tipo de salida no válido: " + outputType);
        }
        return outputRepository.findByBusinessIdAndOutputTypeOrderByOutputDateDesc(business.getId(), type);
    }
    
    /**
     * Buscar por trabajador
     */
    public List<InventoryOutput> findByEmployee(String ruc, Long employeeId) {
        Business business = authService.requireBusinessForRucAndCurrentUser(ruc);
        return outputRepository.findByBusinessIdAndEmployeeIdOrderByOutputDateDesc(business.getId(), employeeId);
    }
}
