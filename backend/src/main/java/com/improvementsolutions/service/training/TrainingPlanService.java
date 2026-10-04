package com.improvementsolutions.service.training;

import com.improvementsolutions.dto.training.*;
import com.improvementsolutions.model.Business;
import com.improvementsolutions.model.BusinessEmployee;
import com.improvementsolutions.model.training.TrainingAnnualPlan;
import com.improvementsolutions.model.training.TrainingAttendance;
import com.improvementsolutions.model.training.TrainingPlanItem;
import com.improvementsolutions.model.training.TrainingSession;
import com.improvementsolutions.model.calidad.CalidadDocumento;
import com.improvementsolutions.repository.BusinessEmployeeRepository;
import com.improvementsolutions.repository.BusinessRepository;
import com.improvementsolutions.repository.calidad.CalidadDocumentoRepository;
import com.improvementsolutions.repository.training.TrainingAnnualPlanRepository;
import com.improvementsolutions.repository.training.TrainingAttendanceRepository;
import com.improvementsolutions.repository.training.TrainingPlanItemRepository;
import com.improvementsolutions.repository.training.TrainingSessionRepository;
import com.improvementsolutions.storage.StorageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class TrainingPlanService {

    public static final String PROGRAM_SSA = "SSA";
    private static final ZoneId ZONE = ZoneId.of("America/Guayaquil");

    private final BusinessRepository businessRepository;
    private final BusinessEmployeeRepository employeeRepository;
    private final CalidadDocumentoRepository calidadDocumentoRepository;
    private final TrainingAnnualPlanRepository planRepository;
    private final TrainingPlanItemRepository itemRepository;
    private final TrainingSessionRepository sessionRepository;
    private final TrainingAttendanceRepository attendanceRepository;
    private final StorageService storageService;

    public int currentYear() {
        LocalDate today = LocalDate.now(ZONE);
        if (today.getMonthValue() == 1 && today.getDayOfMonth() <= 5) {
            return today.getYear() - 1;
        }
        return today.getYear();
    }

    public boolean canWrite(Authentication auth) {
        if (auth == null) return false;
        for (GrantedAuthority a : auth.getAuthorities()) {
            String n = a.getAuthority();
            if ("ROLE_ADMIN".equals(n) || "ROLE_SUPER_ADMIN".equals(n)) return true;
        }
        return false;
    }

    @Transactional
    public TrainingYearDto getYear(String ruc, Integer year, Authentication auth) {
        Business business = business(ruc);
        int vigente = currentYear();
        int y = year == null ? vigente : year;
        TrainingAnnualPlan plan = ensurePlan(business.getId(), y, y == vigente);
        TrainingYearDto dto = new TrainingYearDto();
        dto.setYear(y);
        dto.setCurrent(y == vigente);
        dto.setProgram(PROGRAM_SSA);
        dto.setCanWrite(canWrite(auth) && plan != null && "OPEN".equals(plan.getStatus()) && y == vigente);
        dto.setCompanyName(firstNonBlank(business.getName(), business.getTradeName(), "Empresa"));
        dto.setCompanyShort(firstNonBlank(business.getTradeName(), business.getNameShort(), business.getName()));
        dto.setLegalRepresentative(firstNonBlank(business.getLegalRepresentative()));
        dto.setRuc(business.getRuc());
        dto.setLogoUrl(logoUrl(business.getLogo()));
        dto.setDocCode("SSA-PLN-" + y + "-F1");
        dto.setVersion("01");
        applyRegisterTemplate(dto, business);
        List<Integer> years = planRepository.findByBusinessIdAndProgramOrderByYearDesc(business.getId(), PROGRAM_SSA)
                .stream().map(TrainingAnnualPlan::getYear).distinct().collect(Collectors.toList());
        if (!years.contains(vigente)) years.add(0, vigente);
        years.sort(Comparator.reverseOrder());
        dto.setAvailableYears(years);
        if (plan == null) {
            dto.setStatus("NONE");
            dto.setInfo("No hay plan guardado para " + y + ".");
            return dto;
        }
        dto.setStatus(plan.getStatus());
        dto.setApprovalStatus(plan.getApprovalStatus() == null || plan.getApprovalStatus().isBlank()
                ? "DRAFT" : plan.getApprovalStatus());
        dto.setApprovedFile(plan.getApprovedFile());
        dto.setApprovedBy(plan.getApprovedBy());
        if (plan.getApprovedAt() != null) {
            dto.setApprovedAt(plan.getApprovedAt().format(DateTimeFormatter.ofPattern("dd-MM-yyyy")));
        }
        if (plan.getCreatedAt() != null) {
            dto.setRevisionDate(plan.getCreatedAt().toLocalDate().format(DateTimeFormatter.ofPattern("dd-MM-yyyy")));
        } else {
            dto.setRevisionDate(LocalDate.now(ZONE).format(DateTimeFormatter.ofPattern("dd-MM-yyyy")));
        }
        List<BusinessEmployee> active = activeEmployees(business.getId());
        List<TrainingPlanItem> items = itemRepository.findByPlanIdOrderBySortOrderAscIdAsc(plan.getId());
        sanitizeCatalogNames(items);
        List<TrainingSession> sessions = sessionRepository.findByPlanIdOrderBySessionDateDescIdDesc(plan.getId());
        Map<Long, List<TrainingSession>> byItem = sessions.stream().collect(Collectors.groupingBy(TrainingSession::getItemId));
        List<Long> sessionIds = sessions.stream().map(TrainingSession::getId).toList();
        Map<Long, Set<Long>> presentBySession = new HashMap<>();
        if (!sessionIds.isEmpty()) {
            for (TrainingAttendance a : attendanceRepository.findBySessionIdIn(sessionIds)) {
                if (Boolean.TRUE.equals(a.getPresent())) {
                    presentBySession.computeIfAbsent(a.getSessionId(), k -> new HashSet<>()).add(a.getEmployeeId());
                }
            }
        }
        int month = LocalDate.now(ZONE).getMonthValue();
        int sumObl = 0, sumTr = 0, overdue = 0;
        for (TrainingPlanItem it : items) {
            List<TrainingSession> itemSessions = byItem.getOrDefault(it.getId(), List.of());
            TrainingItemDto row = toItemDto(it, active, itemSessions, presentBySession, month, y == vigente);
            dto.getItems().add(row);
            if ("EVENTUAL".equalsIgnoreCase(it.getOrigin())) continue;
            if (!enteredPlanTopic(it, itemSessions)) continue;
            sumObl += row.getObligated();
            sumTr += row.getTrained();
            if (row.isOverdue()) overdue++;
        }
        dto.setObligatedTotal(sumObl);
        dto.setTrainedTotal(sumTr);
        dto.setPercent(sumObl == 0 ? 0 : (int) Math.round(100.0 * sumTr / sumObl));
        dto.setSessionCount(sessions.size());
        dto.setOverdueTopics(overdue);
        dto.setInfo("Plan SSA " + y + ("CLOSED".equals(plan.getStatus()) ? " (cerrado)" : " (vigente)"));
        Set<Long> trainedAny = new HashSet<>();
        for (Set<Long> s : presentBySession.values()) trainedAny.addAll(s);
        dto.setCensus(toCensus(active, items, byItem, presentBySession, trainedAny));
        return dto;
    }

    @Transactional
    public TrainingYearDto approveDocument(String ruc, Integer year, MultipartFile file, Authentication auth) {
        if (!canWrite(auth)) throw new IllegalArgumentException("Solo el administrador puede subir el plan validado.");
        if (file == null || file.isEmpty()) throw new IllegalArgumentException("Adjunte el PDF validado.");
        String name = file.getOriginalFilename() == null ? "" : file.getOriginalFilename().toLowerCase(Locale.ROOT);
        String type = file.getContentType() == null ? "" : file.getContentType().toLowerCase(Locale.ROOT);
        if (!type.contains("pdf") && !name.endsWith(".pdf")) {
            throw new IllegalArgumentException("El documento validado debe ser un PDF.");
        }
        Business business = business(ruc);
        int y = year == null ? currentYear() : year;
        TrainingAnnualPlan plan = ensurePlan(business.getId(), y, y == currentYear());
        if (plan == null) throw new IllegalArgumentException("No hay plan para este año.");
        try {
            String stored = storageService.store("ssa-training", file,
                    "plan-" + business.getRuc() + "-" + y + ".pdf");
            plan.setApprovedFile(stored);
            plan.setApprovalStatus("APPROVED");
            plan.setApprovedAt(LocalDateTime.now(ZONE));
            plan.setApprovedBy(auth != null ? auth.getName() : null);
            planRepository.save(plan);
        } catch (Exception e) {
            throw new IllegalArgumentException("No se pudo guardar el PDF validado.");
        }
        return getYear(ruc, y, auth);
    }

    private void applyRegisterTemplate(TrainingYearDto dto, Business business) {
        dto.setRegisterName("REGISTRO DE CAPACITACIÓN Y ENTRENAMIENTO");
        dto.setRegisterCode(firstNonBlank(dto.getDocCode(), "SSA-REG-CAP"));
        dto.setRegisterProcess("Gestión de Talento Humano");
        dto.setRegisterApprovedBy("Gerente General");
        dto.setRegisterDate(LocalDate.now(ZONE).format(DateTimeFormatter.ofPattern("dd/MM/yyyy")));
        dto.setRegisterVersion(firstNonBlank(dto.getVersion(), "01"));
        try {
            List<CalidadDocumento> docs = calidadDocumentoRepository.findByBusiness_IdOrderByCodigoAsc(business.getId());
            CalidadDocumento best = null;
            int bestScore = 0;
            for (CalidadDocumento d : docs) {
                if (d.getEstado() != null && d.getEstado().toUpperCase(Locale.ROOT).contains("ANUL")) continue;
                int s = registerScore(d);
                if (s > bestScore) {
                    bestScore = s;
                    best = d;
                }
            }
            if (best == null || bestScore < 4) return;
            dto.setRegisterName(firstNonBlank(best.getNombre(), dto.getRegisterName()).toUpperCase(Locale.ROOT));
            dto.setRegisterCode(firstNonBlank(best.getCodigo(), dto.getRegisterCode()));
            dto.setRegisterProcess(firstNonBlank(best.getProcesoName(), dto.getRegisterProcess()));
            dto.setRegisterVersion(firstNonBlank(best.getVersion(), dto.getRegisterVersion()));
            if (best.getFechaElaboracion() != null) {
                dto.setRegisterDate(best.getFechaElaboracion().format(DateTimeFormatter.ofPattern("dd/MM/yyyy")));
            }
        } catch (Exception e) {
            log.warn("No se pudo leer el registro de capacitación en Calidad: {}", e.getMessage());
        }
    }

    private int registerScore(CalidadDocumento d) {
        String n = ((d.getNombre() == null ? "" : d.getNombre()) + " "
                + (d.getCodigo() == null ? "" : d.getCodigo()) + " "
                + (d.getTipoName() == null ? "" : d.getTipoName())).toLowerCase(Locale.ROOT);
        boolean topic = n.contains("capacit") || n.contains("entrenam");
        boolean form = n.contains("registro") || n.contains("formato")
                || "FOR".equalsIgnoreCase(d.getTipoCode());
        if (!topic || !form) return 0;
        int s = 4;
        if (n.contains("registro")) s += 2;
        if (d.getFilePath() != null && !d.getFilePath().isBlank()) s += 1;
        return s;
    }

    private String logoUrl(String logo) {
        if (logo == null || logo.isBlank()) return null;
        String file = logo.replace('\\', '/');
        int i = file.lastIndexOf('/');
        String name = i >= 0 ? file.substring(i + 1) : file;
        return "/api/files/logos/" + name;
    }

    @Transactional(readOnly = true)
    public TrainingMissingDto missing(String ruc, Long itemId) {
        Business business = business(ruc);
        TrainingPlanItem item = itemRepository.findById(itemId)
                .orElseThrow(() -> new IllegalArgumentException("Tema no encontrado"));
        TrainingAnnualPlan plan = planRepository.findById(item.getPlanId())
                .orElseThrow(() -> new IllegalArgumentException("Plan no encontrado"));
        if (!plan.getBusinessId().equals(business.getId())) {
            throw new IllegalArgumentException("El tema no pertenece a esta empresa.");
        }
        List<BusinessEmployee> obligated = obligated(item, activeEmployees(business.getId()));
        Set<Long> trained = trainedEmployeeIds(item.getId());
        TrainingMissingDto out = new TrainingMissingDto();
        out.setItemId(item.getId());
        out.setTopicName(item.getName());
        out.setAudienceLabel(item.getAudienceLabel());
        out.setObligated(obligated.size());
        int tr = 0;
        for (BusinessEmployee e : obligated) {
            TrainingPersonDto p = toPerson(e);
            boolean ok = trained.contains(e.getId());
            p.setTrained(ok);
            if (ok) tr++;
            else out.getPeople().add(p);
        }
        out.setTrained(tr);
        out.setMissing(out.getPeople().size());
        out.getPeople().sort(Comparator.comparing(TrainingPersonDto::getFullName, String.CASE_INSENSITIVE_ORDER));
        return out;
    }

    @Transactional(readOnly = true)
    public List<TrainingPersonDto> obligatedPeople(String ruc, Long itemId) {
        Business business = business(ruc);
        TrainingPlanItem item = itemRepository.findById(itemId)
                .orElseThrow(() -> new IllegalArgumentException("Tema no encontrado"));
        TrainingAnnualPlan plan = planRepository.findById(item.getPlanId())
                .orElseThrow(() -> new IllegalArgumentException("Plan no encontrado"));
        if (!plan.getBusinessId().equals(business.getId())) {
            throw new IllegalArgumentException("El tema no pertenece a esta empresa.");
        }
        Set<Long> trained = trainedEmployeeIds(item.getId());
        return obligated(item, activeEmployees(business.getId())).stream()
                .map(e -> {
                    TrainingPersonDto p = toPerson(e);
                    p.setTrained(trained.contains(e.getId()));
                    return p;
                })
                .sorted(Comparator.comparing(TrainingPersonDto::getFullName, String.CASE_INSENSITIVE_ORDER))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<TrainingPersonDto> audiencePeople(String ruc, String audienceCode) {
        Business business = business(ruc);
        TrainingPlanItem probe = new TrainingPlanItem();
        probe.setAudienceCode(audienceCode == null || audienceCode.isBlank() ? "ALL" : audienceCode.trim());
        return obligated(probe, activeEmployees(business.getId())).stream()
                .map(this::toPerson)
                .sorted(Comparator.comparing(TrainingPersonDto::getFullName, String.CASE_INSENSITIVE_ORDER))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<TrainingSessionDto> sessions(String ruc, Integer year) {
        Business business = business(ruc);
        int y = year == null ? currentYear() : year;
        TrainingAnnualPlan plan = planRepository.findByBusinessIdAndYearAndProgram(business.getId(), y, PROGRAM_SSA)
                .orElse(null);
        if (plan == null) return List.of();
        List<TrainingPlanItem> items = itemRepository.findByPlanIdOrderBySortOrderAscIdAsc(plan.getId());
        sanitizeCatalogNames(items);
        Map<Long, TrainingPlanItem> itemMap = items.stream()
                .collect(Collectors.toMap(TrainingPlanItem::getId, it -> it));
        List<TrainingSession> list = sessionRepository.findByPlanIdOrderBySessionDateDescIdDesc(plan.getId());
        List<Long> ids = list.stream().map(TrainingSession::getId).toList();
        Map<Long, List<Long>> presentIds = new HashMap<>();
        if (!ids.isEmpty()) {
            for (TrainingAttendance a : attendanceRepository.findBySessionIdIn(ids)) {
                if (Boolean.TRUE.equals(a.getPresent()) && a.getEmployeeId() != null) {
                    presentIds.computeIfAbsent(a.getSessionId(), k -> new ArrayList<>()).add(a.getEmployeeId());
                }
            }
        }
        Set<Long> empIds = presentIds.values().stream().flatMap(List::stream).collect(Collectors.toSet());
        Map<Long, BusinessEmployee> emps = empIds.isEmpty()
                ? Map.of()
                : employeeRepository.findAllById(empIds).stream()
                .collect(Collectors.toMap(BusinessEmployee::getId, e -> e, (a, b) -> a));
        List<TrainingSessionDto> out = new ArrayList<>();
        for (TrainingSession s : list) {
            TrainingPlanItem item = itemMap.get(s.getItemId());
            String name = item != null ? item.getName() : "Tema";
            List<TrainingPersonDto> people = new ArrayList<>();
            for (Long eid : presentIds.getOrDefault(s.getId(), List.of())) {
                BusinessEmployee e = emps.get(eid);
                if (e == null) continue;
                TrainingPersonDto p = toPerson(e);
                p.setTrained(true);
                people.add(p);
            }
            people.sort(Comparator.comparing(TrainingPersonDto::getFullName, String.CASE_INSENSITIVE_ORDER));
            boolean reinduction = isReinduction(item, s);
            out.add(toSessionDto(s, name, people.size(), reinduction, people));
        }
        return out;
    }

    @Transactional(readOnly = true)
    public List<TrainingWorkerDto> workers(String ruc, Integer year, String q) {
        Business business = business(ruc);
        int y = year == null ? currentYear() : year;
        List<BusinessEmployee> active = activeEmployees(business.getId());
        String query = q == null ? "" : q.trim().toLowerCase(Locale.ROOT);
        TrainingAnnualPlan plan = planRepository.findByBusinessIdAndYearAndProgram(business.getId(), y, PROGRAM_SSA)
                .orElse(null);
        List<TrainingPlanItem> items = plan == null
                ? List.of()
                : itemRepository.findByPlanIdOrderBySortOrderAscIdAsc(plan.getId());
        Map<Long, Set<Long>> trainedByItem = trainedByItem(items);
        List<TrainingWorkerDto> out = new ArrayList<>();
        for (BusinessEmployee e : active) {
            if (!matchesWorkerQuery(e, query)) continue;
            int rec = 0;
            int pend = 0;
            for (TrainingPlanItem it : items) {
                if (!matchesAudience(it.getAudienceCode() == null ? "ALL" : it.getAudienceCode(), e)) continue;
                if (trainedByItem.getOrDefault(it.getId(), Set.of()).contains(e.getId())) rec++;
                else pend++;
            }
            out.add(toWorkerSummary(e, rec, pend));
        }
        out.sort(Comparator.comparing(TrainingWorkerDto::getFullName, String.CASE_INSENSITIVE_ORDER));
        return out;
    }

    @Transactional(readOnly = true)
    public TrainingWorkerDto worker(String ruc, Long employeeId, Integer year) {
        Business business = business(ruc);
        int y = year == null ? currentYear() : year;
        BusinessEmployee employee = employeeRepository.findDetailedById(employeeId)
                .orElseGet(() -> employeeRepository.findById(employeeId)
                .orElseThrow(() -> new IllegalArgumentException("Trabajador no encontrado")));
        if (employee.getBusiness() == null || !business.getId().equals(employee.getBusiness().getId())) {
            throw new IllegalArgumentException("El trabajador no pertenece a esta empresa.");
        }
        TrainingAnnualPlan plan = planRepository.findByBusinessIdAndYearAndProgram(business.getId(), y, PROGRAM_SSA)
                .orElse(null);
        List<TrainingPlanItem> items = plan == null
                ? List.of()
                : itemRepository.findByPlanIdOrderBySortOrderAscIdAsc(plan.getId());
        Map<Long, String> names = items.stream()
                .collect(Collectors.toMap(TrainingPlanItem::getId, TrainingPlanItem::getName));
        Map<Long, Set<Long>> trainedByItem = trainedByItem(items);
        TrainingWorkerDto dto = toWorkerSummary(employee, 0, 0);
        Map<Long, TrainingPlanItem> itemMap = items.stream()
                .collect(Collectors.toMap(TrainingPlanItem::getId, i -> i, (a, b) -> a));
        int hours = 0;
        if (plan != null) {
            List<TrainingSession> sessions = sessionRepository.findByPlanIdOrderBySessionDateDescIdDesc(plan.getId());
            List<Long> ids = sessions.stream().map(TrainingSession::getId).toList();
            Set<Long> presentSessions = new HashSet<>();
            if (!ids.isEmpty()) {
                for (TrainingAttendance a : attendanceRepository.findBySessionIdIn(ids)) {
                    if (Boolean.TRUE.equals(a.getPresent()) && employeeId.equals(a.getEmployeeId())) {
                        presentSessions.add(a.getSessionId());
                    }
                }
            }
            for (TrainingSession s : sessions) {
                if (!presentSessions.contains(s.getId())) continue;
                TrainingWorkerDto.TrainingReceivedDto row = new TrainingWorkerDto.TrainingReceivedDto();
                row.setSessionId(s.getId());
                row.setItemId(s.getItemId());
                TrainingPlanItem it = itemMap.get(s.getItemId());
                row.setTopicName(it != null ? it.getName() : names.getOrDefault(s.getItemId(), "Tema"));
                row.setSessionDate(s.getSessionDate() != null ? s.getSessionDate().toString() : null);
                row.setPlace(s.getPlace());
                row.setFacilitator(s.getFacilitator());
                row.setHours(s.getHours());
                if (s.getHours() != null) hours += s.getHours();
                row.setEvidenceUrl(evidenceUrl(s.getEvidenceFile()));
                row.setOrigin(s.getOrigin());
                if (it != null) {
                    row.setActivityType(it.getActivityType());
                    row.setMethodology(it.getMethodology());
                    if (row.getOrigin() == null || row.getOrigin().isBlank()) row.setOrigin(it.getOrigin());
                }
                dto.getRecords().add(row);
            }
        }
        for (TrainingPlanItem it : items) {
            if (!matchesAudience(it.getAudienceCode() == null ? "ALL" : it.getAudienceCode(), employee)) continue;
            boolean ok = trainedByItem.getOrDefault(it.getId(), Set.of()).contains(employee.getId());
            if (ok) dto.setReceived(dto.getReceived() + 1);
            else {
                dto.setPending(dto.getPending() + 1);
                TrainingWorkerDto.TrainingPendingTopicDto p = new TrainingWorkerDto.TrainingPendingTopicDto();
                p.setItemId(it.getId());
                p.setTopicName(it.getName());
                p.setAudienceLabel(it.getAudienceLabel());
                dto.getPendingTopics().add(p);
            }
        }
        dto.setHoursTotal(hours);
        return dto;
    }

    @Transactional
    public TrainingSessionDto createSession(String ruc, TrainingSessionRequest req, Authentication auth) {
        return createSession(ruc, req, null, null, auth);
    }

    @Transactional
    public TrainingSessionDto createSession(String ruc, TrainingSessionRequest req, MultipartFile file, Authentication auth) {
        return createSession(ruc, req, file, null, auth);
    }

    @Transactional
    public TrainingSessionDto createSession(String ruc, TrainingSessionRequest req, MultipartFile file,
                                            List<MultipartFile> photos, Authentication auth) {
        if (!canWrite(auth)) throw new IllegalArgumentException("Solo el administrador de la empresa puede registrar capacitaciones.");
        Business business = business(ruc);
        if (req == null || req.getItemId() == null) throw new IllegalArgumentException("Seleccione el tema.");
        TrainingPlanItem item = itemRepository.findById(req.getItemId())
                .orElseThrow(() -> new IllegalArgumentException("Tema no encontrado"));
        TrainingAnnualPlan plan = planRepository.findById(item.getPlanId())
                .orElseThrow(() -> new IllegalArgumentException("Plan no encontrado"));
        if (!plan.getBusinessId().equals(business.getId())) throw new IllegalArgumentException("El tema no pertenece a esta empresa.");
        if (!"OPEN".equals(plan.getStatus())) throw new IllegalArgumentException("El plan de este año ya está cerrado.");
        if (plan.getYear() != currentYear()) throw new IllegalArgumentException("Solo se registra en el año vigente.");
        LocalDate date;
        try {
            date = LocalDate.parse(req.getSessionDate());
        } catch (Exception e) {
            throw new IllegalArgumentException("Fecha inválida.");
        }
        TrainingSession session = sessionRepository.save(TrainingSession.builder()
                .businessId(business.getId())
                .planId(plan.getId())
                .itemId(item.getId())
                .sessionDate(date)
                .place(req.getPlace())
                .hours(req.getHours())
                .facilitator(req.getFacilitator())
                .notes(req.getNotes())
                .origin(sessionOrigin(item, date))
                .evidenceFile(storeEvidence(ruc, file))
                .evidencePhotos(storeSessionPhotos(ruc, photos))
                .createdBy(auth != null ? auth.getName() : null)
                .build());
        if (req.getAttendees() != null) {
            for (TrainingSessionRequest.AttendanceRow row : req.getAttendees()) {
                if (row.getEmployeeId() == null) continue;
                attendanceRepository.save(TrainingAttendance.builder()
                        .sessionId(session.getId())
                        .employeeId(row.getEmployeeId())
                        .present(Boolean.TRUE.equals(row.getPresent()))
                        .score(row.getScore())
                        .build());
            }
        }
        int presentCount = req.getAttendees() == null ? 0 : (int) req.getAttendees().stream()
                .filter(a -> Boolean.TRUE.equals(a.getPresent())).count();
        boolean reinduction = "REINDUCCION".equals(session.getOrigin());
        return toSessionDto(session, item.getName(), presentCount, reinduction, List.of());
    }

    @Transactional
    public TrainingItemDto addEventual(String ruc, TrainingItemDto body, Authentication auth) {
        return addEventual(ruc, body, null, null, auth);
    }

    @Transactional
    public TrainingItemDto addEventual(String ruc, TrainingItemDto body, MultipartFile pdf,
                                       List<MultipartFile> photos, Authentication auth) {
        if (!canWrite(auth)) throw new IllegalArgumentException("Solo el administrador de la empresa puede agregar temas.");
        Business business = business(ruc);
        int y = currentYear();
        TrainingAnnualPlan plan = ensurePlan(business.getId(), y, true);
        if (plan == null || !"OPEN".equals(plan.getStatus())) {
            throw new IllegalArgumentException("El plan no está abierto.");
        }
        String name = body != null && body.getName() != null ? body.getName().trim() : "";
        if (name.isEmpty()) throw new IllegalArgumentException("Indique el nombre del tema.");
        List<TrainingPlanItem> existing = itemRepository.findByPlanIdOrderBySortOrderAscIdAsc(plan.getId());
        int order = existing.size() + 1;
        boolean planned = body.getMonths() != null && !body.getMonths().isEmpty();
        TrainingPlanItem it = TrainingPlanItem.builder()
                .planId(plan.getId())
                .name(name)
                .description(blankToNull(body.getDescription()))
                .activityType(blankToNull(body.getActivityType()))
                .facilitatorType(blankToNull(body.getFacilitatorType()))
                .facilitator(blankToNull(body.getFacilitator()))
                .place(blankToNull(body.getPlace()))
                .materials(blankToNull(body.getMaterials()))
                .audienceCode(body.getAudienceCode() != null ? body.getAudienceCode() : "ALL")
                .audienceLabel(audienceLabel(body))
                .months(joinMonths(body.getMonths()))
                .duration(body.getDuration())
                .methodology(body.getMethodology() != null ? body.getMethodology() : "Presencial")
                .plannedCount(body.getPlannedCount())
                .sortOrder(order)
                .origin(planned ? "PLANIFICADA" : "EVENTUAL")
                .build();
        applyItemEvidence(ruc, it, pdf, photos, !planned);
        it = itemRepository.save(it);
        return toItemDto(it, activeEmployees(business.getId()), List.of(), Map.of(), LocalDate.now(ZONE).getMonthValue(), true);
    }

    @Transactional
    public TrainingItemDto updateItem(String ruc, Long itemId, TrainingItemDto body, Authentication auth) {
        return updateItem(ruc, itemId, body, null, null, auth);
    }

    @Transactional
    public TrainingItemDto updateItem(String ruc, Long itemId, TrainingItemDto body, MultipartFile pdf,
                                      List<MultipartFile> photos, Authentication auth) {
        TrainingPlanItem it = writableItem(ruc, itemId, auth);
        String name = body != null && body.getName() != null ? body.getName().trim() : "";
        if (name.isEmpty()) throw new IllegalArgumentException("Indique el nombre del tema.");
        it.setName(name);
        it.setDescription(blankToNull(body.getDescription()));
        it.setActivityType(blankToNull(body.getActivityType()));
        it.setFacilitatorType(blankToNull(body.getFacilitatorType()));
        it.setFacilitator(blankToNull(body.getFacilitator()));
        it.setPlace(blankToNull(body.getPlace()));
        it.setMaterials(blankToNull(body.getMaterials()));
        it.setAudienceCode(body.getAudienceCode() != null ? body.getAudienceCode() : "ALL");
        it.setAudienceLabel(audienceLabel(body));
        it.setMonths(joinMonths(body.getMonths()));
        it.setDuration(body.getDuration());
        it.setMethodology(body.getMethodology() != null ? body.getMethodology() : it.getMethodology());
        it.setPlannedCount(body.getPlannedCount());
        applyItemEvidence(ruc, it, pdf, photos, false);
        it = itemRepository.save(it);
        return toItemDto(it, activeEmployees(business(ruc).getId()), List.of(), Map.of(), LocalDate.now(ZONE).getMonthValue(), true);
    }

    @Transactional
    public void deleteItem(String ruc, Long itemId, Authentication auth) {
        TrainingPlanItem it = writableItem(ruc, itemId, auth);
        List<TrainingSession> sessions = sessionRepository.findByItemIdOrderBySessionDateDesc(itemId);
        for (TrainingSession s : sessions) {
            attendanceRepository.deleteAll(attendanceRepository.findBySessionId(s.getId()));
            sessionRepository.delete(s);
        }
        itemRepository.delete(it);
    }

    private TrainingPlanItem writableItem(String ruc, Long itemId, Authentication auth) {
        if (!canWrite(auth)) throw new IllegalArgumentException("Solo el administrador de la empresa puede modificar el cronograma.");
        Business business = business(ruc);
        TrainingPlanItem item = itemRepository.findById(itemId)
                .orElseThrow(() -> new IllegalArgumentException("Tema no encontrado"));
        TrainingAnnualPlan plan = planRepository.findById(item.getPlanId())
                .orElseThrow(() -> new IllegalArgumentException("Plan no encontrado"));
        if (!plan.getBusinessId().equals(business.getId())) throw new IllegalArgumentException("El tema no pertenece a esta empresa.");
        if (!"OPEN".equals(plan.getStatus())) throw new IllegalArgumentException("El plan de este año ya está cerrado.");
        if (plan.getYear() != currentYear()) throw new IllegalArgumentException("Solo se edita el año vigente.");
        return item;
    }

    /** 6 de enero 00:10 Ecuador: cierra el año que terminó y abre el vigente. */
    @Scheduled(cron = "0 10 0 6 1 *", zone = "America/Guayaquil")
    public void rolloverYear() {
        int vigente = currentYear();
        int previous = vigente - 1;
        log.info("[TrainingPlan] Cierre anual SSA {} → abre {}", previous, vigente);
        for (Business b : businessRepository.findAll()) {
            try {
                planRepository.findByBusinessIdAndYearAndProgram(b.getId(), previous, PROGRAM_SSA)
                        .ifPresent(p -> {
                            if ("OPEN".equals(p.getStatus())) {
                                p.setStatus("CLOSED");
                                p.setClosedAt(LocalDateTime.now(ZONE));
                                planRepository.save(p);
                            }
                        });
                ensurePlan(b.getId(), vigente, true);
            } catch (Exception e) {
                log.warn("[TrainingPlan] Empresa {}: {}", b.getId(), e.getMessage());
            }
        }
    }

    private TrainingAnnualPlan ensurePlan(Long businessId, int year, boolean createIfMissing) {
        Optional<TrainingAnnualPlan> existing = planRepository.findByBusinessIdAndYearAndProgram(businessId, year, PROGRAM_SSA);
        if (existing.isPresent()) return existing.get();
        if (!createIfMissing) return null;
        TrainingAnnualPlan plan = planRepository.save(TrainingAnnualPlan.builder()
                .businessId(businessId)
                .year(year)
                .program(PROGRAM_SSA)
                .status("OPEN")
                .build());
        return plan;
    }

    private TrainingItemDto toItemDto(TrainingPlanItem it,
                                      List<BusinessEmployee> active,
                                      List<TrainingSession> sessions,
                                      Map<Long, Set<Long>> presentBySession,
                                      int currentMonth,
                                      boolean currentYear) {
        List<Integer> months = parseMonths(it.getMonths());
        List<BusinessEmployee> obl = obligated(it, active);
        Set<Long> trained = new HashSet<>();
        for (TrainingSession s : sessions) {
            trained.addAll(presentBySession.getOrDefault(s.getId(), Set.of()));
        }
        trained.retainAll(obl.stream().map(BusinessEmployee::getId).collect(Collectors.toSet()));
        TrainingItemDto dto = new TrainingItemDto();
        dto.setId(it.getId());
        dto.setName(it.getName());
        dto.setDescription(it.getDescription());
        dto.setActivityType(it.getActivityType());
        dto.setFacilitatorType(it.getFacilitatorType());
        dto.setFacilitator(it.getFacilitator());
        dto.setPlace(it.getPlace());
        dto.setEvidencePdfUrl(evidenceUrl(it.getEvidencePdf()));
        dto.setEvidencePhotoUrls(photoUrls(it.getEvidencePhotos()));
        dto.setMaterials(it.getMaterials());
        dto.setAudienceCode(it.getAudienceCode());
        dto.setAudienceLabel(it.getAudienceLabel());
        dto.setMonths(months);
        dto.setDuration(it.getDuration());
        dto.setMethodology(it.getMethodology());
        dto.setPlannedCount(obl.size());
        dto.setOrigin(it.getOrigin());
        dto.setObligated(obl.size());
        dto.setTrained(trained.size());
        dto.setMissing(Math.max(0, obl.size() - trained.size()));
        dto.setPercent(obl.isEmpty() ? 0 : (int) Math.round(100.0 * trained.size() / obl.size()));
        dto.setSessions(sessions.size());
        boolean plannedPast = !months.isEmpty() && months.stream().anyMatch(m -> m < currentMonth);
        dto.setOverdue(currentYear && "PLANIFICADA".equals(it.getOrigin()) && plannedPast && dto.getMissing() > 0);
        return dto;
    }

    private TrainingCensusDto toCensus(List<BusinessEmployee> active,
                                       List<TrainingPlanItem> items,
                                       Map<Long, List<TrainingSession>> byItem,
                                       Map<Long, Set<Long>> presentBySession,
                                       Set<Long> trainedAny) {
        TrainingCensusDto c = new TrainingCensusDto();
        c.setHeadcount(active.size());
        c.setSyncAt(LocalDateTime.now(ZONE).format(DateTimeFormatter.ofPattern("dd MMM yyyy, HH:mm", new Locale("es", "EC"))));
        Map<Long, Set<Long>> trainedByItem = new HashMap<>();
        for (TrainingPlanItem it : items) {
            Set<Long> ids = new HashSet<>();
            for (TrainingSession s : byItem.getOrDefault(it.getId(), List.of())) {
                ids.addAll(presentBySession.getOrDefault(s.getId(), Set.of()));
            }
            trainedByItem.put(it.getId(), ids);
        }
        int men = 0, women = 0, other = 0, priority = 0, direct = 0, contractor = 0, trainedPeople = 0;
        Map<String, List<BusinessEmployee>> byRole = new LinkedHashMap<>();
        Map<Long, TrainingCensusDto.TrainingSiteDto> sites = new LinkedHashMap<>();
        Map<String, Integer> operators = new LinkedHashMap<>();
        for (BusinessEmployee e : active) {
            String g = e.getGender() != null && e.getGender().getName() != null
                    ? e.getGender().getName().toLowerCase(Locale.ROOT) : "";
            if (g.contains("mujer") || g.contains("femen")) women++;
            else if (g.contains("hombre") || g.contains("mascul")) men++;
            else other++;
            String disc = e.getDiscapacidad();
            if (disc != null && !disc.isBlank() && !disc.equalsIgnoreCase("no") && !disc.equalsIgnoreCase("ninguna")) {
                priority++;
            }
            if (e.getContractorCompany() != null) contractor++;
            else direct++;
            if (trainedAny.contains(e.getId())) trainedPeople++;
            String role = roleName(e);
            byRole.computeIfAbsent(role, k -> new ArrayList<>()).add(e);
            if (e.getContractorBlock() != null && e.getContractorBlock().getId() != null) {
                TrainingCensusDto.TrainingSiteDto site = sites.computeIfAbsent(e.getContractorBlock().getId(), id -> {
                    TrainingCensusDto.TrainingSiteDto s = new TrainingCensusDto.TrainingSiteDto();
                    s.setId(id);
                    s.setName(firstNonBlank(e.getContractorBlock().getName(), "Frente"));
                    if (e.getContractorCompany() != null) s.setCompanyName(e.getContractorCompany().getName());
                    return s;
                });
                site.setCount(site.getCount() + 1);
            }
            if (e.getContractorCompany() != null && e.getContractorCompany().getName() != null
                    && !e.getContractorCompany().getName().isBlank()) {
                operators.merge(e.getContractorCompany().getName().trim(), 1, Integer::sum);
            }
        }
        c.setMen(men);
        c.setWomen(women);
        c.setOther(other);
        c.setPriority(priority);
        c.setDirect(direct);
        c.setContractor(contractor);
        c.setTrainedPeople(trainedPeople);
        c.setPendingPeople(Math.max(0, active.size() - trainedPeople));
        c.setPercentPeople(active.isEmpty() ? 0 : (int) Math.round(100.0 * trainedPeople / active.size()));
        List<TrainingCensusDto.TrainingRoleDto> roles = new ArrayList<>();
        for (Map.Entry<String, List<BusinessEmployee>> entry : byRole.entrySet()) {
            TrainingCensusDto.TrainingRoleDto r = new TrainingCensusDto.TrainingRoleDto();
            r.setName(entry.getKey());
            r.setCount(entry.getValue().size());
            r.setPercent(rolePercent(entry.getValue(), items, trainedByItem));
            r.setIcon(roleIcon(entry.getKey()));
            roles.add(r);
        }
        roles.sort(Comparator.comparingInt(TrainingCensusDto.TrainingRoleDto::getCount).reversed());
        if (roles.size() > 8) roles = new ArrayList<>(roles.subList(0, 8));
        c.setRoles(roles);
        List<TrainingCensusDto.TrainingSiteDto> siteList = new ArrayList<>(sites.values());
        siteList.sort(Comparator.comparingInt(TrainingCensusDto.TrainingSiteDto::getCount).reversed());
        c.setSites(siteList);
        List<TrainingCensusDto.TrainingOperatorDto> opList = new ArrayList<>();
        for (Map.Entry<String, Integer> op : operators.entrySet()) {
            TrainingCensusDto.TrainingOperatorDto row = new TrainingCensusDto.TrainingOperatorDto();
            row.setName(op.getKey());
            row.setCount(op.getValue());
            opList.add(row);
        }
        opList.sort(Comparator.comparingInt(TrainingCensusDto.TrainingOperatorDto::getCount).reversed());
        if (opList.size() > 6) opList = new ArrayList<>(opList.subList(0, 6));
        c.setOperators(opList);
        return c;
    }

    private int rolePercent(List<BusinessEmployee> people,
                            List<TrainingPlanItem> items,
                            Map<Long, Set<Long>> trainedByItem) {
        int obl = 0, tr = 0;
        for (BusinessEmployee e : people) {
            for (TrainingPlanItem it : items) {
                if (!matchesAudience(it.getAudienceCode() == null ? "ALL" : it.getAudienceCode(), e)) continue;
                obl++;
                if (trainedByItem.getOrDefault(it.getId(), Set.of()).contains(e.getId())) tr++;
            }
        }
        return obl == 0 ? 0 : (int) Math.round(100.0 * tr / obl);
    }

    private String roleName(BusinessEmployee e) {
        if (e.getPositionEntity() != null && e.getPositionEntity().getName() != null
                && !e.getPositionEntity().getName().isBlank()) {
            return e.getPositionEntity().getName().trim();
        }
        if (e.getPosition() != null && !e.getPosition().isBlank()) return e.getPosition().trim();
        return "Sin cargo";
    }

    private String roleIcon(String name) {
        String n = name.toLowerCase(Locale.ROOT);
        if (n.contains("supervisor") || n.contains("jefe") || n.contains("gerente")) return "badge";
        if (n.contains("conductor") || n.contains("chofer")) return "drive_eta";
        if (n.contains("admin")) return "business_center";
        if (n.contains("pesado") || n.contains("excav") || n.contains("retro")) return "agriculture";
        if (n.contains("manten")) return "build_circle";
        if (n.contains("vacuum") || n.contains("vacum")) return "local_shipping";
        if (n.contains("grúa") || n.contains("grua") || n.contains("winch")) return "precision_manufacturing";
        if (n.contains("pintura") || n.contains("sandblast") || n.contains("samblast")) return "format_paint";
        return "engineering";
    }

    private Set<Long> trainedEmployeeIds(Long itemId) {
        List<TrainingSession> sessions = sessionRepository.findByItemIdOrderBySessionDateDesc(itemId);
        if (sessions.isEmpty()) return Set.of();
        List<Long> ids = sessions.stream().map(TrainingSession::getId).toList();
        return attendanceRepository.findBySessionIdIn(ids).stream()
                .filter(a -> Boolean.TRUE.equals(a.getPresent()))
                .map(TrainingAttendance::getEmployeeId)
                .collect(Collectors.toSet());
    }

    private List<BusinessEmployee> obligated(TrainingPlanItem item, List<BusinessEmployee> active) {
        String code = item.getAudienceCode() == null ? "ALL" : item.getAudienceCode();
        return active.stream().filter(e -> matchesAudience(code, e)).toList();
    }

    private boolean matchesAudience(String code, BusinessEmployee e) {
        String pos = ((e.getPosition() != null ? e.getPosition() : "") + " " +
                (e.getPositionEntity() != null && e.getPositionEntity().getName() != null ? e.getPositionEntity().getName() : "")
        ).toLowerCase(Locale.ROOT);
        return switch (code) {
            case "SUPERVISORS" -> pos.matches(".*(supervisor|jefe|jefatura|gerente|coordinador).*");
            case "DRIVERS" -> pos.matches(".*(conductor|operador de\\s*vacuum|timonel|chofer).*");
            default -> true;
        };
    }

    private List<BusinessEmployee> activeEmployees(Long businessId) {
        List<BusinessEmployee> rows = employeeRepository.findWithRelationsByBusinessId(businessId);
        if (rows == null || rows.isEmpty()) {
            rows = employeeRepository.findByBusinessId(businessId);
        }
        return rows.stream().filter(this::isActive).toList();
    }

    private boolean isActive(BusinessEmployee e) {
        if (Boolean.FALSE.equals(e.getActive())) return false;
        String st = e.getStatus() == null ? "" : e.getStatus().trim().toUpperCase(Locale.ROOT);
        if ("INACTIVO".equals(st)) return false;
        if (e.getFechaSalida() != null && e.getFechaSalida().isBefore(LocalDate.now(ZONE))) return false;
        return true;
    }

    private TrainingPersonDto toPerson(BusinessEmployee e) {
        TrainingPersonDto p = new TrainingPersonDto();
        p.setId(e.getId());
        String n = ((e.getNombres() == null ? "" : e.getNombres()) + " " + (e.getApellidos() == null ? "" : e.getApellidos())).trim();
        p.setFullName(n.isEmpty() && e.getName() != null ? e.getName() : (n.isEmpty() ? "Colaborador" : n));
        p.setCedula(e.getCedula());
        p.setPhone(e.getPhone() != null && !e.getPhone().isBlank() ? e.getPhone() : e.getContactPhone());
        p.setEmail(e.getEmail());
        String pos = e.getPosition();
        if ((pos == null || pos.isBlank()) && e.getPositionEntity() != null) {
            pos = e.getPositionEntity().getName();
        }
        p.setPosition(pos);
        return p;
    }

    private TrainingSessionDto toSessionDto(TrainingSession s, String topicName, int presentCount,
                                           boolean reinduction, List<TrainingPersonDto> attendees) {
        TrainingSessionDto d = new TrainingSessionDto();
        d.setId(s.getId());
        d.setItemId(s.getItemId());
        d.setTopicName(topicName);
        d.setSessionDate(s.getSessionDate() != null ? s.getSessionDate().toString() : null);
        d.setPlace(s.getPlace());
        d.setHours(s.getHours());
        d.setFacilitator(s.getFacilitator());
        d.setPresentCount(presentCount);
        d.setCreatedBy(s.getCreatedBy());
        d.setEvidenceUrl(evidenceUrl(s.getEvidenceFile()));
        d.setEvidencePhotoUrls(photoUrls(s.getEvidencePhotos()));
        d.setOrigin(reinduction ? "REINDUCCION" : s.getOrigin());
        d.setReinduction(reinduction);
        d.setAttendees(attendees == null ? List.of() : attendees);
        return d;
    }

    private String sessionOrigin(TrainingPlanItem item, LocalDate date) {
        if (item != null && "EVENTUAL".equalsIgnoreCase(item.getOrigin())) return "EVENTUAL";
        List<Integer> months = item == null ? List.of() : parseMonths(item.getMonths());
        if (!months.isEmpty() && date != null && !months.contains(date.getMonthValue())) {
            return "REINDUCCION";
        }
        return item != null && item.getOrigin() != null ? item.getOrigin() : "PLANIFICADA";
    }

    private boolean isReinduction(TrainingPlanItem item, TrainingSession session) {
        if (session != null && "REINDUCCION".equalsIgnoreCase(session.getOrigin())) return true;
        if (item == null || session == null || session.getSessionDate() == null) return false;
        if ("EVENTUAL".equalsIgnoreCase(item.getOrigin())) return false;
        List<Integer> months = parseMonths(item.getMonths());
        if (months.isEmpty()) return false;
        return !months.contains(session.getSessionDate().getMonthValue());
    }

    private boolean enteredPlanTopic(TrainingPlanItem it, List<TrainingSession> sessions) {
        if (it == null) return false;
        if (sessions != null && !sessions.isEmpty()) return true;
        if (it.getFacilitator() != null && !it.getFacilitator().isBlank()) return true;
        if (it.getPlace() != null && !it.getPlace().isBlank()) return true;
        return it.getDescription() != null && !it.getDescription().isBlank();
    }

    private void sanitizeCatalogNames(List<TrainingPlanItem> items) {
        if (items == null || items.isEmpty()) return;
        List<String> catalog = SsaTrainingCatalog.seedItems().stream()
                .map(TrainingPlanItem::getName)
                .filter(Objects::nonNull)
                .toList();
        for (TrainingPlanItem it : items) {
            String n = it.getName() == null ? "" : it.getName().trim();
            if (n.isEmpty()) continue;
            for (String cat : catalog) {
                if (n.equals(cat)) break;
                if (n.startsWith(cat) && n.substring(cat.length()).matches("\\d+")) {
                    log.info("[TrainingPlan] Corrigiendo nombre '{}' → '{}'", n, cat);
                    it.setName(cat);
                    itemRepository.save(it);
                    break;
                }
            }
        }
    }

    private TrainingWorkerDto toWorkerSummary(BusinessEmployee e, int received, int pending) {
        TrainingPersonDto p = toPerson(e);
        TrainingWorkerDto d = new TrainingWorkerDto();
        d.setId(p.getId());
        d.setFullName(p.getFullName());
        d.setCedula(p.getCedula());
        d.setPosition(p.getPosition());
        d.setPhone(p.getPhone());
        d.setEmail(p.getEmail());
        d.setReceived(received);
        d.setPending(pending);
        d.setPhotoUrl(employeePhotoUrl(e));
        d.setBloodType(firstNonBlank(e.getTipoSangre()));
        d.setIess(firstNonBlank(e.getCodigoIess(), e.getIess()));
        d.setCompanyCode(firstNonBlank(e.getCodigoEmpresa()));
        if (e.getFechaIngreso() != null) {
            d.setHireDate(e.getFechaIngreso().format(DateTimeFormatter.ofPattern("dd/MM/yyyy")));
        }
        if (e.getDepartment() != null) d.setDepartment(firstNonBlank(e.getDepartment().getName()));
        if (e.getContractorBlock() != null) d.setBlock(firstNonBlank(e.getContractorBlock().getName()));
        if (e.getContractorCompany() != null) d.setContractorCompany(firstNonBlank(e.getContractorCompany().getName()));
        if (e.getTypeContract() != null) d.setContractType(firstNonBlank(e.getTypeContract().getName()));
        return d;
    }

    private String employeePhotoUrl(BusinessEmployee e) {
        String raw = firstNonBlank(e.getImagePath(), e.getImage());
        if (raw.isEmpty()) return null;
        String rel = raw.replace('\\', '/').replaceFirst("^\\./", "");
        if (rel.startsWith("uploads/")) rel = rel.substring("uploads/".length());
        if (rel.startsWith("/api/")) return rel;
        if (rel.startsWith("profiles/") || rel.contains("/profiles/")) return "/api/files/" + rel.replaceFirst("^/+", "");
        int i = rel.lastIndexOf('/');
        String name = i >= 0 ? rel.substring(i + 1) : rel;
        if (name.isBlank()) return null;
        return "/api/files/profiles/" + name;
    }

    private boolean matchesWorkerQuery(BusinessEmployee e, String query) {
        if (query == null || query.isBlank()) return true;
        TrainingPersonDto p = toPerson(e);
        return (p.getFullName() != null && p.getFullName().toLowerCase(Locale.ROOT).contains(query))
                || (p.getCedula() != null && p.getCedula().toLowerCase(Locale.ROOT).contains(query))
                || (p.getPosition() != null && p.getPosition().toLowerCase(Locale.ROOT).contains(query));
    }

    private Map<Long, Set<Long>> trainedByItem(List<TrainingPlanItem> items) {
        Map<Long, Set<Long>> map = new HashMap<>();
        for (TrainingPlanItem it : items) {
            map.put(it.getId(), trainedEmployeeIds(it.getId()));
        }
        return map;
    }

    private String storeEvidence(String ruc, MultipartFile file) {
        if (file == null || file.isEmpty()) return null;
        String orig = file.getOriginalFilename() == null ? "" : file.getOriginalFilename().toLowerCase(Locale.ROOT);
        String type = file.getContentType() == null ? "" : file.getContentType().toLowerCase(Locale.ROOT);
        boolean ok = type.contains("pdf") || type.contains("jpeg") || type.contains("jpg")
                || type.contains("png") || type.contains("webp")
                || orig.endsWith(".pdf") || orig.endsWith(".jpg") || orig.endsWith(".jpeg")
                || orig.endsWith(".png") || orig.endsWith(".webp");
        if (!ok) throw new IllegalArgumentException("El registro de asistencia debe ser PDF o imagen.");
        if (file.getSize() > 10L * 1024 * 1024) {
            throw new IllegalArgumentException("El archivo no puede superar 10 MB.");
        }
        String ext = orig.endsWith(".png") ? ".png"
                : (orig.endsWith(".jpg") || orig.endsWith(".jpeg") ? ".jpg"
                : orig.endsWith(".webp") ? ".webp" : ".pdf");
        try {
            return storageService.store("ssa-training", file, "sesion-" + ruc + "-" + UUID.randomUUID() + ext);
        } catch (Exception e) {
            throw new IllegalArgumentException("No se pudo guardar el registro de asistencia.");
        }
    }

    private String storeSessionPhotos(String ruc, List<MultipartFile> photos) {
        List<MultipartFile> pics = photos == null ? List.of() : photos.stream()
                .filter(f -> f != null && !f.isEmpty()).limit(4).toList();
        if (pics.isEmpty()) {
            throw new IllegalArgumentException("Adjunte de 1 a 4 fotos de evidencia.");
        }
        List<String> stored = new ArrayList<>();
        for (MultipartFile pic : pics) stored.add(storeItemPhoto(ruc, pic));
        return String.join(",", stored);
    }

    private void applyItemEvidence(String ruc, TrainingPlanItem it, MultipartFile pdf,
                                   List<MultipartFile> photos, boolean requireForExtra) {
        boolean eventual = !"PLANIFICADA".equals(it.getOrigin());
        List<MultipartFile> pics = photos == null ? List.of() : photos.stream()
                .filter(f -> f != null && !f.isEmpty()).limit(4).toList();
        boolean hasPdf = pdf != null && !pdf.isEmpty();
        if (requireForExtra && eventual) {
            if (!hasPdf) throw new IllegalArgumentException("Adjunte el PDF del acta o registro.");
            if (pics.isEmpty()) throw new IllegalArgumentException("Adjunte de 1 a 4 fotos de evidencia.");
        }
        if (hasPdf) it.setEvidencePdf(storeItemPdf(ruc, pdf));
        if (!pics.isEmpty()) {
            List<String> stored = new ArrayList<>();
            for (MultipartFile pic : pics) stored.add(storeItemPhoto(ruc, pic));
            it.setEvidencePhotos(String.join(",", stored));
        }
        if (eventual && it.getEvidencePhotos() != null) {
            long n = Arrays.stream(it.getEvidencePhotos().split(",")).filter(s -> !s.isBlank()).count();
            if (n > 4) throw new IllegalArgumentException("Máximo 4 fotos de evidencia.");
        }
    }

    private String storeItemPdf(String ruc, MultipartFile file) {
        String orig = file.getOriginalFilename() == null ? "" : file.getOriginalFilename().toLowerCase(Locale.ROOT);
        String type = file.getContentType() == null ? "" : file.getContentType().toLowerCase(Locale.ROOT);
        boolean ok = type.contains("pdf") || orig.endsWith(".pdf");
        if (!ok) throw new IllegalArgumentException("El acta debe ser un archivo PDF.");
        if (file.getSize() > 15L * 1024 * 1024) {
            throw new IllegalArgumentException("El PDF no puede superar 15 MB.");
        }
        try {
            return storageService.store("ssa-training", file, "acta-" + ruc + "-" + UUID.randomUUID() + ".pdf");
        } catch (Exception e) {
            throw new IllegalArgumentException("No se pudo guardar el PDF del acta.");
        }
    }

    private String storeItemPhoto(String ruc, MultipartFile file) {
        String orig = file.getOriginalFilename() == null ? "" : file.getOriginalFilename().toLowerCase(Locale.ROOT);
        String type = file.getContentType() == null ? "" : file.getContentType().toLowerCase(Locale.ROOT);
        boolean ok = type.contains("jpeg") || type.contains("jpg") || type.contains("png") || type.contains("webp")
                || orig.endsWith(".jpg") || orig.endsWith(".jpeg") || orig.endsWith(".png") || orig.endsWith(".webp");
        if (!ok) throw new IllegalArgumentException("Las evidencias deben ser JPG, PNG o WEBP.");
        if (file.getSize() > 15L * 1024 * 1024) {
            throw new IllegalArgumentException("Cada foto no puede superar 15 MB.");
        }
        String ext = orig.endsWith(".png") ? ".png" : orig.endsWith(".webp") ? ".webp" : ".jpg";
        try {
            return storageService.store("ssa-training", file, "foto-" + ruc + "-" + UUID.randomUUID() + ext);
        } catch (Exception e) {
            throw new IllegalArgumentException("No se pudo guardar la foto de evidencia.");
        }
    }

    private List<String> photoUrls(String raw) {
        if (raw == null || raw.isBlank()) return List.of();
        List<String> out = new ArrayList<>();
        for (String p : raw.split(",")) {
            String url = evidenceUrl(p.trim());
            if (url != null) out.add(url);
        }
        return out;
    }

    private String evidenceUrl(String stored) {
        if (stored == null || stored.isBlank()) return null;
        String file = stored.replace('\\', '/');
        int i = file.lastIndexOf('/');
        String name = i >= 0 ? file.substring(i + 1) : file;
        return "/api/files/download/ssa-training/" + name;
    }

    private List<Integer> parseMonths(String raw) {
        if (raw == null || raw.isBlank()) return List.of();
        List<Integer> out = new ArrayList<>();
        for (String p : raw.split(",")) {
            try {
                int m = Integer.parseInt(p.trim());
                if (m >= 1 && m <= 12) out.add(m);
            } catch (NumberFormatException ignored) {
            }
        }
        return out;
    }

    private String joinMonths(List<Integer> months) {
        if (months == null || months.isEmpty()) return "";
        return months.stream().filter(m -> m != null && m >= 1 && m <= 12).distinct().sorted()
                .map(String::valueOf).collect(Collectors.joining(","));
    }

    private String audienceLabel(TrainingItemDto body) {
        if (body.getAudienceLabel() != null && !body.getAudienceLabel().isBlank()) return body.getAudienceLabel().trim();
        String code = body.getAudienceCode() == null ? "ALL" : body.getAudienceCode();
        return switch (code) {
            case "SUPERVISORS" -> "Supervisores y jefaturas";
            case "DRIVERS" -> "Conductores";
            case "BRIGADE" -> "Personal de proyectos y brigadistas";
            default -> "Todas las áreas";
        };
    }

    private String blankToNull(String v) {
        if (v == null) return null;
        String t = v.trim();
        return t.isEmpty() ? null : t;
    }

    private String firstNonBlank(String... values) {
        if (values == null) return "";
        for (String v : values) {
            if (v != null && !v.isBlank()) return v.trim();
        }
        return "";
    }

    private Business business(String ruc) {
        return businessRepository.findByRuc(ruc)
                .orElseThrow(() -> new IllegalArgumentException("Empresa no encontrada"));
    }
}
