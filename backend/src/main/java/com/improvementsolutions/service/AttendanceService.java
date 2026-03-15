package com.improvementsolutions.service;

import com.improvementsolutions.model.*;
import com.improvementsolutions.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.YearMonth;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AttendanceService {

    private final BusinessRepository businessRepository;
    private final BusinessEmployeeRepository employeeRepository;
    private final EmployeeWorkDayRepository workDayRepository;
    private final EmployeeOvertimeRepository overtimeRepository;
    private final EmployeeVacationRepository vacationRepository;
    private final EmployeePermissionRepository permissionRepository;
    private final EmployeeIncidentRepository incidentRepository;
    private final EmployeeWorkScheduleHistoryRepository scheduleHistoryRepository;
    private final MonthlySheetClosureRepository closureRepository;
    private final WorkScheduleRepository workScheduleRepository;

    // ─────────────────── helpers ───────────────────

    private Business requireBusiness(Long businessId) {
        return businessRepository.findById(businessId)
                .orElseThrow(() -> new NoSuchElementException("Empresa no encontrada: " + businessId));
    }

    private BusinessEmployee requireEmployee(Long businessId, Long employeeId) {
        BusinessEmployee emp = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new NoSuchElementException("Empleado no encontrado: " + employeeId));
        if (!emp.getBusiness().getId().equals(businessId)) {
            throw new SecurityException("El empleado no pertenece a la empresa indicada");
        }
        return emp;
    }

    // ─────────────────── PLANILLA MENSUAL ───────────────────

    private record SchedulePattern(int workDays, int restDays) {
        int cycleLength() { return workDays + restDays; }
    }

    private Optional<SchedulePattern> parseSchedulePattern(BusinessEmployee emp) {
        if (emp == null || emp.getWorkSchedule() == null) return Optional.empty();
        return parseSchedulePatternFromName(emp.getWorkSchedule().getName());
    }

    private Optional<SchedulePattern> parseSchedulePatternFromName(String name) {
        if (name == null) return Optional.empty();
        // Formatos: "14x7", "14 X 7", "14*7", "14/7", "14-7" (tolerante)
        java.util.regex.Matcher m = java.util.regex.Pattern
                .compile("(\\d+)\\s*[xX\\*/\\-]\\s*(\\d+)")
                .matcher(name);
        if (!m.find()) return Optional.empty();
        try {
            int work = Integer.parseInt(m.group(1));
            int rest = Integer.parseInt(m.group(2));
            if (work <= 0 || rest < 0) return Optional.empty();
            return Optional.of(new SchedulePattern(work, rest));
        } catch (Exception ignore) {
            return Optional.empty();
        }
    }

    private String getAutoDayType(BusinessEmployee emp, LocalDate date) {
        if (emp == null || date == null) return null;
        // 1) Buscar en histórico de jornadas para esa fecha
        Optional<EmployeeWorkScheduleHistory> histOpt =
                scheduleHistoryRepository.findActiveForDate(emp.getId(), date);
        if (histOpt.isPresent()) {
            EmployeeWorkScheduleHistory hist = histOpt.get();
            Optional<SchedulePattern> p = parseSchedulePatternFromName(
                    hist.getWorkSchedule() != null ? hist.getWorkSchedule().getName() : null);
            if (p.isEmpty()) return null;
            LocalDate cycleOrigin = hist.getCycleStartDate() != null ? hist.getCycleStartDate() : hist.getStartDate();
            long diff = ChronoUnit.DAYS.between(cycleOrigin, date);
            int len = p.get().cycleLength();
            if (len <= 0) return null;
            int idx = (int) Math.floorMod(diff, len);
            return idx < p.get().workDays ? "T" : "D";
        }
        // 2) Fallback al campo directo del empleado
        Optional<SchedulePattern> p = parseSchedulePattern(emp);
        LocalDate start = emp.getWorkScheduleStartDate();
        if (p.isEmpty() || start == null) return null;
        if (date.isBefore(start)) return null;
        long diff = ChronoUnit.DAYS.between(start, date);
        int len = p.get().cycleLength();
        if (len <= 0) return null;
        int idx = (int) Math.floorMod(diff, len);
        return idx < p.get().workDays ? "T" : "D";
    }

    /**
     * Genera (o devuelve) la planilla mensual de una empresa.
     * Para cada empleado activo, devuelve un registro por día del mes.
     * Si aún no existe la entrada en BD, el tipo de día es "D" (descanso por defecto).
     */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getMonthlySheet(Long businessId, int year, int month) {
        requireBusiness(businessId);

        YearMonth ym = YearMonth.of(year, month);
        LocalDate from = ym.atDay(1);
        LocalDate to   = ym.atEndOfMonth();

        List<BusinessEmployee> employees = employeeRepository.findWithRelationsByBusinessId(businessId)
                .stream()
                .filter(e -> Boolean.TRUE.equals(e.getActive()))
                .collect(Collectors.toList());

        List<EmployeeWorkDay> savedDays = workDayRepository
                .findByBusiness_IdAndWorkDateBetweenOrderByEmployeeIdAscWorkDateAsc(businessId, from, to);

        Map<String, String> savedMap = new HashMap<>();
        Map<String, String> notesMap = new HashMap<>();
        for (EmployeeWorkDay wd : savedDays) {
            String key = wd.getEmployee().getId() + "_" + wd.getWorkDate();
            savedMap.put(key, wd.getDayType());
            if (wd.getNotes() != null) notesMap.put(key, wd.getNotes());
        }

        List<Map<String, Object>> result = new ArrayList<>();
        int daysInMonth = ym.lengthOfMonth();

        for (BusinessEmployee emp : employees) {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("employeeId",   emp.getId());
            row.put("fullName",     emp.getFullName());
            row.put("position",     emp.getPosition());
            row.put("cedula",       emp.getCedula());
            row.put("codigoEmpresa", emp.getCodigoEmpresa());
            row.put("workScheduleId", emp.getWorkSchedule() != null ? emp.getWorkSchedule().getId() : null);
            row.put("workScheduleName", emp.getWorkSchedule() != null ? emp.getWorkSchedule().getName() : null);
            row.put("workScheduleStartDate", emp.getWorkScheduleStartDate() != null ? emp.getWorkScheduleStartDate().toString() : null);

            List<Map<String, Object>> days = new ArrayList<>();
            Map<String, Integer> totals = new LinkedHashMap<>();
            totals.put("T", 0); totals.put("D", 0); totals.put("EX", 0);
            totals.put("V", 0); totals.put("P", 0);  totals.put("E", 0);

            for (int d = 1; d <= daysInMonth; d++) {
                LocalDate date = LocalDate.of(year, month, d);
                String key = emp.getId() + "_" + date;
                // Días anteriores al inicio de jornada: siempre en blanco (ignorar lo guardado en BD)
                LocalDate schedStart = emp.getWorkScheduleStartDate();
                boolean beforeStart = schedStart != null && date.isBefore(schedStart);
                String type = beforeStart ? null
                        : (savedMap.containsKey(key) ? savedMap.get(key) : getAutoDayType(emp, date));
                String notes = notesMap.get(key);

                Map<String, Object> dayInfo = new LinkedHashMap<>();
                dayInfo.put("day",  d);
                dayInfo.put("date", date.toString());
                dayInfo.put("dayType", type); // null = sin asignación (antes de startDate)
                if (notes != null) dayInfo.put("notes", notes);

                days.add(dayInfo);
                if (type != null) totals.merge(type, 1, Integer::sum);
            }

            row.put("days",   days);
            row.put("totals", totals);
            result.add(row);
        }

        return result;
    }

    /**
     * Guarda o actualiza el tipo de día para un empleado.
     * Garantiza aislamiento: valida que el empleado pertenezca a la empresa.
     */
    @Transactional
    public EmployeeWorkDay saveWorkDay(Long businessId, Long employeeId, LocalDate date, String dayType, String notes) {
        Business biz = requireBusiness(businessId);
        BusinessEmployee emp = requireEmployee(businessId, employeeId);

        Optional<EmployeeWorkDay> existing = workDayRepository.findByEmployee_IdAndWorkDate(employeeId, date);
        EmployeeWorkDay wd = existing.orElseGet(EmployeeWorkDay::new);
        wd.setBusiness(biz);
        wd.setEmployee(emp);
        wd.setWorkDate(date);
        wd.setDayType(dayType != null ? dayType : "D");
        wd.setNotes(notes);
        return workDayRepository.save(wd);
    }

    @Transactional
    public void setWorkScheduleStartDate(Long businessId, Long employeeId, LocalDate startDate) {
        requireBusiness(businessId);
        BusinessEmployee emp = requireEmployee(businessId, employeeId);
        emp.setWorkScheduleStartDate(startDate);
        employeeRepository.save(emp);
    }

    /**
     * Guarda en lote los días de trabajo (desde una planilla cargada).
     */
    @Transactional
    public int saveWorkDaysBatch(Long businessId, Long employeeId,
                                  List<Map<String, String>> dayEntries) {
        Business biz = requireBusiness(businessId);
        BusinessEmployee emp = requireEmployee(businessId, employeeId);
        int count = 0;
        for (Map<String, String> entry : dayEntries) {
            LocalDate date = LocalDate.parse(entry.get("date"));
            String type = entry.getOrDefault("dayType", "D");
            String notes = entry.get("notes");
            Optional<EmployeeWorkDay> existing = workDayRepository.findByEmployee_IdAndWorkDate(employeeId, date);
            EmployeeWorkDay wd = existing.orElseGet(EmployeeWorkDay::new);
            wd.setBusiness(biz);
            wd.setEmployee(emp);
            wd.setWorkDate(date);
            wd.setDayType(type);
            wd.setNotes(notes);
            workDayRepository.save(wd);
            count++;
        }
        return count;
    }

    // ─────────────────── HORAS EXTRA ───────────────────

    @Transactional(readOnly = true)
    public List<EmployeeOvertime> getOvertimeByBusiness(Long businessId, Integer year, Integer month) {
        requireBusiness(businessId);
        if (year != null && month != null) {
            YearMonth ym = YearMonth.of(year, month);
            return overtimeRepository.findByBusiness_IdAndOvertimeDateBetweenOrderByOvertimeDateDesc(
                    businessId, ym.atDay(1), ym.atEndOfMonth());
        }
        return overtimeRepository.findByBusiness_IdOrderByOvertimeDateDescCreatedAtDesc(businessId);
    }

    @Transactional
    public EmployeeOvertime saveOvertime(Long businessId, Long employeeId, EmployeeOvertime dto) {
        Business biz = requireBusiness(businessId);
        BusinessEmployee emp = requireEmployee(businessId, employeeId);
        dto.setBusiness(biz);
        dto.setEmployee(emp);
        dto.setId(null);
        EmployeeOvertime saved = overtimeRepository.save(dto);
        // Marcar el día como EX en la planilla
        saveWorkDay(businessId, employeeId, saved.getOvertimeDate(), "EX", "Hora extra registrada");
        return saved;
    }

    @Transactional
    public void deleteOvertime(Long businessId, Long id) {
        EmployeeOvertime ot = overtimeRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Registro no encontrado: " + id));
        if (!ot.getBusiness().getId().equals(businessId)) {
            throw new SecurityException("Acceso denegado");
        }
        overtimeRepository.delete(ot);
    }

    // ─────────────────── VACACIONES ───────────────────

    @Transactional(readOnly = true)
    public List<EmployeeVacation> getVacationsByBusiness(Long businessId, Integer year, Integer month) {
        requireBusiness(businessId);
        if (year != null && month != null) {
            YearMonth ym = YearMonth.of(year, month);
            return vacationRepository.findByBusiness_IdAndStartDateBetweenOrderByStartDateDesc(
                    businessId, ym.atDay(1), ym.atEndOfMonth());
        }
        return vacationRepository.findByBusiness_IdOrderByStartDateDesc(businessId);
    }

    @Transactional
    public EmployeeVacation saveVacation(Long businessId, Long employeeId, EmployeeVacation dto) {
        Business biz = requireBusiness(businessId);
        BusinessEmployee emp = requireEmployee(businessId, employeeId);
        dto.setBusiness(biz);
        dto.setEmployee(emp);
        dto.setId(null);
        EmployeeVacation saved = vacationRepository.save(dto);
        // Marcar cada día del rango como V en la planilla
        LocalDate d = saved.getStartDate();
        while (!d.isAfter(saved.getEndDate())) {
            saveWorkDay(businessId, employeeId, d, "V", "Vacaciones");
            d = d.plusDays(1);
        }
        return saved;
    }

    @Transactional
    public void deleteVacation(Long businessId, Long id) {
        EmployeeVacation v = vacationRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Registro no encontrado: " + id));
        if (!v.getBusiness().getId().equals(businessId)) {
            throw new SecurityException("Acceso denegado");
        }
        vacationRepository.delete(v);
    }

    // ─────────────────── PERMISOS ───────────────────

    @Transactional(readOnly = true)
    public List<EmployeePermission> getPermissionsByBusiness(Long businessId, Integer year, Integer month) {
        requireBusiness(businessId);
        if (year != null && month != null) {
            YearMonth ym = YearMonth.of(year, month);
            return permissionRepository.findByBusiness_IdAndPermissionDateBetweenOrderByPermissionDateDesc(
                    businessId, ym.atDay(1), ym.atEndOfMonth());
        }
        return permissionRepository.findByBusiness_IdOrderByPermissionDateDesc(businessId);
    }

    @Transactional
    public EmployeePermission savePermission(Long businessId, Long employeeId, EmployeePermission dto) {
        Business biz = requireBusiness(businessId);
        BusinessEmployee emp = requireEmployee(businessId, employeeId);
        dto.setBusiness(biz);
        dto.setEmployee(emp);
        dto.setId(null);
        EmployeePermission saved = permissionRepository.save(dto);
        // Marcar el día como P en la planilla
        saveWorkDay(businessId, employeeId, saved.getPermissionDate(), "P",
                "Permiso: " + saved.getPermissionType());
        return saved;
    }

    @Transactional
    public void deletePermission(Long businessId, Long id) {
        EmployeePermission p = permissionRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Registro no encontrado: " + id));
        if (!p.getBusiness().getId().equals(businessId)) {
            throw new SecurityException("Acceso denegado");
        }
        permissionRepository.delete(p);
    }

    // ─────────────────── INCIDENTES ───────────────────

    @Transactional(readOnly = true)
    public List<EmployeeIncident> getIncidentsByBusiness(Long businessId, Integer year, Integer month) {
        requireBusiness(businessId);
        if (year != null && month != null) {
            YearMonth ym = YearMonth.of(year, month);
            return incidentRepository.findByBusiness_IdAndIncidentDateBetweenOrderByIncidentDateDesc(
                    businessId, ym.atDay(1), ym.atEndOfMonth());
        }
        return incidentRepository.findByBusiness_IdOrderByIncidentDateDesc(businessId);
    }

    @Transactional
    public EmployeeIncident saveIncident(Long businessId, Long employeeId, EmployeeIncident dto) {
        Business biz = requireBusiness(businessId);
        BusinessEmployee emp = requireEmployee(businessId, employeeId);
        dto.setBusiness(biz);
        dto.setEmployee(emp);
        dto.setId(null);
        return incidentRepository.save(dto);
    }

    @Transactional
    public void deleteIncident(Long businessId, Long id) {
        EmployeeIncident inc = incidentRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Registro no encontrado: " + id));
        if (!inc.getBusiness().getId().equals(businessId)) {
            throw new SecurityException("Acceso denegado");
        }
        incidentRepository.delete(inc);
    }

    // ─────────────────── KPIs RESUMEN ───────────────────

    @Transactional(readOnly = true)
    public Map<String, Object> getMonthlyKpis(Long businessId, int year, int month) {
        requireBusiness(businessId);
        YearMonth ym = YearMonth.of(year, month);
        LocalDate from = ym.atDay(1);
        LocalDate to   = ym.atEndOfMonth();

        List<EmployeeWorkDay> days = workDayRepository
                .findByBusiness_IdAndWorkDateBetweenOrderByEmployeeIdAscWorkDateAsc(businessId, from, to);

        Map<String, Long> counts = days.stream()
                .collect(Collectors.groupingBy(EmployeeWorkDay::getDayType, Collectors.counting()));

        long overtimeCount = overtimeRepository
                .findByBusiness_IdAndOvertimeDateBetweenOrderByOvertimeDateDesc(businessId, from, to).size();
        long vacationCount = vacationRepository
                .findByBusiness_IdAndStartDateBetweenOrderByStartDateDesc(businessId, from, to).size();
        long permissionCount = permissionRepository
                .findByBusiness_IdAndPermissionDateBetweenOrderByPermissionDateDesc(businessId, from, to).size();
        long incidentCount = incidentRepository
                .findByBusiness_IdAndIncidentDateBetweenOrderByIncidentDateDesc(businessId, from, to).size();

        Map<String, Object> kpis = new LinkedHashMap<>();
        kpis.put("T",  counts.getOrDefault("T",  0L));
        kpis.put("D",  counts.getOrDefault("D",  0L));
        kpis.put("EX", counts.getOrDefault("EX", 0L));
        kpis.put("V",  counts.getOrDefault("V",  0L));
        kpis.put("P",  counts.getOrDefault("P",  0L));
        kpis.put("E",  counts.getOrDefault("E",  0L));
        kpis.put("overtimeRecords",   overtimeCount);
        kpis.put("vacationRecords",   vacationCount);
        kpis.put("permissionRecords", permissionCount);
        kpis.put("incidentRecords",   incidentCount);
        kpis.put("year",  year);
        kpis.put("month", month);
        return kpis;
    }

    // ─────────────────── HISTÓRICO DE JORNADAS ───────────────────

    @Transactional(readOnly = true)
    public List<EmployeeWorkScheduleHistory> getScheduleHistory(Long businessId, Long employeeId) {
        requireBusiness(businessId);
        requireEmployee(businessId, employeeId);
        return scheduleHistoryRepository.findByBusiness_IdAndEmployee_IdOrderByStartDateDesc(businessId, employeeId);
    }

    @Transactional
    public EmployeeWorkScheduleHistory addScheduleHistory(Long businessId, Long employeeId,
                                                           Long workScheduleId,
                                                           LocalDate startDate,
                                                           LocalDate endDate,
                                                           LocalDate cycleStartDate,
                                                           String notes) {
        Business biz = requireBusiness(businessId);
        BusinessEmployee emp = requireEmployee(businessId, employeeId);
        WorkSchedule ws = workScheduleRepository.findById(workScheduleId)
                .orElseThrow(() -> new NoSuchElementException("Jornada no encontrada: " + workScheduleId));

        // Validar solapamiento
        LocalDate effectiveEnd = endDate != null ? endDate : LocalDate.of(9999, 12, 31);
        List<EmployeeWorkScheduleHistory> overlaps = scheduleHistoryRepository
                .findOverlappingNew(employeeId, startDate, effectiveEnd);
        if (!overlaps.isEmpty()) {
            // Auto-cerrar el periodo vigente si su endDate es null
            overlaps.stream()
                .filter(h -> h.getEndDate() == null)
                .forEach(h -> {
                    h.setEndDate(startDate.minusDays(1));
                    scheduleHistoryRepository.save(h);
                });
            // Re-verificar si quedan solapamientos reales (no sólo el que fue cerrado)
            List<EmployeeWorkScheduleHistory> stillOverlapping = scheduleHistoryRepository
                    .findOverlappingNew(employeeId, startDate, effectiveEnd);
            if (!stillOverlapping.isEmpty()) {
                throw new IllegalArgumentException(
                    "Ya existe una jornada registrada para ese rango de fechas.");
            }
        }

        EmployeeWorkScheduleHistory hist = new EmployeeWorkScheduleHistory();
        hist.setBusiness(biz);
        hist.setEmployee(emp);
        hist.setWorkSchedule(ws);
        hist.setStartDate(startDate);
        hist.setEndDate(endDate);
        hist.setCycleStartDate(cycleStartDate != null ? cycleStartDate : startDate);
        hist.setNotes(notes);

        // Actualizar también el campo directo del empleado para compatibilidad
        emp.setWorkSchedule(ws);
        emp.setWorkScheduleStartDate(startDate);
        employeeRepository.save(emp);

        return scheduleHistoryRepository.save(hist);
    }

    @Transactional
    public EmployeeWorkScheduleHistory updateScheduleHistory(Long businessId, Long historyId,
                                                              LocalDate endDate,
                                                              LocalDate cycleStartDate,
                                                              String notes) {
        EmployeeWorkScheduleHistory hist = scheduleHistoryRepository.findById(historyId)
                .orElseThrow(() -> new NoSuchElementException("Historial no encontrado: " + historyId));
        if (!hist.getBusiness().getId().equals(businessId)) throw new SecurityException("Acceso denegado");
        if (endDate != null) hist.setEndDate(endDate);
        if (cycleStartDate != null) hist.setCycleStartDate(cycleStartDate);
        if (notes != null) hist.setNotes(notes);
        return scheduleHistoryRepository.save(hist);
    }

    @Transactional
    public void deleteScheduleHistory(Long businessId, Long historyId) {
        EmployeeWorkScheduleHistory hist = scheduleHistoryRepository.findById(historyId)
                .orElseThrow(() -> new NoSuchElementException("Historial no encontrado: " + historyId));
        if (!hist.getBusiness().getId().equals(businessId)) throw new SecurityException("Acceso denegado");
        scheduleHistoryRepository.delete(hist);
    }

    // ─────────────────── CIERRE MENSUAL ───────────────────

    @Transactional(readOnly = true)
    public List<MonthlySheetClosure> getClosures(Long businessId) {
        requireBusiness(businessId);
        return closureRepository.findByBusiness_IdOrderByYearDescMonthDesc(businessId);
    }

    @Transactional(readOnly = true)
    public Optional<MonthlySheetClosure> getClosure(Long businessId, int year, int month) {
        requireBusiness(businessId);
        return closureRepository.findByBusiness_IdAndYearAndMonth(businessId, year, month);
    }

    @Transactional
    public MonthlySheetClosure closureMonth(Long businessId, int year, int month, String closedBy, String notes) {
        Business biz = requireBusiness(businessId);
        MonthlySheetClosure closure = closureRepository
                .findByBusiness_IdAndYearAndMonth(businessId, year, month)
                .orElseGet(() -> {
                    MonthlySheetClosure c = new MonthlySheetClosure();
                    c.setBusiness(biz);
                    c.setYear(year);
                    c.setMonth(month);
                    return c;
                });
        if ("APPROVED".equals(closure.getStatus())) {
            throw new IllegalStateException("Este mes ya fue aprobado y no puede reabrirse.");
        }
        closure.setStatus("CLOSED");
        closure.setClosedAt(java.time.LocalDateTime.now());
        closure.setClosedBy(closedBy);
        if (notes != null) closure.setNotes(notes);
        return closureRepository.save(closure);
    }

    @Transactional
    public MonthlySheetClosure approveMonth(Long businessId, int year, int month,
                                             String approvedBy, String signedPdfPath) {
        MonthlySheetClosure closure = closureRepository
                .findByBusiness_IdAndYearAndMonth(businessId, year, month)
                .orElseThrow(() -> new NoSuchElementException("Cierre no encontrado para " + year + "/" + month));
        if (!"CLOSED".equals(closure.getStatus())) {
            throw new IllegalStateException("El mes debe estar CERRADO antes de aprobarse.");
        }
        closure.setStatus("APPROVED");
        closure.setApprovedAt(java.time.LocalDateTime.now());
        closure.setApprovedBy(approvedBy);
        if (signedPdfPath != null) closure.setSignedPdfPath(signedPdfPath);
        return closureRepository.save(closure);
    }

    @Transactional
    public MonthlySheetClosure reopenMonth(Long businessId, int year, int month) {
        MonthlySheetClosure closure = closureRepository
                .findByBusiness_IdAndYearAndMonth(businessId, year, month)
                .orElseThrow(() -> new NoSuchElementException("Cierre no encontrado para " + year + "/" + month));
        if ("APPROVED".equals(closure.getStatus())) {
            throw new IllegalStateException("Un mes aprobado no puede reabrirse.");
        }
        closure.setStatus("OPEN");
        closure.setClosedAt(null);
        return closureRepository.save(closure);
    }
}
