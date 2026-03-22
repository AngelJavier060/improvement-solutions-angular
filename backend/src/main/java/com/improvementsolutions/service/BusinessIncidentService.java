package com.improvementsolutions.service;

import com.improvementsolutions.dto.BusinessIncidentDto;
import com.improvementsolutions.model.Business;
import com.improvementsolutions.model.BusinessIncident;
import com.improvementsolutions.repository.BusinessIncidentRepository;
import com.improvementsolutions.repository.BusinessRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class BusinessIncidentService {

    private final BusinessIncidentRepository incidentRepository;
    private final BusinessRepository businessRepository;

    // ── Listar por RUC ───────────────────────────────────────────────────
    @Transactional(readOnly = true)
    public List<BusinessIncidentDto> findByRuc(String ruc) {
        return incidentRepository
                .findByBusiness_RucOrderByIncidentDateDescCreatedAtDesc(ruc)
                .stream().map(this::toDto).collect(Collectors.toList());
    }

    // ── Listar por businessId ────────────────────────────────────────────
    @Transactional(readOnly = true)
    public List<BusinessIncidentDto> findByBusinessId(Long businessId) {
        return incidentRepository
                .findByBusiness_IdOrderByIncidentDateDescCreatedAtDesc(businessId)
                .stream().map(this::toDto).collect(Collectors.toList());
    }

    // ── Obtener uno por id ───────────────────────────────────────────────
    @Transactional(readOnly = true)
    public BusinessIncidentDto findById(Long id) {
        BusinessIncident incident = incidentRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Incidente no encontrado con id: " + id));
        return toDto(incident);
    }

    // ── Crear ────────────────────────────────────────────────────────────
    @Transactional
    public BusinessIncidentDto create(String ruc, BusinessIncidentDto dto) {
        Business business = businessRepository.findByRuc(ruc)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Empresa no encontrada con RUC: " + ruc));

        BusinessIncident incident = fromDto(dto, business);
        incident = incidentRepository.save(incident);
        log.info("[BusinessIncidentService] Incidente creado id={} para empresa ruc={}", incident.getId(), ruc);
        return toDto(incident);
    }

    // ── Actualizar ───────────────────────────────────────────────────────
    @Transactional
    public BusinessIncidentDto update(Long id, BusinessIncidentDto dto) {
        BusinessIncident incident = incidentRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Incidente no encontrado con id: " + id));

        applyDto(dto, incident);
        incident = incidentRepository.save(incident);
        log.info("[BusinessIncidentService] Incidente actualizado id={}", id);
        return toDto(incident);
    }

    // ── Cambiar estado ───────────────────────────────────────────────────
    @Transactional
    public BusinessIncidentDto updateStatus(Long id, String status) {
        BusinessIncident incident = incidentRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Incidente no encontrado con id: " + id));
        incident.setStatus(status.toUpperCase());
        incident = incidentRepository.save(incident);
        return toDto(incident);
    }

    // ── Eliminar ─────────────────────────────────────────────────────────
    @Transactional
    public void delete(Long id) {
        if (!incidentRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND,
                    "Incidente no encontrado con id: " + id);
        }
        incidentRepository.deleteById(id);
        log.info("[BusinessIncidentService] Incidente eliminado id={}", id);
    }

    // ── Listar solo incidentes de Salud y Seguridad por RUC ─────────────
    @Transactional(readOnly = true)
    public List<BusinessIncidentDto> findSafetyByRuc(String ruc) {
        return incidentRepository
                .findByBusiness_RucAndAffectationTypeOrderByIncidentDateDescCreatedAtDesc(ruc, "Salud y Seguridad")
                .stream().map(this::toDto).collect(Collectors.toList());
    }

    // ── Incidentes de seguridad en un rango de fechas ─────────────────────
    @Transactional(readOnly = true)
    public List<BusinessIncidentDto> findSafetyByRucAndDateRange(String ruc, LocalDate from, LocalDate to) {
        return incidentRepository
                .findSafetyIncidentsByRucAndDateRange(ruc, from, to)
                .stream().map(this::toDto).collect(Collectors.toList());
    }

    // ── Incidentes de seguridad de un empleado por cédula en rango ────────
    @Transactional(readOnly = true)
    public List<BusinessIncidentDto> findSafetyByCedulaAndDateRange(String ruc, String cedula, LocalDate from, LocalDate to) {
        return incidentRepository
                .findSafetyIncidentsByCedulaAndDateRange(ruc, cedula, from, to)
                .stream().map(this::toDto).collect(Collectors.toList());
    }

    // ── Estadísticas del mes ─────────────────────────────────────────────
    @Transactional(readOnly = true)
    public java.util.Map<String, Long> getStatsForBusiness(String ruc) {
        Business business = businessRepository.findByRuc(ruc)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Empresa no encontrada con RUC: " + ruc));
        long monthly = incidentRepository.countCurrentMonthByBusinessId(business.getId());
        long open    = incidentRepository.countByBusinessIdAndStatus(business.getId(), "ABIERTO");
        long review  = incidentRepository.countByBusinessIdAndStatus(business.getId(), "EN_REVISION");
        return java.util.Map.of("monthly", monthly, "open", open, "inReview", review);
    }

    // ── Mapeo entidad → DTO ──────────────────────────────────────────────
    private BusinessIncidentDto toDto(BusinessIncident e) {
        return BusinessIncidentDto.builder()
                .id(e.getId())
                .businessId(e.getBusiness() != null ? e.getBusiness().getId() : null)
                .businessName(e.getBusiness() != null ? e.getBusiness().getName() : null)
                .businessRuc(e.getBusiness() != null ? e.getBusiness().getRuc() : null)
                .affectationType(e.getAffectationType())
                .incidentDate(e.getIncidentDate())
                .incidentTime(e.getIncidentTime())
                .location(e.getLocation())
                .personnelType(e.getPersonnelType())
                .companyName(e.getCompanyName())
                .personName(e.getPersonName())
                .personCedula(e.getPersonCedula())
                .personPosition(e.getPersonPosition())
                .personArea(e.getPersonArea())
                .personAge(e.getPersonAge())
                .personGender(e.getPersonGender())
                .personShift(e.getPersonShift())
                .personExperience(e.getPersonExperience())
                .title(e.getTitle())
                .description(e.getDescription())
                .eventClassification(e.getEventClassification())
                .mitigationActions(e.getMitigationActions())
                .isHighPotential(e.getIsHighPotential())
                .isCriticalEnap(e.getIsCriticalEnap())
                .isFatal(e.getIsFatal())
                .requiresResuscitation(e.getRequiresResuscitation())
                .requiresRescue(e.getRequiresRescue())
                .fallOver2m(e.getFallOver2m())
                .involvesAmputation(e.getInvolvesAmputation())
                .affectsNormalTask(e.getAffectsNormalTask())
                .isCollective(e.getIsCollective())
                .lifeRuleViolated(e.getLifeRuleViolated())
                .apiLevel(e.getApiLevel())
                .hasOccurredBefore(e.getHasOccurredBefore())
                .investigationLevel(e.getInvestigationLevel())
                .preliminaryComments(e.getPreliminaryComments())
                .controlMeasures(e.getControlMeasures())
                .reportedBy(e.getReportedBy())
                .reportDate(e.getReportDate())
                .reviewedBy(e.getReviewedBy())
                .approvedBy(e.getApprovedBy())
                .evidenceFiles(
                        e.getEvidencePaths() == null || e.getEvidencePaths().isBlank()
                                ? java.util.List.of()
                                : java.util.Arrays.stream(e.getEvidencePaths().split("\\|"))
                                .filter(s -> s != null && !s.isBlank())
                                .toList()
                )
                .status(e.getStatus())
                .createdBy(e.getCreatedBy())
                .createdAt(e.getCreatedAt())
                .updatedAt(e.getUpdatedAt())
                .build();
    }

    // ── Mapeo DTO → nueva entidad ────────────────────────────────────────
    private BusinessIncident fromDto(BusinessIncidentDto dto, Business business) {
        BusinessIncident e = BusinessIncident.builder()
                .business(business)
                .build();
        applyDto(dto, e);
        return e;
    }

    // ── Aplicar campos del DTO a entidad existente ───────────────────────
    private void applyDto(BusinessIncidentDto dto, BusinessIncident e) {
        if (dto.getAffectationType()    != null) e.setAffectationType(dto.getAffectationType());
        if (dto.getIncidentDate()       != null) e.setIncidentDate(dto.getIncidentDate());
        if (dto.getIncidentTime()       != null) e.setIncidentTime(dto.getIncidentTime());
        if (dto.getLocation()           != null) e.setLocation(dto.getLocation());
        if (dto.getPersonnelType()      != null) e.setPersonnelType(dto.getPersonnelType());
        if (dto.getCompanyName()        != null) e.setCompanyName(dto.getCompanyName());
        if (dto.getPersonName()         != null) e.setPersonName(dto.getPersonName());
        if (dto.getPersonCedula()       != null) e.setPersonCedula(dto.getPersonCedula());
        if (dto.getPersonPosition()     != null) e.setPersonPosition(dto.getPersonPosition());
        if (dto.getPersonArea()         != null) e.setPersonArea(dto.getPersonArea());
        if (dto.getPersonAge()          != null) e.setPersonAge(dto.getPersonAge());
        if (dto.getPersonGender()       != null) e.setPersonGender(dto.getPersonGender());
        if (dto.getPersonShift()        != null) e.setPersonShift(dto.getPersonShift());
        if (dto.getPersonExperience()   != null) e.setPersonExperience(dto.getPersonExperience());
        if (dto.getTitle()              != null) e.setTitle(dto.getTitle());
        if (dto.getDescription()        != null) e.setDescription(dto.getDescription());
        if (dto.getEventClassification()!= null) e.setEventClassification(dto.getEventClassification());
        if (dto.getMitigationActions()  != null) e.setMitigationActions(dto.getMitigationActions());
        if (dto.getIsHighPotential()    != null) e.setIsHighPotential(dto.getIsHighPotential());
        if (dto.getIsCriticalEnap()     != null) e.setIsCriticalEnap(dto.getIsCriticalEnap());
        if (dto.getIsFatal()            != null) e.setIsFatal(dto.getIsFatal());
        if (dto.getRequiresResuscitation()!=null)e.setRequiresResuscitation(dto.getRequiresResuscitation());
        if (dto.getRequiresRescue()     != null) e.setRequiresRescue(dto.getRequiresRescue());
        if (dto.getFallOver2m()         != null) e.setFallOver2m(dto.getFallOver2m());
        if (dto.getInvolvesAmputation() != null) e.setInvolvesAmputation(dto.getInvolvesAmputation());
        if (dto.getAffectsNormalTask()  != null) e.setAffectsNormalTask(dto.getAffectsNormalTask());
        if (dto.getIsCollective()       != null) e.setIsCollective(dto.getIsCollective());
        if (dto.getLifeRuleViolated()   != null) e.setLifeRuleViolated(dto.getLifeRuleViolated());
        if (dto.getApiLevel()           != null) e.setApiLevel(dto.getApiLevel());
        if (dto.getHasOccurredBefore()  != null) e.setHasOccurredBefore(dto.getHasOccurredBefore());
        if (dto.getInvestigationLevel() != null) e.setInvestigationLevel(dto.getInvestigationLevel());
        if (dto.getPreliminaryComments()!= null) e.setPreliminaryComments(dto.getPreliminaryComments());
        if (dto.getControlMeasures()    != null) e.setControlMeasures(dto.getControlMeasures());
        if (dto.getReportedBy()         != null) e.setReportedBy(dto.getReportedBy());
        if (dto.getReportDate()         != null) e.setReportDate(dto.getReportDate());
        if (dto.getReviewedBy()         != null) e.setReviewedBy(dto.getReviewedBy());
        if (dto.getApprovedBy()         != null) e.setApprovedBy(dto.getApprovedBy());
        if (dto.getEvidenceFiles()      != null) e.setEvidencePaths(String.join("|", dto.getEvidenceFiles()));
        if (dto.getStatus()             != null) e.setStatus(dto.getStatus().toUpperCase());
        if (dto.getCreatedBy()          != null) e.setCreatedBy(dto.getCreatedBy());
    }
}
