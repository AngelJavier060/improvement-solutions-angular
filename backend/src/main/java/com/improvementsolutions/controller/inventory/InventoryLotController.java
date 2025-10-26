package com.improvementsolutions.controller.inventory;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.improvementsolutions.model.inventory.InventoryLot;
import com.improvementsolutions.repository.inventory.InventoryLotRepository;
import com.improvementsolutions.service.inventory.InventoryAuthorizationService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/inventory/{ruc}/variants/{variantId}/lots")
@RequiredArgsConstructor
public class InventoryLotController {

    private final InventoryAuthorizationService authService;
    private final InventoryLotRepository lotRepository;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','USER')")
    public List<Map<String, Object>> listLots(
        @PathVariable String ruc,
        @PathVariable Long variantId
    ) {
        Long businessId = authService.requireBusinessForRucAndCurrentUser(ruc).getId();
        List<InventoryLot> lots = lotRepository.findByBusinessIdAndVariantId(businessId, variantId);
        return lots.stream().map(this::toDto).collect(Collectors.toList());
    }

    @GetMapping("/available")
    @PreAuthorize("hasAnyRole('ADMIN','USER')")
    public List<Map<String, Object>> listAvailableLots(
        @PathVariable String ruc,
        @PathVariable Long variantId
    ) {
        Long businessId = authService.requireBusinessForRucAndCurrentUser(ruc).getId();
        List<InventoryLot> lots = lotRepository.findByBusinessIdAndVariantIdAndCurrentQtyGreaterThan(
            businessId, variantId, new BigDecimal("0.00")
        );
        return lots.stream().map(this::toDto).collect(Collectors.toList());
    }

    private Map<String, Object> toDto(InventoryLot lot) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", lot.getId());
        m.put("lotNumber", lot.getLotNumber());
        m.put("currentQty", lot.getCurrentQty());
        m.put("manufacturingDate", lot.getManufacturingDate());
        m.put("expirationDate", lot.getExpirationDate());
        m.put("warehouseLocation", lot.getWarehouseLocation());
        m.put("itemCondition", lot.getItemCondition() != null ? lot.getItemCondition().name() : null);
        m.put("status", lot.getStatus());
        return m;
    }
}
