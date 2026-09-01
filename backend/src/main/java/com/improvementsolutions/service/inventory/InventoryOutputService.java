package com.improvementsolutions.service.inventory;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.transaction.annotation.Transactional;

import com.improvementsolutions.model.Business;
import com.improvementsolutions.model.inventory.*;
import com.improvementsolutions.model.inventory.enums.MovementType;
import com.improvementsolutions.model.inventory.enums.OutputStatus;
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
        output.setOutputType(normalizeOutputTypeForPersistence(output.getOutputType()));

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
        String base = preferred != null ? preferred.trim() : "";
        // Vacío o formato viejo por timestamp → consecutivo SAL-AAAA-####
        if (base.isEmpty() || looksLikeLegacyTimestampNumber(base)) {
            return allocateNextConsecutive(businessId, LocalDate.now().getYear());
        }
        if (!outputRepository.existsByBusinessIdAndOutputNumber(businessId, base)) {
            return base;
        }
        if (base.toUpperCase().matches("^SAL-\\d{4}-\\d+$")) {
            return allocateNextConsecutive(businessId, LocalDate.now().getYear());
        }
        String candidate = base;
        int attempts = 0;
        while (outputRepository.existsByBusinessIdAndOutputNumber(businessId, candidate) && attempts < 50) {
            String suffix = "-" + (System.currentTimeMillis() % 100000) + ((int) (Math.random() * 900) + 100);
            candidate = base + suffix;
            attempts++;
        }
        return candidate;
    }

    private boolean looksLikeLegacyTimestampNumber(String value) {
        String v = value.toUpperCase();
        // SAL-20260831-203045
        return v.matches("^SAL-\\d{8}-\\d{4,6}$");
    }

    /**
     * Consecutivo simple por empresa y año: SAL-2026-0001, SAL-2026-0002, ...
     * (prefijo distinto a ENT- para no chocar con entradas)
     */
    public String nextOutputNumber(String ruc) {
        Business business = authService.requireBusinessForRucAndCurrentUser(ruc);
        return allocateNextConsecutive(business.getId(), LocalDate.now().getYear());
    }

    private String allocateNextConsecutive(Long businessId, int year) {
        String prefix = "SAL-" + year + "-";
        List<String> existing = outputRepository.findOutputNumbersByBusinessIdAndPrefix(businessId, prefix);
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
        int guard = 0;
        while (outputRepository.existsByBusinessIdAndOutputNumber(businessId, candidate) && guard < 9999) {
            next++;
            candidate = prefix + String.format("%04d", next);
            guard++;
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
            movement.setDocumentType(output.getOutputType() != null ? output.getOutputType() : "SALIDA");
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
        List<InventoryOutput> list = outputRepository.findByBusinessIdOrderByOutputDateDesc(business.getId());
        list.forEach(o -> o.getDetails().size());
        return list;
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
    @Transactional(readOnly = true)
    public List<InventoryOutput> findByType(String ruc, String outputType) {
        Business business = authService.requireBusinessForRucAndCurrentUser(ruc);
        String type = normalizeOutputTypeForPersistence(outputType);
        List<InventoryOutput> list = outputRepository.findByBusinessIdAndOutputTypeOrderByOutputDateDesc(business.getId(), type);
        list.forEach(o -> o.getDetails().size());
        return list;
    }

    /** Tipos de salida asignados a la empresa (dinámicos). */
    @Transactional(readOnly = true)
    public List<java.util.Map<String, Object>> listOutputTypesForBusiness(String ruc) {
        Business business = authService.requireBusinessForRucAndCurrentUser(ruc);
        if (business.getInventoryOutputTypes() != null) {
            business.getInventoryOutputTypes().size();
        }
        List<java.util.Map<String, Object>> out = new java.util.ArrayList<>();
        if (business.getInventoryOutputTypes() == null) {
            return out;
        }
        business.getInventoryOutputTypes().stream()
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
     * Compatibilidad: catálogo por nombre ("Préstamo de herramienta") → código legacy (PRESTAMO).
     */
    private String normalizeOutputTypeForPersistence(String raw) {
        if (raw == null || raw.isBlank()) {
            throw new IllegalArgumentException("El tipo de salida es obligatorio");
        }
        String trimmed = raw.trim();
        String key = java.text.Normalizer.normalize(trimmed, java.text.Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "")
                .toUpperCase(java.util.Locale.ROOT)
                .replace('-', '_')
                .replace(' ', '_');
        return switch (key) {
            case "EPP_TRABAJADOR",
                 "ENTREGA_DE_EPP_A_TRABAJADOR",
                 "ENTREGA_EPP_A_TRABAJADOR" -> "EPP_TRABAJADOR";
            case "PRESTAMO",
                 "PRESTAMO_DE_HERRAMIENTA" -> "PRESTAMO";
            case "CONSUMO_AREA",
                 "CONSUMO_DE_PROYECTO/AREA",
                 "CONSUMO_DE_PROYECTO_AREA" -> "CONSUMO_AREA";
            case "BAJA",
                 "BAJA_DE_PRODUCTOS" -> "BAJA";
            case "VENTA",
                 "VENTA_DE_PRODUCTO" -> "VENTA";
            case "DESCUENTO_TRABAJADOR",
                 "DESCUENTO_A_TRABAJADOR_(NOMINA)",
                 "DESCUENTO_A_TRABAJADOR_NOMINA" -> "DESCUENTO_TRABAJADOR";
            default -> {
                // Quitar caracteres no alfanuméricos del key por si vino con paréntesis
                String compact = key.replaceAll("[^A-Z0-9_]", "");
                yield switch (compact) {
                    case "ENTREGADEEPPATRABAJADOR" -> "EPP_TRABAJADOR";
                    case "PRESTAMODEHERRAMIENTA" -> "PRESTAMO";
                    case "CONSUMODEPROYECTOAREA" -> "CONSUMO_AREA";
                    case "BAJADEPRODUCTOS" -> "BAJA";
                    case "VENTADEPRODUCTO" -> "VENTA";
                    case "DESCUENTOATRABAJADORNOMINA" -> "DESCUENTO_TRABAJADOR";
                    default -> trimmed.length() > 80 ? trimmed.substring(0, 80) : trimmed;
                };
            }
        };
    }

    /**
     * Buscar por trabajador
     */
    @Transactional(readOnly = true)
    public List<InventoryOutput> findByEmployee(String ruc, Long employeeId) {
        Business business = authService.requireBusinessForRucAndCurrentUser(ruc);
        List<InventoryOutput> list = outputRepository.findByBusinessIdAndEmployeeIdOrderByOutputDateDesc(business.getId(), employeeId);
        list.forEach(o -> o.getDetails().size());
        return list;
    }
    
    /**
     * Confirmar una salida existente (procesa stock y kardex)
     */
    @Transactional
    public InventoryOutput confirm(String ruc, Long outputId) {
        Business business = authService.requireBusinessForRucAndCurrentUser(ruc);
        InventoryOutput output = outputRepository.findById(outputId)
            .orElseThrow(() -> new IllegalArgumentException("Salida de inventario no encontrada"));
        if (!output.getBusiness().getId().equals(business.getId())) {
            throw new AccessDeniedException("La salida no pertenece a la empresa seleccionada");
        }
        if (output.getStatus() != OutputStatus.CONFIRMADO) {
            output.setStatus(OutputStatus.CONFIRMADO);
            // Asegurar que detalles estén cargados en esta transacción
            output.getDetails().size();
            processOutputDetails(output);
            output = outputRepository.save(output);
        }
        return output;
    }

    /**
     * Marca un préstamo (u otra salida) como ya devuelto.
     */
    @Transactional
    public InventoryOutput markReturned(String ruc, Long outputId, Long returnEntryId) {
        Business business = authService.requireBusinessForRucAndCurrentUser(ruc);
        InventoryOutput output = outputRepository.findById(outputId)
            .orElseThrow(() -> new IllegalArgumentException("Salida de inventario no encontrada"));
        if (!output.getBusiness().getId().equals(business.getId())) {
            throw new AccessDeniedException("La salida no pertenece a la empresa seleccionada");
        }
        if (!Boolean.TRUE.equals(output.getReturned())) {
            output.setReturned(true);
            output.setReturnedAt(LocalDateTime.now());
            if (returnEntryId != null) {
                output.setReturnEntryId(returnEntryId);
            }
            output = outputRepository.save(output);
        }
        return output;
    }

    /**
     * Anula una salida en BORRADOR (no toca stock).
     */
    @Transactional
    public InventoryOutput cancel(String ruc, Long outputId) {
        Business business = authService.requireBusinessForRucAndCurrentUser(ruc);
        InventoryOutput output = outputRepository.findById(outputId)
            .orElseThrow(() -> new IllegalArgumentException("Salida de inventario no encontrada"));
        if (!output.getBusiness().getId().equals(business.getId())) {
            throw new AccessDeniedException("La salida no pertenece a la empresa seleccionada");
        }
        if (output.getStatus() == OutputStatus.CONFIRMADO) {
            throw new IllegalArgumentException("No se puede anular una salida confirmada desde este flujo (ya afectó stock)");
        }
        if (output.getStatus() != OutputStatus.ANULADO) {
            output.setStatus(OutputStatus.ANULADO);
            output = outputRepository.save(output);
        }
        return output;
    }

    /**
     * Actualiza la ruta del documento (PDF/imagen) asociado a la salida
     */
    @Transactional
    public InventoryOutput updateDocumentImage(String ruc, Long outputId, String documentPath) {
        Business business = authService.requireBusinessForRucAndCurrentUser(ruc);
        InventoryOutput output = outputRepository.findById(outputId)
            .orElseThrow(() -> new IllegalArgumentException("Salida de inventario no encontrada"));
        if (!output.getBusiness().getId().equals(business.getId())) {
            throw new AccessDeniedException("La salida no pertenece a la empresa seleccionada");
        }
        output.setDocumentImage(documentPath);
        return outputRepository.save(output);
    }
}
