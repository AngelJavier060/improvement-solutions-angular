package com.improvementsolutions.service;

import com.improvementsolutions.dto.BusinessModuleDto;
import com.improvementsolutions.model.Business;
import com.improvementsolutions.model.BusinessModule;
import com.improvementsolutions.model.SystemModule;
import com.improvementsolutions.repository.BusinessModuleRepository;
import com.improvementsolutions.repository.BusinessRepository;
import com.improvementsolutions.repository.SystemModuleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class BusinessModuleService {

    private final BusinessModuleRepository businessModuleRepository;
    private final SystemModuleRepository systemModuleRepository;
    private final BusinessRepository businessRepository;

    // ─── Catálogo de módulos ───────────────────────────────────────────

    public List<SystemModule> getAllSystemModules() {
        return systemModuleRepository.findAllByOrderByDisplayOrderAsc();
    }

    public List<SystemModule> getActiveSystemModules() {
        return systemModuleRepository.findByActiveTrueOrderByDisplayOrderAsc();
    }

    // ─── Módulos por empresa ──────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<BusinessModuleDto> getModulesByBusinessId(Long businessId) {
        try {
            Business business = businessRepository.findById(businessId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                            "Empresa no encontrada con id: " + businessId));

            List<SystemModule> allModules = systemModuleRepository.findByActiveTrueOrderByDisplayOrderAsc();
            List<BusinessModule> assigned = businessModuleRepository.findByBusinessIdOrderByModuleDisplayOrderAsc(businessId);

            // Crear un mapa para acceso rápido
            // En producción puede haber datos inconsistentes (ej. module null) o duplicados.
            Map<Long, BusinessModule> assignedMap = assigned.stream()
                    .filter(bm -> {
                        boolean ok = bm != null && bm.getModule() != null && bm.getModule().getId() != null;
                        if (!ok) {
                            Long bmId = bm != null ? bm.getId() : null;
                            log.warn("[BusinessModuleService] Ignorando registro business_modules inconsistente id={} para businessId={}", bmId, businessId);
                        }
                        return ok;
                    })
                    .collect(Collectors.toMap(
                            bm -> bm.getModule().getId(),
                            bm -> bm,
                            (a, b) -> {
                                log.warn("[BusinessModuleService] Duplicado en business_modules para businessId={} moduleId={} (ids={},{}). Usando el primero.",
                                        businessId,
                                        a.getModule().getId(),
                                        a.getId(),
                                        b.getId());
                                return a;
                            }
                    ));

            List<BusinessModuleDto> result = new ArrayList<>();
            for (SystemModule sm : allModules) {
                BusinessModule bm = assignedMap.get(sm.getId());
                BusinessModuleDto dto = BusinessModuleDto.builder()
                        .businessId(business.getId())
                        .businessName(business.getName())
                        .businessRuc(business.getRuc())
                        .moduleId(sm.getId())
                        .moduleCode(sm.getCode())
                        .moduleName(sm.getName())
                        .moduleDescription(sm.getDescription())
                        .moduleIcon(sm.getIcon())
                        .moduleColor(sm.getColor())
                        .build();

                if (bm != null) {
                    dto.setId(bm.getId());
                    dto.setActive(bm.getActive());
                    dto.setStatus(bm.getStatus());
                    dto.setStartDate(bm.getStartDate());
                    dto.setExpirationDate(bm.getExpirationDate());
                    dto.setNotes(bm.getNotes());
                    dto.setEffectivelyActive(bm.isEffectivelyActive());
                    if (bm.getPlan() != null) {
                        dto.setPlanId(bm.getPlan().getId());
                        dto.setPlanName(bm.getPlan().getName());
                        dto.setPlanCode(bm.getPlan().getCode());
                        dto.setPlanPrice(bm.getPlan().getPrice());
                        dto.setPlanDurationMonths(bm.getPlan().getDurationMonths());
                        dto.setPlanCurrency(bm.getPlan().getCurrency());
                    }
                } else {
                    dto.setActive(false);
                    dto.setStatus("INACTIVO");
                    dto.setEffectivelyActive(false);
                }
                result.add(dto);
            }
            return result;
        } catch (ResponseStatusException ex) {
            throw ex;
        } catch (Exception ex) {
            log.error("[BusinessModuleService] Error obteniendo módulos de businessId={}", businessId, ex);
            throw ex;
        }
    }

    // ─── Activar / Desactivar un módulo para una empresa ──────────────

    @Transactional
    public BusinessModuleDto toggleModule(Long businessId, Long moduleId, boolean active,
                                          LocalDate startDate, LocalDate expirationDate, String notes) {
        try {
            Business business = businessRepository.findById(businessId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                            "Empresa no encontrada con id: " + businessId));
            SystemModule module = systemModuleRepository.findById(moduleId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                            "Módulo no encontrado con id: " + moduleId));

            List<BusinessModule> candidates = businessModuleRepository
                    .findAllByBusinessIdAndModuleIdOrderById(businessId, moduleId);
            BusinessModule bm;
            if (candidates.isEmpty()) {
                bm = BusinessModule.builder()
                        .business(business)
                        .module(module)
                        .build();
            } else {
                bm = candidates.get(0);
                if (candidates.size() > 1) {
                    log.warn("[BusinessModuleService] Duplicados en business_modules para businessId={} moduleId={}. Usando id={}",
                            businessId, moduleId, bm.getId());
                }
            }

            bm.setActive(active);
            bm.setStatus(active ? "ACTIVO" : "INACTIVO");
            bm.setStartDate(startDate);
            bm.setExpirationDate(expirationDate);
            bm.setNotes(notes);

            bm = businessModuleRepository.save(bm);
            log.info("[BusinessModuleService] Módulo {} {} para empresa {} (id={})",
                    module.getCode(), active ? "ACTIVADO" : "DESACTIVADO", business.getName(), businessId);

            return toDto(bm);
        } catch (ResponseStatusException ex) {
            throw ex;
        } catch (Exception ex) {
            log.error("[BusinessModuleService] Error toggling módulo businessId={} moduleId={}", businessId, moduleId, ex);
            throw ex;
        }
    }

    // ─── Actualizar fechas / notas de un módulo ──────────────────────

    @Transactional
    public BusinessModuleDto updateModule(Long businessModuleId, Boolean active,
                                          LocalDate startDate, LocalDate expirationDate, String notes) {
        BusinessModule bm = businessModuleRepository.findById(businessModuleId)
                .orElseThrow(() -> new RuntimeException("Registro business_module no encontrado con id: " + businessModuleId));

        if (active != null) bm.setActive(active);
        if (startDate != null) bm.setStartDate(startDate);
        bm.setExpirationDate(expirationDate);
        if (notes != null) bm.setNotes(notes);

        bm = businessModuleRepository.save(bm);
        return toDto(bm);
    }

    // ─── Todos los módulos por RUC (activos + inactivos) ─────────────

    @Transactional(readOnly = true)
    public List<BusinessModuleDto> getAllModulesByRuc(String ruc) {
        Business business = businessRepository.findByRuc(ruc)
                .orElseThrow(() -> new RuntimeException("Empresa no encontrada con RUC: " + ruc));
        return getModulesByBusinessId(business.getId());
    }

    // ─── Consulta para usuarios normales (módulos efectivos) ─────────

    @Transactional(readOnly = true)
    public List<BusinessModuleDto> getEffectiveModulesByRuc(String ruc) {
        List<BusinessModule> modules = businessModuleRepository.findActiveByBusinessRuc(ruc);
        return modules.stream()
                .filter(BusinessModule::isEffectivelyActive)
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public boolean isModuleActiveForBusiness(String ruc, String moduleCode) {
        return businessModuleRepository.findByBusinessRucAndModuleCode(ruc, moduleCode)
                .map(BusinessModule::isEffectivelyActive)
                .orElse(false);
    }

    // ─── Mapeo a DTO ─────────────────────────────────────────────────

    private BusinessModuleDto toDto(BusinessModule bm) {
        BusinessModuleDto.BusinessModuleDtoBuilder builder = BusinessModuleDto.builder()
                .id(bm.getId())
                .businessId(bm.getBusiness().getId())
                .businessName(bm.getBusiness().getName())
                .businessRuc(bm.getBusiness().getRuc())
                .moduleId(bm.getModule().getId())
                .moduleCode(bm.getModule().getCode())
                .moduleName(bm.getModule().getName())
                .moduleDescription(bm.getModule().getDescription())
                .moduleIcon(bm.getModule().getIcon())
                .moduleColor(bm.getModule().getColor())
                .active(bm.getActive())
                .status(bm.getStatus())
                .startDate(bm.getStartDate())
                .expirationDate(bm.getExpirationDate())
                .notes(bm.getNotes())
                .effectivelyActive(bm.isEffectivelyActive());

        if (bm.getPlan() != null) {
            try {
                // planId suele estar disponible sin inicializar el proxy
                builder.planId(bm.getPlan().getId());
                // El resto de campos pueden requerir inicialización; si falla, lo registramos y continuamos
                builder
                    .planName(bm.getPlan().getName())
                    .planCode(bm.getPlan().getCode())
                    .planPrice(bm.getPlan().getPrice())
                    .planDurationMonths(bm.getPlan().getDurationMonths())
                    .planCurrency(bm.getPlan().getCurrency());
            } catch (Exception ex) {
                log.warn("[BusinessModuleService] No se pudieron cargar campos del plan para businessModule id={}: {}",
                        bm.getId(), ex.getClass().getSimpleName());
            }
        }

        return builder.build();
    }
}
