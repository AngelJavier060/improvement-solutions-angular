package com.improvementsolutions.service.inventory;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.improvementsolutions.model.Business;
import com.improvementsolutions.model.inventory.InventoryLot;
import com.improvementsolutions.model.inventory.InventoryOutput;
import com.improvementsolutions.model.inventory.InventoryVariant;
import com.improvementsolutions.repository.inventory.InventoryLotRepository;
import com.improvementsolutions.repository.inventory.InventoryOutputRepository;
import com.improvementsolutions.repository.inventory.InventoryVariantRepository;

@Service
public class InventoryAlertService {

    private final InventoryVariantRepository variantRepository;
    private final InventoryOutputRepository outputRepository;
    private final InventoryLotRepository lotRepository;
    private final InventoryAuthorizationService authService;

    public InventoryAlertService(InventoryVariantRepository variantRepository,
                                  InventoryOutputRepository outputRepository,
                                  InventoryLotRepository lotRepository,
                                  InventoryAuthorizationService authService) {
        this.variantRepository = variantRepository;
        this.outputRepository = outputRepository;
        this.lotRepository = lotRepository;
        this.authService = authService;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getAlerts(String ruc) {
        Business business = authService.requireBusinessForRucAndCurrentUser(ruc);
        Long businessId = business.getId();
        LocalDate today = LocalDate.now();
        LocalDate limitDate = today.plusDays(30);

        // Stock bajo
        List<InventoryVariant> lowStock = variantRepository.findLowStockByBusinessId(businessId);
        List<Map<String, Object>> stockBajo = new ArrayList<>();
        for (InventoryVariant v : lowStock) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("variantId", v.getId());
            item.put("variantCode", v.getCode());
            item.put("productName", v.getProduct() != null ? v.getProduct().getName() : "");
            item.put("currentQty", v.getCurrentQty() != null ? v.getCurrentQty() : BigDecimal.ZERO);
            item.put("minQty", v.getMinQty() != null ? v.getMinQty() : BigDecimal.ZERO);
            stockBajo.add(item);
        }

        // Préstamos activos
        List<InventoryOutput> loans = outputRepository.findActiveLoans(businessId);
        List<Map<String, Object>> prestamosVencidos = new ArrayList<>();
        List<Map<String, Object>> prestamosProximos = new ArrayList<>();
        for (InventoryOutput o : loans) {
            if (o.getReturnDate() == null) continue;
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("outputId", o.getId());
            item.put("outputNumber", o.getOutputNumber());
            item.put("employeeId", o.getEmployeeId());
            item.put("returnDate", o.getReturnDate().toString());
            item.put("notes", o.getNotes());
            if (o.getReturnDate().isBefore(today)) {
                prestamosVencidos.add(item);
            } else if (!o.getReturnDate().isAfter(limitDate)) {
                prestamosProximos.add(item);
            }
        }

        // Lotes por vencer / vencidos
        List<InventoryLot> expiringLots = lotRepository.findExpiringLots(businessId, limitDate);
        List<InventoryLot> expiredLots = lotRepository.findExpiredLots(businessId);

        List<Map<String, Object>> lotesPorVencer = new ArrayList<>();
        for (InventoryLot l : expiringLots) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("lotId", l.getId());
            item.put("lotNumber", l.getLotNumber());
            item.put("expirationDate", l.getExpirationDate() != null ? l.getExpirationDate().toString() : null);
            item.put("currentQty", l.getCurrentQty());
            item.put("variantCode", l.getVariant() != null ? l.getVariant().getCode() : "");
            lotesPorVencer.add(item);
        }

        List<Map<String, Object>> lotesVencidos = new ArrayList<>();
        for (InventoryLot l : expiredLots) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("lotId", l.getId());
            item.put("lotNumber", l.getLotNumber());
            item.put("expirationDate", l.getExpirationDate() != null ? l.getExpirationDate().toString() : null);
            item.put("currentQty", l.getCurrentQty());
            item.put("variantCode", l.getVariant() != null ? l.getVariant().getCode() : "");
            lotesVencidos.add(item);
        }

        // Stock alto (excede máximo)
        List<Map<String, Object>> stockAlto = new ArrayList<>();
        List<InventoryVariant> allActive = variantRepository.findAllActiveByBusinessId(businessId);
        for (InventoryVariant v : allActive) {
            if (v.getProduct() == null) continue;
            Integer maxStock = v.getProduct().getMaxStock();
            if (maxStock != null && v.getCurrentQty() != null && v.getCurrentQty().intValue() > maxStock) {
                Map<String, Object> item = new LinkedHashMap<>();
                item.put("variantId", v.getId());
                item.put("variantCode", v.getCode());
                item.put("productName", v.getProduct().getName());
                item.put("currentQty", v.getCurrentQty());
                item.put("maxStock", maxStock);
                stockAlto.add(item);
            }
        }

        int totalAlertas = stockBajo.size() + prestamosVencidos.size() + lotesPorVencer.size() + lotesVencidos.size() + stockAlto.size();

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("stockBajo", stockBajo);
        result.put("stockAlto", stockAlto);
        result.put("prestamosVencidos", prestamosVencidos);
        result.put("prestamosProximosVencer", prestamosProximos);
        result.put("lotesPorVencer", lotesPorVencer);
        result.put("lotesVencidos", lotesVencidos);
        result.put("totalAlertas", totalAlertas);
        result.put("prestamosActivos", loans.size());
        return result;
    }
}
