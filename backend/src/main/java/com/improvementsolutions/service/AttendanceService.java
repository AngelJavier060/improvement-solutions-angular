package com.improvementsolutions.service;

import com.improvementsolutions.model.*;
import com.improvementsolutions.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.DayOfWeek;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;
import java.text.Normalizer;

@Service
@RequiredArgsConstructor
@Slf4j
public class AttendanceService {

    private static final DateTimeFormatter ES_DATE_FMT =
            DateTimeFormatter.ofPattern("dd/MM/yyyy").withLocale(java.util.Locale.forLanguageTag("es"));

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
    private final HolidayRepository holidayRepository;
    private final BusinessIncidentRepository businessIncidentRepository;

    // ─────────────────── helpers ───────────────────

    private Business requireBusiness(Long businessId) {
        return businessRepository.findById(businessId)
                .orElseThrow(() -> new NoSuchElementException("Empresa no encontrada: " + businessId));
    }

    public BusinessEmployee requireEmployee(Long businessId, Long employeeId) {
        BusinessEmployee emp = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new NoSuchElementException("Empleado no encontrado: " + employeeId));
        if (!emp.getBusiness().getId().equals(businessId)) {
            throw new SecurityException("El empleado no pertenece a la empresa indicada");
        }
        return emp;
    }

    private static String formatScheduleHistoryOverlap(EmployeeWorkScheduleHistory h) {
        String name = h.getWorkSchedule() != null ? h.getWorkSchedule().getName() : "—";
        String end = h.getEndDate() != null ? h.getEndDate().format(ES_DATE_FMT) : "actualidad";
        return String.format("%s (%s → %s)",
                name,
                h.getStartDate().format(ES_DATE_FMT),
                end);
    }

    /** Lanza excepción si el mes correspondiente a 'date' no está en estado OPEN. */
    private void assertMonthOpenOrThrow(Long businessId, LocalDate date) {
        if (date == null) return;
        Optional<MonthlySheetClosure> opt = closureRepository
                .findByBusiness_IdAndYearAndMonth(businessId, date.getYear(), date.getMonthValue());
        if (opt.isPresent()) {
            String st = opt.get().getStatus();
            if (!"OPEN".equals(st)) {
                throw new IllegalStateException("El mes " + date.getYear() + "/" + date.getMonthValue() +
                        " está " + st + " y no admite modificaciones.");
            }
        }
    }

    // ─────────────────── DATE CONFLICT LOOKUPS (for controller) ───────────────────

    @Transactional(readOnly = true)
    public List<EmployeePermission> findPermissionConflicts(Long employeeId, LocalDate date) {
        return permissionRepository.findOverlapping(employeeId, date, date);
    }

    @Transactional(readOnly = true)
    public List<EmployeeVacation> findVacationConflicts(Long employeeId, LocalDate date) {
        return vacationRepository.findOverlapping(employeeId, date, date);
    }

    @Transactional(readOnly = true)
    public List<EmployeeOvertime> findOvertimeConflicts(Long employeeId, LocalDate date) {
        return overtimeRepository.findOverlapping(employeeId, date, date);
    }

    // ─────────────────── OVERLAP VALIDATION ───────────────────

    /**
     * Verifica que el rango [from, to] no se solape con ningún permiso, vacación
     * u hora extra ya registrados para el empleado (excluyendo RECHAZADOS).
     * Lanza IllegalStateException con mensaje descriptivo si hay solapamiento.
     *
     * @param employeeId   ID del BusinessEmployee
     * @param from         primera fecha del rango a validar (inclusive)
     * @param to           última fecha del rango a validar (inclusive)
     * @param excludeType  tipo a omitir en la validación ("PERMISO", "VACACION", "HORAS_EXTRA", o null = validar los 3)
     */
    private void checkDateOverlap(Long employeeId, LocalDate from, LocalDate to, String excludeType) {
        if (!"PERMISO".equals(excludeType)) {
            List<EmployeePermission> perms = permissionRepository.findOverlapping(employeeId, from, to);
            if (!perms.isEmpty()) {
                EmployeePermission first = perms.get(0);
                throw new IllegalStateException(
                    "Ya existe un PERMISO registrado para ese empleado en la fecha " +
                    first.getPermissionDate() + " (tipo: " + first.getPermissionType() +
                    ", estado: " + first.getStatus() + "). No se puede superponer otro registro.");
            }
        }
        if (!"VACACION".equals(excludeType)) {
            List<EmployeeVacation> vacs = vacationRepository.findOverlapping(employeeId, from, to);
            if (!vacs.isEmpty()) {
                EmployeeVacation first = vacs.get(0);
                throw new IllegalStateException(
                    "Ya existen VACACIONES registradas para ese empleado en el rango " +
                    first.getStartDate() + " - " + first.getEndDate() +
                    " (estado: " + first.getStatus() + "). No se puede superponer otro registro.");
            }
        }
        if (!"HORAS_EXTRA".equals(excludeType)) {
            List<EmployeeOvertime> ots = overtimeRepository.findOverlapping(employeeId, from, to);
            if (!ots.isEmpty()) {
                EmployeeOvertime first = ots.get(0);
                throw new IllegalStateException(
                    "Ya existen HORAS EXTRAS registradas para ese empleado el día " +
                    first.getOvertimeDate() + ". No se puede superponer otro registro.");
            }
        }
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

    private Optional<Set<DayOfWeek>> parseWeeklyPatternFromName(String name) {
        if (name == null) return Optional.empty();
        String s = Normalizer.normalize(name, Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "")
                .toLowerCase(Locale.ROOT);

        // Map de tokens a DayOfWeek (ES + EN, abreviados)
        Map<String, DayOfWeek> map = new HashMap<>();
        map.put("lu", DayOfWeek.MONDAY);   map.put("lun", DayOfWeek.MONDAY);  map.put("lunes", DayOfWeek.MONDAY);  map.put("mon", DayOfWeek.MONDAY);
        map.put("ma", DayOfWeek.TUESDAY);  map.put("mar", DayOfWeek.TUESDAY); map.put("martes", DayOfWeek.TUESDAY); map.put("tue", DayOfWeek.TUESDAY);
        map.put("mi", DayOfWeek.WEDNESDAY);map.put("mie", DayOfWeek.WEDNESDAY); map.put("miercoles", DayOfWeek.WEDNESDAY); map.put("wed", DayOfWeek.WEDNESDAY);
        map.put("ju", DayOfWeek.THURSDAY); map.put("jue", DayOfWeek.THURSDAY); map.put("jueves", DayOfWeek.THURSDAY); map.put("thu", DayOfWeek.THURSDAY);
        map.put("vi", DayOfWeek.FRIDAY);  map.put("vie", DayOfWeek.FRIDAY);  map.put("viernes", DayOfWeek.FRIDAY); map.put("fri", DayOfWeek.FRIDAY);
        map.put("sa", DayOfWeek.SATURDAY);map.put("sab", DayOfWeek.SATURDAY); map.put("sabado", DayOfWeek.SATURDAY); map.put("sat", DayOfWeek.SATURDAY);
        map.put("do", DayOfWeek.SUNDAY);  map.put("dom", DayOfWeek.SUNDAY);  map.put("domingo", DayOfWeek.SUNDAY); map.put("sun", DayOfWeek.SUNDAY);

        // 1) '5x2' se interpreta comúnmente como Lun-Vie
        if (s.contains("5x2")) {
            return Optional.of(EnumSet.of(DayOfWeek.MONDAY, DayOfWeek.TUESDAY, DayOfWeek.WEDNESDAY,
                    DayOfWeek.THURSDAY, DayOfWeek.FRIDAY));
        }

        // 2) Intentar detectar rango tipo "lu-vi", "mar-sab", "mon-fri", "ma a sa"
        java.util.regex.Pattern tokenPat = java.util.regex.Pattern.compile(
                "(lu(?:n|nes)?|ma(?:r|rtes)?|mi(?:e|ercoles)?|ju(?:e|eves)?|vi(?:e|ernes)?|sa(?:b|bado)?|do(?:m|mingo)?|mon|tue|wed|thu|fri|sat|sun)"
        );
        java.util.regex.Matcher m = java.util.regex.Pattern
                .compile("(lu(?:n|nes)?|ma(?:r|rtes)?|mi(?:e|ercoles)?|ju(?:e|eves)?|vi(?:e|ernes)?|sa(?:b|bado)?|do(?:m|mingo)?|mon|tue|wed|thu|fri|sat|sun)\\s*[-/ ato]+\\s*(lu(?:n|nes)?|ma(?:r|rtes)?|mi(?:e|ercoles)?|ju(?:e|eves)?|vi(?:e|ernes)?|sa(?:b|bado)?|do(?:m|mingo)?|mon|tue|wed|thu|fri|sat|sun)")
                .matcher(s);
        if (m.find()) {
            DayOfWeek start = tokenToDay(map, m.group(1));
            DayOfWeek end   = tokenToDay(map, m.group(2));
            if (start != null && end != null) {
                return Optional.of(daysRange(start, end));
            }
        }

        // 3) Lista de tokens sueltos (lu,ma,mi,ju,vi)
        java.util.Set<DayOfWeek> set = EnumSet.noneOf(DayOfWeek.class);
        java.util.regex.Matcher m2 = tokenPat.matcher(s);
        while (m2.find()) {
            DayOfWeek d = tokenToDay(map, m2.group(1));
            if (d != null) set.add(d);
        }
        if (!set.isEmpty()) return Optional.of(set);

        return Optional.empty();
    }

    private DayOfWeek tokenToDay(Map<String, DayOfWeek> map, String token) {
        if (token == null) return null;
        String t = token.toLowerCase(Locale.ROOT);
        // normalizar ya viene sin tildes
        if (map.containsKey(t)) return map.get(t);
        // probar prefijos de 2-3 letras
        for (String k : map.keySet()) {
            if (t.startsWith(k)) return map.get(k);
        }
        return null;
    }

    private EnumSet<DayOfWeek> daysRange(DayOfWeek start, DayOfWeek end) {
        EnumSet<DayOfWeek> out = EnumSet.noneOf(DayOfWeek.class);
        int s = start.getValue();
        int e = end.getValue();
        int i = s;
        while (true) {
            out.add(DayOfWeek.of(i));
            if (i == e) break;
            i = i % 7 + 1;
        }
        return out;
    }

    private String getAutoDayType(BusinessEmployee emp, LocalDate date) {
        if (emp == null || date == null) return null;
        // 1) Buscar en histórico de jornadas para esa fecha
        Optional<EmployeeWorkScheduleHistory> histOpt =
                scheduleHistoryRepository.findActiveForDate(emp.getId(), date);
        if (histOpt.isPresent()) {
            EmployeeWorkScheduleHistory hist = histOpt.get();
            String wsName = hist.getWorkSchedule() != null ? hist.getWorkSchedule().getName() : null;
            Optional<Set<DayOfWeek>> weekly = parseWeeklyPatternFromName(wsName);
            if (weekly.isPresent()) {
                return weekly.get().contains(date.getDayOfWeek()) ? "T" : "D";
            }
            Optional<SchedulePattern> p = parseSchedulePatternFromName(wsName);
            if (p.isEmpty()) return null;
            LocalDate cycleOrigin = hist.getCycleStartDate() != null ? hist.getCycleStartDate() : hist.getStartDate();
            long diff = ChronoUnit.DAYS.between(cycleOrigin, date);
            int len = p.get().cycleLength();
            if (len <= 0) return null;
            int idx = (int) Math.floorMod(diff, len);
            return idx < p.get().workDays ? "T" : "D";
        }
        // 2) Fallback al campo directo del empleado
        String empSchedName = emp.getWorkSchedule() != null ? emp.getWorkSchedule().getName() : null;
        Optional<Set<DayOfWeek>> weekly = parseWeeklyPatternFromName(empSchedName);
        if (weekly.isPresent()) {
            return weekly.get().contains(date.getDayOfWeek()) ? "T" : "D";
        }
        Optional<SchedulePattern> p = parseSchedulePattern(emp);
        LocalDate start = emp.getWorkScheduleStartDate();
        // Sin jornada configurada con inicio definido → día en blanco para registro manual
        if (p.isEmpty() || start == null) {
            return null;
        }
        if (date.isBefore(start)) return null;
        long diff = ChronoUnit.DAYS.between(start, date);
        int len = p.get().cycleLength();
        if (len <= 0) return null;
        int idx = (int) Math.floorMod(diff, len);
        return idx < p.get().workDays ? "T" : "D";
    }

    // Exponer cálculo para otros servicios (p. ej., validación de horas extra)
    @Transactional(readOnly = true)
    public String computeDayType(Long businessId, Long employeeId, LocalDate date) {
        requireBusiness(businessId);
        BusinessEmployee emp = requireEmployee(businessId, employeeId);
        return getAutoDayType(emp, date);
    }

    /**
     * Genera (o devuelve) la planilla mensual de una empresa.
     * Para cada empleado activo, devuelve un registro por día del mes.
     * - Si existe un registro guardado en BD para ese día, se usa ese valor.
     * - Si no hay registro guardado, se calcula automáticamente a partir de la jornada vigente del empleado
     *   (historial de jornadas, patrón semanal o ciclo NxM con fecha de inicio).
     * - Si el empleado no tiene jornada configurada, el día aparece vacío (null) para registro manual.
     */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getMonthlySheet(Long businessId, int year, int month) {
        // Compatibilidad: por defecto incluye auto-cálculo (comportamiento previo)
        return getMonthlySheet(businessId, year, month, true);
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getMonthlySheet(Long businessId, int year, int month, boolean includeAuto) {
        requireBusiness(businessId);

        YearMonth ym = YearMonth.of(year, month);
        LocalDate from = ym.atDay(1);
        LocalDate to   = ym.atEndOfMonth();

        // Cargar feriados nacionales y propios de la empresa en el rango
        Map<LocalDate, String> holidayMap = new HashMap<>();
        try {
            List<Holiday> nationals = holidayRepository.findNationalBetween(from, to);
            for (Holiday h : nationals) holidayMap.put(h.getDate(), h.getName());
        } catch (Exception ignore) {}
        try {
            List<Holiday> locals = holidayRepository.findByBusinessBetween(businessId, from, to);
            for (Holiday h : locals) holidayMap.put(h.getDate(), h.getName()); // override national with company-specific if collides
        } catch (Exception ignore) {}

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
            row.put("departmentId", emp.getDepartment() != null ? emp.getDepartment().getId() : null);
            row.put("departmentName", emp.getDepartment() != null ? emp.getDepartment().getName() : "Sin departamento");
            row.put("codigoEmpresa", emp.getCodigoEmpresa());
            // Jornada de trabajo (patrón T/D)
            row.put("workScheduleId", emp.getWorkSchedule() != null ? emp.getWorkSchedule().getId() : null);
            row.put("workScheduleName", emp.getWorkSchedule() != null ? emp.getWorkSchedule().getName() : null);
            row.put("workScheduleStartDate", emp.getWorkScheduleStartDate() != null ? emp.getWorkScheduleStartDate().toString() : null);
            // Horario de trabajo (turno) definido en la ficha del empleado
            row.put("workShiftId",   emp.getWorkShift() != null ? emp.getWorkShift().getId() : null);
            row.put("workShiftName", emp.getWorkShift() != null ? emp.getWorkShift().getName() : null);

            List<Map<String, Object>> days = new ArrayList<>();
            Map<String, Integer> totals = new LinkedHashMap<>();
            totals.put("T", 0); totals.put("D", 0); totals.put("EX", 0);
            totals.put("V", 0); totals.put("P", 0);  totals.put("E", 0);
            // Contadores solo de días con registro GUARDADO en BD (excluye días auto-generados del horario)
            int savedT = 0, savedEX = 0;

            for (int d = 1; d <= daysInMonth; d++) {
                LocalDate date = LocalDate.of(year, month, d);
                String key = emp.getId() + "_" + date;
                // Días anteriores al inicio de jornada: en blanco solo si NO hay registro explícito guardado
                LocalDate schedStart = emp.getWorkScheduleStartDate();
                boolean beforeStart = schedStart != null && date.isBefore(schedStart);
                boolean hasSaved = savedMap.containsKey(key);
                String savedType = hasSaved ? savedMap.get(key) : null;
                String notes = notesMap.get(key);
                boolean isOvertimeSaved = (savedType != null && "EX".equalsIgnoreCase(savedType))
                        || (notes != null && notes.trim().toUpperCase().startsWith("HE:"));
                // Si hay registro guardado, usarlo. Si no hay y includeAuto=true, calcular; si includeAuto=false, dejar null.
                String type;
                if (hasSaved) {
                    type = savedType;
                } else if (beforeStart && !isOvertimeSaved) {
                    type = null;
                } else if (includeAuto) {
                    type = getAutoDayType(emp, date);
                } else {
                    type = null;
                }

                Map<String, Object> dayInfo = new LinkedHashMap<>();
                dayInfo.put("day",  d);
                dayInfo.put("date", date.toString());
                dayInfo.put("dayType", type); // null = sin asignación (antes de startDate)
                dayInfo.put("saved", hasSaved); // true = registro real en BD, false = auto-generado
                if (notes != null) dayInfo.put("notes", notes);
                if (holidayMap.containsKey(date)) {
                    dayInfo.put("holiday", true);
                    dayInfo.put("holidayName", holidayMap.get(date));
                }

                days.add(dayInfo);
                if (type != null) totals.merge(type, 1, Integer::sum);
                // Acumular solo días guardados para HHTT preciso
                if (hasSaved && "T".equalsIgnoreCase(savedType))  savedT++;
                if (hasSaved && "EX".equalsIgnoreCase(savedType)) savedEX++;
            }

            row.put("days",    days);
            row.put("totals",  totals);
            row.put("savedT",  savedT);
            row.put("savedEX", savedEX);
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
        assertMonthOpenOrThrow(businessId, date);

        Optional<EmployeeWorkDay> existing = workDayRepository.findByEmployee_IdAndWorkDate(employeeId, date);
        if (existing.isPresent()) {
            EmployeeWorkDay cur = existing.get();
            String curNotes = cur.getNotes() != null ? cur.getNotes().trim() : null;
            if ("EX".equalsIgnoreCase(cur.getDayType()) && curNotes != null && curNotes.toUpperCase().startsWith("HE:")) {
                boolean incomingIsHeEx = "EX".equalsIgnoreCase(dayType) && (notes != null && notes.trim().toUpperCase().startsWith("HE:"));
                if (!incomingIsHeEx) {
                    throw new IllegalStateException("El día " + date + " está bloqueado por registro de horas extra y no puede modificarse manualmente.");
                }
            }
        }
        EmployeeWorkDay wd = existing.orElseGet(EmployeeWorkDay::new);
        wd.setBusiness(biz);
        wd.setEmployee(emp);
        wd.setWorkDate(date);
        wd.setDayType(dayType != null ? dayType : "D");
        wd.setNotes(notes);
        return workDayRepository.save(wd);
    }

    /**
     * Elimina el registro guardado de un día para que vuelva a calcularse
     * automáticamente desde la jornada vigente (o quede vacío si no hay jornada).
     */
    @Transactional
    public void deleteWorkDay(Long businessId, Long employeeId, LocalDate date) {
        requireBusiness(businessId);
        requireEmployee(businessId, employeeId);
        assertMonthOpenOrThrow(businessId, date);
        Optional<EmployeeWorkDay> existing = workDayRepository.findByEmployee_IdAndWorkDate(employeeId, date);
        if (existing.isPresent()) {
            EmployeeWorkDay wd = existing.get();
            String curNotes = wd.getNotes() != null ? wd.getNotes().trim() : null;
            if ("EX".equalsIgnoreCase(wd.getDayType()) && curNotes != null && curNotes.toUpperCase().startsWith("HE:")) {
                throw new IllegalStateException("El día " + date + " está bloqueado por registro de horas extra y no puede eliminarse manualmente.");
            }
            if ("V".equalsIgnoreCase(wd.getDayType())) {
                throw new IllegalStateException("Los días de vacaciones no pueden eliminarse directamente desde la planilla.");
            }
            if ("P".equalsIgnoreCase(wd.getDayType()) && curNotes != null && curNotes.toUpperCase().startsWith("PERM:")) {
                throw new IllegalStateException("Los días de permiso aprobado no pueden eliminarse directamente desde la planilla.");
            }
            workDayRepository.delete(wd);
        }
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
            assertMonthOpenOrThrow(businessId, date);
            String type = entry.getOrDefault("dayType", "D");
            String notes = entry.get("notes");
            Optional<EmployeeWorkDay> existing = workDayRepository.findByEmployee_IdAndWorkDate(employeeId, date);
            if (existing.isPresent()) {
                EmployeeWorkDay cur = existing.get();
                String curNotes = cur.getNotes() != null ? cur.getNotes().trim() : null;
                if ("EX".equalsIgnoreCase(cur.getDayType()) && curNotes != null && curNotes.toUpperCase().startsWith("HE:")) {
                    boolean incomingIsHeEx = "EX".equalsIgnoreCase(type) && (notes != null && notes.trim().toUpperCase().startsWith("HE:"));
                    if (!incomingIsHeEx) {
                        throw new IllegalStateException("El día " + date + " está bloqueado por registro de horas extra y no puede modificarse manualmente.");
                    }
                }
            }
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

    /**
     * Autocompleta la planilla del mes para todos los empleados activos:
     * guarda en BD únicamente los días T/D no guardados, calculados desde la jornada vigente.
     */
    @Transactional
    public Map<String, Object> autocompleteMonth(Long businessId, int year, int month) {
        Business biz = requireBusiness(businessId);
        java.time.YearMonth ym = java.time.YearMonth.of(year, month);
        LocalDate from = ym.atDay(1);
        LocalDate to   = ym.atEndOfMonth();

        // Bloquear si el mes no está OPEN
        Optional<MonthlySheetClosure> closure = closureRepository.findByBusiness_IdAndYearAndMonth(businessId, year, month);
        if (closure.isPresent() && !"OPEN".equals(closure.get().getStatus())) {
            throw new IllegalStateException("El mes " + year + "/" + month + " está " + closure.get().getStatus() + ", no se puede autocompletar.");
        }

        // Empleados activos
        List<BusinessEmployee> employees = employeeRepository.findWithRelationsByBusinessId(businessId)
                .stream()
                .filter(e -> Boolean.TRUE.equals(e.getActive()))
                .collect(Collectors.toList());

        // Registros ya guardados en el mes actual (para no sobrescribir)
        List<EmployeeWorkDay> currentSavedDays = workDayRepository
                .findByBusiness_IdAndWorkDateBetweenOrderByEmployeeIdAscWorkDateAsc(businessId, from, to);
        java.util.Set<String> savedKeys = new java.util.HashSet<>();
        for (EmployeeWorkDay wd : currentSavedDays) {
            savedKeys.add(wd.getEmployee().getId() + "_" + wd.getWorkDate());
        }

        // Construir patrón desde el mes anterior (solo T/D guardados)
        java.time.YearMonth prevYm = ym.minusMonths(1);
        LocalDate pFrom = prevYm.atDay(1);
        LocalDate pTo   = prevYm.atEndOfMonth();
        List<EmployeeWorkDay> prevSavedDays = workDayRepository
                .findByBusiness_IdAndWorkDateBetweenOrderByEmployeeIdAscWorkDateAsc(businessId, pFrom, pTo);
        Map<Long, String[]> prevSeqMap = new HashMap<>(); // employeeId -> array de T/D por día (longitud mes previo)
        for (BusinessEmployee emp : employees) {
            String[] seq = new String[prevYm.lengthOfMonth()];
            Arrays.fill(seq, null);
            prevSeqMap.put(emp.getId(), seq);
        }
        for (EmployeeWorkDay wd : prevSavedDays) {
            Long eid = wd.getEmployee() != null ? wd.getEmployee().getId() : null;
            if (eid == null) continue;
            String dt = wd.getDayType() != null ? wd.getDayType().trim().toUpperCase(Locale.ROOT) : null;
            if (!"T".equals(dt) && !"D".equals(dt)) continue; // ignorar EX/V/P/E/A
            String[] seq = prevSeqMap.get(eid);
            if (seq == null) continue;
            int dayIdx = wd.getWorkDate().getDayOfMonth() - 1;
            if (dayIdx >= 0 && dayIdx < seq.length) seq[dayIdx] = dt;
        }

        int savedCount = 0;
        int employeesAffected = 0;
        for (BusinessEmployee emp : employees) {
            boolean anySavedForEmp = false;
            String[] seq = prevSeqMap.get(emp.getId());

            // Si no hay patrón previo utilizable, se usará fallback por jornada vigente día a día
            boolean hasPrevPattern = false;
            if (seq != null) {
                for (String s : seq) { if (s != null) { hasPrevPattern = true; break; } }
            }

            int seqLen = (seq != null ? seq.length : 0);
            int startIdx = 0;
            if (hasPrevPattern) {
                // Continuar secuencia desde el día siguiente al último del mes anterior
                // Buscar el último índice no nulo hacia atrás
                int last = seqLen - 1;
                while (last >= 0 && seq[last] == null) last--;
                startIdx = (last >= 0) ? (last + 1) % seqLen : 0;
            }

            for (int d = 1; d <= ym.lengthOfMonth(); d++) {
                LocalDate date = LocalDate.of(year, month, d);
                String key = emp.getId() + "_" + date;
                if (savedKeys.contains(key)) continue; // ya guardado manualmente o por otro módulo

                String type = null;
                if (hasPrevPattern && seqLen > 0) {
                    String cand = seq[(startIdx + (d - 1)) % seqLen];
                    if ("T".equals(cand) || "D".equals(cand)) type = cand;
                }
                // Fallback: usar jornada vigente solo si no se pudo derivar desde el mes anterior
                if (type == null) {
                    String auto = getAutoDayType(emp, date);
                    if ("T".equalsIgnoreCase(auto) || "D".equalsIgnoreCase(auto)) type = auto.toUpperCase(Locale.ROOT);
                }
                if (type == null) continue; // no guardar si no hay definición

                EmployeeWorkDay wd = new EmployeeWorkDay();
                wd.setBusiness(biz);
                wd.setEmployee(emp);
                wd.setWorkDate(date);
                wd.setDayType(type);
                wd.setNotes(null);
                workDayRepository.save(wd);
                savedKeys.add(key);
                savedCount++;
                anySavedForEmp = true;
            }
            if (anySavedForEmp) employeesAffected++;
        }

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("saved", savedCount);
        out.put("employees", employeesAffected);
        out.put("year", year);
        out.put("month", month);
        return out;
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
        // Validar solapamiento con permisos y vacaciones en la misma fecha
        if (dto.getOvertimeDate() != null) {
            checkDateOverlap(emp.getId(), dto.getOvertimeDate(), dto.getOvertimeDate(), "HORAS_EXTRA");
        }
        dto.setBusiness(biz);
        dto.setEmployee(emp);
        dto.setId(null);
        EmployeeOvertime saved = overtimeRepository.save(dto);
        // Marcar el día como EX en la planilla
        saveWorkDay(businessId, employeeId, saved.getOvertimeDate(), "EX", "HE: Hora extra registrada");
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
        // Validar solapamiento con permisos y horas extra en el rango
        // endDate = día de reincorporación, no cuenta como vacación
        if (dto.getStartDate() != null && dto.getEndDate() != null) {
            LocalDate lastVacDay = dto.getEndDate().minusDays(1);
            if (!lastVacDay.isBefore(dto.getStartDate())) {
                checkDateOverlap(emp.getId(), dto.getStartDate(), lastVacDay, "VACACION");
            }
        }
        dto.setBusiness(biz);
        dto.setEmployee(emp);
        dto.setId(null);
        EmployeeVacation saved = vacationRepository.save(dto);
        // Marcar cada día del rango como V en la planilla (excluyendo endDate = día de reincorporación)
        LocalDate d = saved.getStartDate();
        while (d.isBefore(saved.getEndDate())) {
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

    @Transactional
    public EmployeeVacation setVacationSignedPdf(Long businessId, Long vacationId, String relativePath) {
        EmployeeVacation v = vacationRepository.findById(vacationId)
                .orElseThrow(() -> new NoSuchElementException("Registro no encontrado: " + vacationId));
        if (!v.getBusiness().getId().equals(businessId)) {
            throw new SecurityException("Acceso denegado");
        }
        v.setSignedPdfPath(relativePath);
        return vacationRepository.save(v);
    }

    @Transactional
    public EmployeeVacation updateVacationStatus(Long businessId, Long vacationId, String status) {
        EmployeeVacation v = vacationRepository.findById(vacationId)
                .orElseThrow(() -> new NoSuchElementException("Registro no encontrado: " + vacationId));
        if (!v.getBusiness().getId().equals(businessId)) {
            throw new SecurityException("Acceso denegado");
        }
        String up = status != null ? status.trim().toUpperCase(Locale.ROOT) : null;
        if (up == null || up.isBlank()) return v;
        // Aceptar sólo estados válidos
        if (!up.equals("EN_CURSO") && !up.equals("PENDIENTE") && !up.equals("APROBADO") && !up.equals("RECHAZADO")) {
            throw new IllegalArgumentException("Estado inválido: " + status);
        }
        v.setStatus(up);
        return vacationRepository.save(v);
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
        // Validar solapamiento con vacaciones y horas extra en la misma fecha
        if (dto.getPermissionDate() != null) {
            checkDateOverlap(emp.getId(), dto.getPermissionDate(), dto.getPermissionDate(), "PERMISO");
        }
        dto.setBusiness(biz);
        dto.setEmployee(emp);
        dto.setId(null);
        EmployeePermission saved = permissionRepository.save(dto);
        // Marcar planilla sólo si ya está aprobado (misma lógica que al aprobar por estado)
        if ("APROBADO".equalsIgnoreCase(saved.getStatus())) {
            syncApprovedPermissionToWorkSheet(businessId, saved);
        }
        return saved;
    }

    /**
     * Marca en la planilla los días P vinculados al permiso (nota PERM:{id}), según horas solicitadas / 8.
     * Usa {@link LocalDate} del permiso sin conversiones de huso horario.
     */
    private void syncApprovedPermissionToWorkSheet(Long businessId, EmployeePermission p) {
        if (p == null || p.getId() == null || p.getPermissionDate() == null) {
            return;
        }
        BusinessEmployee emp = p.getEmployee();
        if (emp == null) {
            return;
        }
        Long employeeId = emp.getId();
        LocalDate start = p.getPermissionDate();
        double hours = 8.0;
        if (p.getHoursRequested() != null) {
            hours = p.getHoursRequested().doubleValue();
        }
        if (hours <= 0) {
            hours = 8.0;
        }
        int daySpan = Math.max(1, (int) Math.round(hours / 8.0));
        String notes = "PERM:" + p.getId();
        for (int i = 0; i < daySpan; i++) {
            LocalDate d = start.plusDays(i);
            saveWorkDay(businessId, employeeId, d, "P", notes);
        }
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

    // ======== PERMISOS: helpers extra ========

    @Transactional(readOnly = true)
    public EmployeePermission getPermissionById(Long businessId, Long id) {
        EmployeePermission p = permissionRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Registro no encontrado: " + id));
        if (!p.getBusiness().getId().equals(businessId)) {
            throw new SecurityException("Acceso denegado");
        }
        return p;
    }

    @Transactional
    public EmployeePermission updatePermission(Long businessId, Long id, EmployeePermission body) {
        EmployeePermission cur = permissionRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Registro no encontrado: " + id));
        if (!cur.getBusiness().getId().equals(businessId)) {
            throw new SecurityException("Acceso denegado");
        }
        String prevStatus = cur.getStatus();
        // Actualizar campos editables
        if (body.getPermissionDate() != null) cur.setPermissionDate(body.getPermissionDate());
        if (body.getPermissionType() != null) cur.setPermissionType(body.getPermissionType());
        if (body.getHoursRequested() != null) cur.setHoursRequested(body.getHoursRequested());
        if (body.getReason() != null) cur.setReason(body.getReason());
        cur.setNotes(body.getNotes());
        if (body.getStatus() != null && !body.getStatus().isBlank()) cur.setStatus(body.getStatus());
        EmployeePermission saved = permissionRepository.save(cur);
        if (!"APROBADO".equalsIgnoreCase(prevStatus) && "APROBADO".equalsIgnoreCase(saved.getStatus())) {
            syncApprovedPermissionToWorkSheet(businessId, saved);
        }
        return saved;
    }

    @Transactional
    public EmployeePermission updatePermissionStatus(Long businessId, Long id, String status) {
        EmployeePermission cur = permissionRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Registro no encontrado: " + id));
        if (!cur.getBusiness().getId().equals(businessId)) {
            throw new SecurityException("Acceso denegado");
        }
        String up = status != null ? status.trim().toUpperCase(Locale.ROOT) : null;
        if (up == null || up.isBlank()) return cur;
        if (!up.equals("EN_EJECUCION") && !up.equals("PENDIENTE") && !up.equals("APROBADO") && !up.equals("RECHAZADO")) {
            throw new IllegalArgumentException("Estado inválido: " + status);
        }
        cur.setStatus(up);
        EmployeePermission saved = permissionRepository.save(cur);
        if ("APROBADO".equals(up)) {
            syncApprovedPermissionToWorkSheet(businessId, saved);
        }
        return saved;
    }

    @Transactional
    public EmployeePermission setPermissionSignedPdf(Long businessId, Long id, String relativePath) {
        EmployeePermission cur = permissionRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Registro no encontrado: " + id));
        if (!cur.getBusiness().getId().equals(businessId)) {
            throw new SecurityException("Acceso denegado");
        }
        cur.setSignedPdfPath(relativePath);
        return permissionRepository.save(cur);
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

    /**
     * Consolidado anual de horas hombre para dashboard HSSE (Indicadores reactivos).
     * Usa la misma lógica que {@link #getMonthlySheet}: días T/EX por empleado y mes,
     * más horas de la tabla {@code employee_overtime} (inicio–fin).
     * <p>
     * Metodología: horas ordinarias = días tipo T × {@code standardHoursPerDay};
     * horas extras = días tipo EX × {@code standardHoursPerDay} + suma de horas en registros de horas extra.
     * Si un mismo hecho se marca como EX y además hay registro en horas extra, puede haber solapamiento
     * (revisar proceso operativo).
     */
    /** Devuelve los registros crudos que el consolidado contabiliza — solo para diagnóstico. */
    @Transactional(readOnly = true)
    public Map<String, Object> debugConsolidadoRecords(Long businessId, int year) {
        requireBusiness(businessId);
        LocalDate yStart = LocalDate.of(year, 1, 1);
        LocalDate yEnd   = LocalDate.of(year, 12, 31);

        List<EmployeeWorkDay> savedDays = workDayRepository
                .findWithEmployeeByBusinessIdAndDateBetween(businessId, yStart, yEnd);

        List<Map<String, Object>> workDayRows = new ArrayList<>();
        double totalOrdH = 0, totalExH = 0;
        for (EmployeeWorkDay wd : savedDays) {
            String dt = wd.getDayType();
            String shiftName = wd.getEmployee().getWorkShift() != null ? wd.getEmployee().getWorkShift().getName() : null;
            double daily = shiftName != null ? inferDailyHoursFromShiftName(shiftName) : 8.0;
            Map<String, Object> r = new java.util.LinkedHashMap<>();
            r.put("date",      wd.getWorkDate().toString());
            r.put("dayType",   dt);
            r.put("employee",  wd.getEmployee().getFullName());
            r.put("shift",     shiftName);
            r.put("dailyHours", daily);
            workDayRows.add(r);
            if ("T".equalsIgnoreCase(dt))  totalOrdH += daily;
            if ("EX".equalsIgnoreCase(dt)) totalExH  += daily;
        }

        List<EmployeeOvertime> ot = overtimeRepository.findByBusinessAndDateRangeWithEmployee(businessId, yStart, yEnd);
        List<Map<String, Object>> otRows = new ArrayList<>();
        double totalOtH = 0;
        for (EmployeeOvertime o : ot) {
            Map<String, Object> r = new java.util.LinkedHashMap<>();
            r.put("date",     o.getOvertimeDate().toString());
            r.put("employee", o.getEmployee() != null ? o.getEmployee().getFullName() : "?");
            r.put("hours",    o.getHoursTotal());
            otRows.add(r);
            totalOtH += o.getHoursTotal();
        }

        Map<String, Object> out = new java.util.LinkedHashMap<>();
        out.put("year", year);
        out.put("savedWorkDays_T_and_EX_count", workDayRows.size());
        out.put("ordinaryHoursFromTDays",  Math.round(totalOrdH));
        out.put("extraHoursFromEXDays",    Math.round(totalExH));
        out.put("overtimeRecordsCount",    otRows.size());
        out.put("overtimeHoursTotal",      Math.round(totalOtH));
        out.put("calculatedTotalHhtt",     Math.round(totalOrdH + totalExH + totalOtH));
        out.put("workDays",  workDayRows);
        out.put("overtime",  otRows);
        return out;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getConsolidadoHhttSummary(Long businessId, int year, double standardHoursPerDay) {
        requireBusiness(businessId);
        double fallbackHours = (standardHoursPerDay > 0 && standardHoursPerDay <= 24) ? standardHoursPerDay : 8.0;

        LocalDate yStart = LocalDate.of(year, 1, 1);
        LocalDate yEnd   = LocalDate.of(year, 12, 31);
        LocalDate pStart = LocalDate.of(year - 1, 1, 1);
        LocalDate pEnd   = LocalDate.of(year - 1, 12, 31);

        // ── 1. Horas extra registradas ──────────────────────────────────────────
        List<EmployeeOvertime> overtimeYear = overtimeRepository.findByBusinessAndDateRangeWithEmployee(
                businessId, yStart, yEnd);
        Map<Integer, Double>                 otHoursByMonth          = new HashMap<>();
        Map<String, Double>                  otHoursByDeptYear       = new HashMap<>();
        Map<Integer, Map<String, Double>>    otHoursByMonthDeptCargo = new HashMap<>();
        for (EmployeeOvertime o : overtimeYear) {
            int    m       = o.getOvertimeDate().getMonthValue();
            String otDept  = departmentName(o.getEmployee());
            String otPos   = (o.getEmployee() != null && o.getEmployee().getPosition() != null
                    && !o.getEmployee().getPosition().isBlank())
                    ? o.getEmployee().getPosition() : "Sin cargo";
            String otDC    = otDept + "|" + otPos;
            otHoursByMonth.merge(m, o.getHoursTotal(), Double::sum);
            otHoursByDeptYear.merge(otDept, o.getHoursTotal(), Double::sum);
            otHoursByMonthDeptCargo.computeIfAbsent(m, k -> new HashMap<>())
                    .merge(otDC, o.getHoursTotal(), Double::sum);
        }

        // ── 2. Días T/EX desde planilla mensual (saved + auto-generados por jornada) ──
        // Usa la misma lógica que getMonthlySheet para garantizar consistencia con el
        // "Detalle de Registro de Asistencia" de Talento Humano.
        double[] ordHoursByMonth   = new double[13];
        double[] exDayHoursByMonth = new double[13];
        Map<String, Double> ordHoursByDeptYear  = new LinkedHashMap<>();
        Map<String, Double> exHoursByDeptYear   = new LinkedHashMap<>();

        // Acumuladores por mes/depto para tabla de detalle
        Map<Integer, Map<String, Double>>      ordHoursMD  = new HashMap<>();
        Map<Integer, Map<String, Double>>      exHoursMD   = new HashMap<>();
        Map<Integer, Map<String, Set<Long>>>   colabMD     = new HashMap<>();
        // Acumuladores por mes/depto+cargo (tabla detallada)
        Map<Integer, Map<String, Double>>      ordHoursMDC = new HashMap<>();
        Map<Integer, Map<String, Double>>      exHoursMDC  = new HashMap<>();
        Map<Integer, Map<String, Integer>>     exCountMDC  = new HashMap<>();
        Map<Integer, Map<String, Set<Long>>>   colabMDC    = new HashMap<>();

        java.time.format.DateTimeFormatter mesFmt =
                java.time.format.DateTimeFormatter.ofPattern("MMMM yyyy", java.util.Locale.forLanguageTag("es-EC"));

        LocalDate today = LocalDate.now();
        for (int month = 1; month <= 12; month++) {
            // No procesar meses futuros (el horario auto-genera T-days aunque no hayan ocurrido)
            if (LocalDate.of(year, month, 1).isAfter(today)) continue;
            List<Map<String, Object>> monthSheet = getMonthlySheet(businessId, year, month);
            for (Map<String, Object> empRow : monthSheet) {
                Object empIdObj = empRow.get("employeeId");
                Long empId = (empIdObj instanceof Number) ? ((Number) empIdObj).longValue() : null;
                String dept  = (String) empRow.getOrDefault("departmentName", "Sin departamento");
                String pos   = (String) empRow.get("position");
                String cargo = (pos != null && !pos.isBlank()) ? pos : "Sin cargo";
                String deptCargo = dept + "|" + cargo;
                String shiftName = (String) empRow.get("workShiftName");
                double daily = inferDailyHoursFromShiftName(shiftName);

                @SuppressWarnings("unchecked")
                Map<String, Integer> totals = (Map<String, Integer>) empRow.get("totals");
                int tDays  = totals != null ? totals.getOrDefault("T",  0) : 0;
                int exDays = totals != null ? totals.getOrDefault("EX", 0) : 0;

                if (tDays > 0) {
                    double ordH = tDays * daily;
                    ordHoursByMonth[month]          += ordH;
                    ordHoursByDeptYear.merge(dept, ordH, Double::sum);
                    ordHoursMD.computeIfAbsent(month, k -> new HashMap<>()).merge(dept, ordH, Double::sum);
                    ordHoursMDC.computeIfAbsent(month, k -> new HashMap<>()).merge(deptCargo, ordH, Double::sum);
                    if (empId != null) {
                        colabMD.computeIfAbsent(month, k -> new HashMap<>())
                               .computeIfAbsent(dept, k -> new HashSet<>()).add(empId);
                        colabMDC.computeIfAbsent(month, k -> new HashMap<>())
                                .computeIfAbsent(deptCargo, k -> new HashSet<>()).add(empId);
                    }
                }
                if (exDays > 0) {
                    double exH = exDays * daily;
                    exDayHoursByMonth[month]        += exH;
                    exHoursByDeptYear.merge(dept, exH, Double::sum);
                    exHoursMD.computeIfAbsent(month, k -> new HashMap<>()).merge(dept, exH, Double::sum);
                    exHoursMDC.computeIfAbsent(month, k -> new HashMap<>()).merge(deptCargo, exH, Double::sum);
                    exCountMDC.computeIfAbsent(month, k -> new HashMap<>()).merge(deptCargo, exDays, Integer::sum);
                    if (empId != null) {
                        colabMD.computeIfAbsent(month, k -> new HashMap<>())
                               .computeIfAbsent(dept, k -> new HashSet<>()).add(empId);
                        colabMDC.computeIfAbsent(month, k -> new HashMap<>())
                                .computeIfAbsent(deptCargo, k -> new HashSet<>()).add(empId);
                    }
                }
            }
        }

        // ── 3. Tabla de detalle por mes/depto/cargo ────────────────────────────
        List<Map<String, Object>> detailRows = new ArrayList<>();
        Set<Integer> monthsWithData = new TreeSet<>();

        for (int month = 1; month <= 12; month++) {
            LocalDate ms = LocalDate.of(year, month, 1);
            String mesLabel = capitalizeEsMonth(ms.format(mesFmt));

            Map<String, Double>  ordM = ordHoursMDC.getOrDefault(month, Collections.emptyMap());
            Map<String, Double>  exHM = exHoursMDC.getOrDefault(month, Collections.emptyMap());
            Map<String, Integer> exCM = exCountMDC.getOrDefault(month, Collections.emptyMap());
            Map<String, Double>  otDC = otHoursByMonthDeptCargo.getOrDefault(month, Collections.emptyMap());

            Set<String> dcKeys = new TreeSet<>();
            dcKeys.addAll(ordM.keySet());
            dcKeys.addAll(exHM.keySet());
            dcKeys.addAll(otDC.keySet());

            if (!dcKeys.isEmpty()) monthsWithData.add(month);

            for (String dcKey : dcKeys) {
                String[] parts  = dcKey.split("\\|", 2);
                String   d      = parts[0];
                String   c      = parts.length > 1 ? parts[1] : "Sin cargo";
                double   ordHD  = ordM.getOrDefault(dcKey, 0.0);
                double   exHD   = exHM.getOrDefault(dcKey, 0.0);
                int      exCnt  = exCM.getOrDefault(dcKey, 0);
                double   otHD   = otDC.getOrDefault(dcKey, 0.0);
                if (ordHD <= 0 && exHD <= 0 && otHD <= 0) continue;
                int numColab = colabMDC.getOrDefault(month, Collections.emptyMap())
                                       .getOrDefault(dcKey, Collections.emptySet()).size();
                Map<String, Object> dr = new LinkedHashMap<>();
                dr.put("mesSort",          year * 100 + month);
                dr.put("mesAnio",          mesLabel);
                dr.put("departamento",     d);
                dr.put("cargo",            c);
                dr.put("horasOrdinarias",  Math.round(ordHD));
                dr.put("horasExtraOt",     Math.round(otHD));
                dr.put("diasExtrasCount",  exCnt);
                dr.put("horasExtras",      Math.round(exHD + otHD));
                dr.put("totalHh",          Math.round(ordHD + exHD + otHD));
                dr.put("numColaboradores", numColab);
                detailRows.add(dr);
            }
        }

        // ── 4. Totales anuales ─────────────────────────────────────────────────
        double totalOtHours   = overtimeYear.stream().mapToDouble(EmployeeOvertime::getHoursTotal).sum();
        double ordinaryHours  = 0.0;
        double exDayHoursYtd  = 0.0;
        for (int i = 1; i <= 12; i++) {
            ordinaryHours += ordHoursByMonth[i];
            exDayHoursYtd += exDayHoursByMonth[i];
        }
        double extraHoursTotal = exDayHoursYtd + totalOtHours;
        double totalHours      = ordinaryHours + extraHoursTotal;

        // ── 5. Año anterior (misma lógica: planilla mensual saved + auto-generados) ──
        double prevOrdinary = 0.0;
        double prevExtra    = 0.0;
        if (year > 2000) {
            List<EmployeeOvertime> otPrev = overtimeRepository.findByBusinessAndDateRangeWithEmployee(
                    businessId, pStart, pEnd);
            double prevOt = otPrev.stream().mapToDouble(EmployeeOvertime::getHoursTotal).sum();
            for (int m = 1; m <= 12; m++) {
                List<Map<String, Object>> prevSheet = getMonthlySheet(businessId, year - 1, m);
                for (Map<String, Object> empRow : prevSheet) {
                    String shiftName = (String) empRow.get("workShiftName");
                    double daily = inferDailyHoursFromShiftName(shiftName);
                    @SuppressWarnings("unchecked")
                    Map<String, Integer> totals = (Map<String, Integer>) empRow.get("totals");
                    if (totals == null) continue;
                    prevOrdinary += totals.getOrDefault("T",  0) * daily;
                    prevExtra    += totals.getOrDefault("EX", 0) * daily;
                }
            }
            prevExtra += prevOt;
        }

        // ── 6. KPIs derivados ──────────────────────────────────────────────────
        double ytdVsPrevPct = 0.0;
        if (prevOrdinary + prevExtra > 0.001) {
            ytdVsPrevPct = ((totalHours - (prevOrdinary + prevExtra)) / (prevOrdinary + prevExtra)) * 100.0;
        }
        double avgMonthlyHours = !monthsWithData.isEmpty()
                ? totalHours / monthsWithData.size() : 0.0;
        double extraSharePct   = totalHours > 0.001 ? (extraHoursTotal / totalHours) * 100.0 : 0.0;

        long activeEmployees = employeeRepository.findWithRelationsByBusinessId(businessId).stream()
                .filter(e -> Boolean.TRUE.equals(e.getActive())).count();

        // ── 7. Distribución por área ───────────────────────────────────────────
        double deptHourSum = 0.0;
        Map<String, Double> deptTotalHours = new LinkedHashMap<>();
        Set<String> allDepts = new TreeSet<>();
        allDepts.addAll(ordHoursByDeptYear.keySet());
        allDepts.addAll(exHoursByDeptYear.keySet());
        allDepts.addAll(otHoursByDeptYear.keySet());
        for (String d : allDepts) {
            double h = ordHoursByDeptYear.getOrDefault(d, 0.0)
                     + exHoursByDeptYear.getOrDefault(d, 0.0)
                     + otHoursByDeptYear.getOrDefault(d, 0.0);
            deptTotalHours.put(d, h);
            deptHourSum += h;
        }
        List<Map<String, Object>> byDepartment = new ArrayList<>();
        for (Map.Entry<String, Double> e : deptTotalHours.entrySet()) {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("nombre", e.getKey());
            row.put("hours", Math.round(e.getValue()));
            row.put("pct", deptHourSum > 0.001
                    ? Math.round((e.getValue() / deptHourSum) * 1000.0) / 10.0 : 0.0);
            byDepartment.add(row);
        }
        byDepartment.sort((a, b) -> Double.compare(
                ((Number) b.get("hours")).doubleValue(),
                ((Number) a.get("hours")).doubleValue()));

        // ── 8. Tendencia mensual (solo meses con datos reales) ─────────────────
        List<Map<String, Object>> monthsTrend = new ArrayList<>();
        String[] shortLabels = {"", "ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"};
        for (int m = 1; m <= 12; m++) {
            double ordH = ordHoursByMonth[m];
            double exH  = exDayHoursByMonth[m] + otHoursByMonth.getOrDefault(m, 0.0);
            Map<String, Object> tm = new LinkedHashMap<>();
            tm.put("month", m);
            tm.put("label", shortLabels[m]);
            tm.put("ordinHours", Math.round(ordH));
            tm.put("extraHours", Math.round(exH));
            monthsTrend.add(tm);
        }

        // ── 9. Opciones de filtro de departamento ──────────────────────────────
        List<Map<String, Object>> departmentOptions = new ArrayList<>();
        Map<String, Object> allOpt = new LinkedHashMap<>();
        allOpt.put("value", "all");
        allOpt.put("label", "Todos los departamentos");
        departmentOptions.add(allOpt);
        for (String d : allDepts) {
            Map<String, Object> o = new LinkedHashMap<>();
            o.put("value", "dept:" + d);
            o.put("label", d);
            departmentOptions.add(o);
        }

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("year", year);
        out.put("standardHoursPerDay", fallbackHours);
        out.put("ordinaryHoursYtd", Math.round(ordinaryHours));
        out.put("extraHoursYtd", Math.round(extraHoursTotal));
        out.put("totalHoursYtd", Math.round(totalHours));
        out.put("previousYearTotalHours", Math.round(prevOrdinary + prevExtra));
        out.put("previousYearOrdinaryHours", Math.round(prevOrdinary));
        out.put("previousYearExtraHours", Math.round(prevExtra));
        out.put("ytdVsPreviousYearPct", Math.round(ytdVsPrevPct * 10.0) / 10.0);
        out.put("averageMonthlyHours", Math.round(avgMonthlyHours));
        out.put("extraHoursSharePct", Math.round(extraSharePct * 10.0) / 10.0);
        out.put("activeEmployees", activeEmployees);
        out.put("monthsTrend", monthsTrend);
        out.put("byDepartment", byDepartment);
        out.put("detailRows", detailRows);
        out.put("departmentOptions", departmentOptions);
        out.put("projectOptions", List.of(
                Map.of("value", "all", "label", "Todos los proyectos activos")
        ));
        return out;
    }

    // ─── Índices de Seguridad (IF, TRIF, IG, TR) ────────────────────────────

    @Transactional(readOnly = true)
    public Map<String, Object> getSafetyIndicesSummary(Long businessId, int year) {
        requireBusiness(businessId);

        // ── 1. HHTT por mes (planilla, misma lógica que consolidado) ──────────
        LocalDate today = LocalDate.now();
        double[] hhttByMonth = new double[13]; // index 1-12
        int[]    accDaysByMonth = new int[13]; // días perdidos por accidentes desde planilla (A)
        for (int month = 1; month <= 12; month++) {
            if (LocalDate.of(year, month, 1).isAfter(today)) continue;
            List<Map<String, Object>> sheet = getMonthlySheet(businessId, year, month);
            for (Map<String, Object> row : sheet) {
                String shiftName = (String) row.get("workShiftName");
                double daily = inferDailyHoursFromShiftName(shiftName);
                @SuppressWarnings("unchecked")
                Map<String, Integer> totals = (Map<String, Integer>) row.get("totals");
                if (totals == null) continue;
                int tDays  = totals.getOrDefault("T",  0);
                int aDays  = totals.getOrDefault("A",  0); // accidentes
                // Para índices de seguridad: horas base SOLO de días T; las horas extra (EX)
                // se suman explícitamente desde el repositorio de overtime más abajo.
                hhttByMonth[month] += tDays * daily;
                accDaysByMonth[month] += aDays;
            }
            // añadir horas extra registradas (tabla employee_overtime)
            List<com.improvementsolutions.model.EmployeeOvertime> ot =
                    overtimeRepository.findByBusinessAndDateRangeWithEmployee(
                            businessId,
                            LocalDate.of(year, month, 1),
                            LocalDate.of(year, month, 1).withDayOfMonth(
                                    java.time.YearMonth.of(year, month).lengthOfMonth()));
            for (com.improvementsolutions.model.EmployeeOvertime o : ot) {
                hhttByMonth[month] += o.getHoursTotal();
            }
        }

        // ── 2. Incidentes del año ────────────────────────────────────────────
        List<com.improvementsolutions.model.BusinessIncident> incidents =
                businessIncidentRepository.findByBusinessIdAndDateRange(
                        businessId,
                        LocalDate.of(year, 1, 1),
                        LocalDate.of(year, 12, 31));

        int[]    lesionesByMonth        = new int[13];
        int[]    diasPerdidosByMonth    = new int[13]; // desde módulo de incidentes (lostDays)
        int[]    countTiempoPerdidoByMo = new int[13]; // fallback: conteo de "Accidente con tiempo perdido"
        @SuppressWarnings("unchecked")
        List<Map<String,Object>>[] incidentDetailByMonth = new List[13];
        for (int i = 1; i <= 12; i++) incidentDetailByMonth[i] = new ArrayList<>();
        for (com.improvementsolutions.model.BusinessIncident inc : incidents) {
            if (inc.getIncidentDate() == null) continue;
            if (inc.getIncidentDate().isAfter(today)) continue;
            int m = inc.getIncidentDate().getMonthValue();
            lesionesByMonth[m]++;
            int dp = (inc.getLostDays() != null ? inc.getLostDays() : 0);
            diasPerdidosByMonth[m] += dp;
            Map<String,Object> det = new LinkedHashMap<>();
            det.put("id",           inc.getId());
            det.put("personName",   inc.getPersonName()   != null ? inc.getPersonName()   : "");
            det.put("personCedula", inc.getPersonCedula() != null ? inc.getPersonCedula() : "");
            det.put("title",        inc.getTitle()        != null ? inc.getTitle()        : "");
            det.put("incidentDate", inc.getIncidentDate().toString());
            det.put("lostDays",     dp);
            det.put("eventClassification", inc.getEventClassification());
            incidentDetailByMonth[m].add(det);

            // Fallback: si la clasificación es "Accidente con tiempo perdido" y lostDays es 0/NULL, contar como 1
            String cls = inc.getEventClassification();
            if (cls != null) {
                String n = cls.trim().toLowerCase();
                boolean isAccidente   = n.contains("accidente");
                boolean isSinTP       = n.contains("sin tiempo perdido");
                boolean isConTP       = n.contains("tiempo perdido") && !isSinTP;
                boolean isItinere     = n.contains("itínere") || n.contains("itinere");
                boolean isNoAccidente = n.contains("no accidente de trabajo");
                boolean isNoAplica    = n.contains("no aplica");
                if (dp <= 0 && isAccidente && !isSinTP && !isNoAccidente && !isNoAplica) {
                    countTiempoPerdidoByMo[m]++;
                }
            }
        }

        // ── 3. Calcular índices por mes ──────────────────────────────────────
        String[] shortLabels = {"", "ENE", "FEB", "MAR", "ABR", "MAY", "JUN",
                                     "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"};
        String[] longLabels  = {"", "Enero", "Febrero", "Marzo", "Abril", "Mayo",
                                    "Junio", "Julio", "Agosto", "Septiembre",
                                    "Octubre", "Noviembre", "Diciembre"};

        List<Map<String, Object>> months = new ArrayList<>();
        double ytdHhtt = 0, ytdLesiones = 0, ytdDias = 0;

        for (int m = 1; m <= 12; m++) {
            if (LocalDate.of(year, m, 1).isAfter(today)) continue;
            double hh  = hhttByMonth[m];
            int    les = lesionesByMonth[m];
            // Combinar: usar el mayor entre planilla (accidentes A) y módulo de incidentes (lostDays)
            int    dpPlanilla = accDaysByMonth[m];
            int    dpInc      = diasPerdidosByMonth[m];
            int    dpFallback = countTiempoPerdidoByMo[m];
            int    dp         = Math.max(Math.max(dpPlanilla, dpInc), dpFallback);

            double ifM    = hh > 0 ? (les / hh) * 200_000.0 : 0.0;
            double trifM  = hh > 0 ? (les / hh) * 1_000_000.0 : 0.0;
            double igM    = hh > 0 ? (dp  / hh) * 200_000.0 : 0.0;
            double trM    = ifM > 0 ? igM / ifM : 0.0;

            Map<String, Object> mo = new LinkedHashMap<>();
            mo.put("month",        m);
            mo.put("label",        shortLabels[m]);
            mo.put("mesAnio",      longLabels[m] + " " + year);
            mo.put("lesiones",     les);
            mo.put("diasPerdidos", dp);
            mo.put("horasHombre",  Math.round(hh * 10.0) / 10.0);
            mo.put("if",           Math.round(ifM   * 100.0) / 100.0);
            mo.put("trif",         Math.round(trifM * 100.0) / 100.0);
            mo.put("ig",           Math.round(igM   * 100.0) / 100.0);
            mo.put("tr",           Math.round(trM   * 100.0) / 100.0);
            mo.put("incidentes",   incidentDetailByMonth[m]);
            months.add(mo);

            ytdHhtt     += hh;
            ytdLesiones += les;
            ytdDias     += dp;
        }

        // ── 4. YTD ───────────────────────────────────────────────────────────
        double ytdIf   = ytdHhtt > 0 ? (ytdLesiones / ytdHhtt) * 200_000.0   : 0.0;
        double ytdTrif = ytdHhtt > 0 ? (ytdLesiones / ytdHhtt) * 1_000_000.0 : 0.0;
        double ytdIg   = ytdHhtt > 0 ? (ytdDias     / ytdHhtt) * 200_000.0   : 0.0;
        double ytdTr   = ytdIf   > 0 ? ytdIg / ytdIf                          : 0.0;

        Map<String, Object> ytd = new LinkedHashMap<>();
        ytd.put("lesiones",     (int) ytdLesiones);
        ytd.put("diasPerdidos", (int) ytdDias);
        ytd.put("horasHombre",  Math.round(ytdHhtt * 10.0) / 10.0);
        ytd.put("if",           Math.round(ytdIf   * 100.0) / 100.0);
        ytd.put("trif",         Math.round(ytdTrif * 100.0) / 100.0);
        ytd.put("ig",           Math.round(ytdIg   * 100.0) / 100.0);
        ytd.put("tr",           Math.round(ytdTr   * 100.0) / 100.0);

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("year",   year);
        out.put("ytd",    ytd);
        out.put("months", months);
        return out;
    }

    private static String departmentName(BusinessEmployee emp) {
        if (emp == null || emp.getDepartment() == null) {
            return "Sin departamento";
        }
        return emp.getDepartment().getName();
    }

    private static String capitalizeEsMonth(String formatted) {
        if (formatted == null || formatted.isEmpty()) {
            return formatted;
        }
        return Character.toUpperCase(formatted.charAt(0)) + formatted.substring(1);
    }

    // ─────────────────── HOLIDAYS ───────────────────

    @Transactional(readOnly = true)
    public List<Holiday> getHolidays(Long businessId, int year, int month) {
        requireBusiness(businessId);
        YearMonth ym = YearMonth.of(year, month);
        LocalDate from = ym.atDay(1);
        LocalDate to   = ym.atEndOfMonth();
        List<Holiday> list = new ArrayList<>();
        try { list.addAll(holidayRepository.findNationalBetween(from, to)); } catch (Exception ignore) {}
        try { list.addAll(holidayRepository.findByBusinessBetween(businessId, from, to)); } catch (Exception ignore) {}
        return list;
    }

    @Transactional
    public Holiday addBusinessHoliday(Long businessId, LocalDate date, String name) {
        Business biz = requireBusiness(businessId);
        Holiday h = Holiday.builder()
                .business(biz)
                .date(date)
                .name(name)
                .active(true)
                .build();
        return holidayRepository.save(h);
    }

    @Transactional
    public void deleteHoliday(Long businessId, Long holidayId) {
        Holiday h = holidayRepository.findById(holidayId)
                .orElseThrow(() -> new NoSuchElementException("Feriado no encontrado: " + holidayId));
        if (h.getBusiness() == null) {
            throw new SecurityException("No se puede eliminar un feriado nacional desde este endpoint");
        }
        if (!h.getBusiness().getId().equals(businessId)) {
            throw new SecurityException("El feriado no pertenece a esta empresa");
        }
        holidayRepository.delete(h);
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
                                                           Double dailyHours,
                                                           String notes) {
        Business biz = requireBusiness(businessId);
        BusinessEmployee emp = requireEmployee(businessId, employeeId);
        WorkSchedule ws = workScheduleRepository.findById(workScheduleId)
                .orElseThrow(() -> new NoSuchElementException("Jornada no encontrada: " + workScheduleId));

        if (endDate != null && endDate.isBefore(startDate)) {
            throw new IllegalArgumentException("La fecha de fin de vigencia no puede ser anterior al inicio.");
        }

        // Validar solapamiento: dos intervalos [a,b] y [c,d] se cruzan ssi a<=d y c<=b (fin null = abierto).
        LocalDate effectiveEnd = endDate != null ? endDate : LocalDate.of(9999, 12, 31);
        List<EmployeeWorkScheduleHistory> overlaps = scheduleHistoryRepository
                .findOverlappingNew(employeeId, startDate, effectiveEnd);
        if (!overlaps.isEmpty()) {
            // Auto-cerrar periodos vigentes (fin null) que empiezan ANTES del inicio del nuevo periodo:
            // el nuevo periodo sustituye a partir de startDate.
            overlaps.stream()
                .filter(h -> h.getEndDate() == null && h.getStartDate().isBefore(startDate))
                .forEach(h -> {
                    LocalDate closeAt = startDate.minusDays(1);
                    if (!closeAt.isBefore(h.getStartDate())) {
                        h.setEndDate(closeAt);
                        scheduleHistoryRepository.save(h);
                    }
                });
            // Si el nuevo periodo empieza antes o el mismo día que un vigente, no se auto-cierra:
            // seguiría habiendo solape real hasta que el usuario acote fechas o edite el vigente.
            List<EmployeeWorkScheduleHistory> stillOverlapping = scheduleHistoryRepository
                    .findOverlappingNew(employeeId, startDate, effectiveEnd);
            if (!stillOverlapping.isEmpty()) {
                String conflicts = stillOverlapping.stream()
                        .map(AttendanceService::formatScheduleHistoryOverlap)
                        .collect(Collectors.joining("; "));
                throw new IllegalArgumentException(
                        "El rango se cruza con periodos ya registrados (las fechas son inclusivas). "
                                + "Ajuste el fin de vigencia o las fechas existentes para que no compartan días. "
                                + "Detalle: " + conflicts);
            }
        }

        EmployeeWorkScheduleHistory hist = new EmployeeWorkScheduleHistory();
        hist.setBusiness(biz);
        hist.setEmployee(emp);
        hist.setWorkSchedule(ws);
        hist.setStartDate(startDate);
        hist.setEndDate(endDate);
        hist.setCycleStartDate(cycleStartDate != null ? cycleStartDate : startDate);
        hist.setDailyHours(dailyHours);
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
                                                              Double dailyHours,
                                                              String notes) {
        EmployeeWorkScheduleHistory hist = scheduleHistoryRepository.findById(historyId)
                .orElseThrow(() -> new NoSuchElementException("Historial no encontrado: " + historyId));
        if (!hist.getBusiness().getId().equals(businessId)) throw new SecurityException("Acceso denegado");
        if (endDate != null) hist.setEndDate(endDate);
        if (cycleStartDate != null) hist.setCycleStartDate(cycleStartDate);
        if (dailyHours != null) hist.setDailyHours(dailyHours);
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

    @Transactional
    public List<MonthlySheetClosure> getClosures(Long businessId) {
        requireBusiness(businessId);
        List<MonthlySheetClosure> closures =
                closureRepository.findByBusiness_IdOrderByYearDescMonthDesc(businessId);
        for (MonthlySheetClosure c : closures) {
            if (c.getPeopleCount() == null || c.getHhttTotalHours() == null) {
                fillClosureMetricsSnapshot(businessId, c.getYear(), c.getMonth(), c);
                closureRepository.save(c);
            }
        }
        return closures;
    }

    @Transactional
    public Optional<MonthlySheetClosure> getClosure(Long businessId, int year, int month) {
        requireBusiness(businessId);
        Optional<MonthlySheetClosure> opt =
                closureRepository.findByBusiness_IdAndYearAndMonth(businessId, year, month);
        opt.ifPresent(c -> {
            if (c.getPeopleCount() == null || c.getHhttTotalHours() == null) {
                fillClosureMetricsSnapshot(businessId, year, month, c);
                closureRepository.save(c);
            }
        });
        return opt;
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

        // Calcular y almacenar métricas de snapshot para el mes (personas y HHTT)
        fillClosureMetricsSnapshot(businessId, year, month, closure);

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

        // Asegurar que las métricas estén calculadas también en caso de que se hayan añadido después
        if (closure.getPeopleCount() == null || closure.getHhttTotalHours() == null) {
            fillClosureMetricsSnapshot(businessId, year, month, closure);
        }

        closure.setStatus("APPROVED");
        closure.setApprovedAt(java.time.LocalDateTime.now());
        closure.setApprovedBy(approvedBy);
        if (signedPdfPath != null) closure.setSignedPdfPath(signedPdfPath);
        return closureRepository.save(closure);
    }

    /**
     * Calcula y guarda en el cierre mensual un snapshot de:
     * - total de personas en planilla para el mes
     * - total de Horas Hombre Trabajadas (HHTT) del mes, en horas
     */
    private void fillClosureMetricsSnapshot(Long businessId, int year, int month, MonthlySheetClosure closure) {
        try {
            List<Map<String, Object>> sheet = getMonthlySheet(businessId, year, month);
            int people = sheet.size();

            YearMonth ym = YearMonth.of(year, month);
            LocalDate from = ym.atDay(1);
            LocalDate to = ym.atEndOfMonth();

            List<EmployeeOvertime> overtimeMonth =
                    overtimeRepository.findByBusinessAndDateRangeWithEmployee(businessId, from, to);
            Map<Long, Double> overtimeByEmployee = new HashMap<>();
            for (EmployeeOvertime o : overtimeMonth) {
                if (o.getEmployee() == null || o.getEmployee().getId() == null) continue;
                Long eid = o.getEmployee().getId();
                overtimeByEmployee.merge(eid, o.getHoursTotal(), Double::sum);
            }

            double totalHhtt = 0.0;
            for (Map<String, Object> row : sheet) {
                Object empIdObj = row.get("employeeId");
                Long empId = (empIdObj instanceof Number) ? ((Number) empIdObj).longValue() : null;
                String shiftName = (String) row.get("workShiftName");
                double dailyHours = inferDailyHoursFromShiftName(shiftName);

                @SuppressWarnings("unchecked")
                Map<String, Integer> totals = (Map<String, Integer>) row.get("totals");
                int t = totals != null ? totals.getOrDefault("T", 0) : 0;
                int ex = totals != null ? totals.getOrDefault("EX", 0) : 0;
                double overtimeHrs = (empId != null) ? overtimeByEmployee.getOrDefault(empId, 0.0) : 0.0;

                // Solo contar días ordinarios (T) como horas base; las horas extra se agregan aparte
                double ordHours = t * dailyHours;
                totalHhtt += ordHours + overtimeHrs;
            }

            closure.setPeopleCount(people);
            closure.setHhttTotalHours(Math.round(totalHhtt * 10.0) / 10.0);
        } catch (Exception e) {
            // En caso de error, no bloquear el cierre; simplemente dejar métricas nulas
            log.error("No se pudieron calcular las métricas de cierre para {}/{}, causa: {}",
                    year, month, e.getMessage(), e);
        }
    }

    private double inferDailyHoursFromShiftName(String name) {
        if (name == null || name.isBlank()) {
            return 8.0;
        }
        String s = name.toLowerCase();
        // Buscar patrón explícito de horas, p.ej. "8h", "10 horas"
        java.util.regex.Matcher m = java.util.regex.Pattern
                .compile("(\\d+(?:[.,]\\d+)?)\\s*(h|hora|horas)\\b")
                .matcher(s);
        if (m.find()) {
            String raw = m.group(1).replace(',', '.');
            try {
                double v = Double.parseDouble(raw);
                if (v > 0 && v <= 24) return v;
            } catch (NumberFormatException ignore) {}
        }
        // Fallback: primer número razonable
        java.util.regex.Matcher m2 = java.util.regex.Pattern
                .compile("(\\d+(?:[.,]\\d+)?)")
                .matcher(s);
        if (m2.find()) {
            String raw = m2.group(1).replace(',', '.');
            try {
                double v = Double.parseDouble(raw);
                if (v > 0 && v <= 24) return v;
            } catch (NumberFormatException ignore) {}
        }
        return 8.0;
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
