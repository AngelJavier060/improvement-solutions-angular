package com.improvementsolutions.service;

import com.improvementsolutions.dto.birthday.BirthdaySendResultDto;
import com.improvementsolutions.dto.birthday.BirthdayUpcomingDto;
import com.improvementsolutions.dto.birthday.BirthdayUpcomingItemDto;
import com.improvementsolutions.model.BirthdayGreetingMailSent;
import com.improvementsolutions.model.Business;
import com.improvementsolutions.model.BusinessEmployee;
import com.improvementsolutions.repository.BirthdayGreetingMailSentRepository;
import com.improvementsolutions.repository.BusinessEmployeeRepository;
import com.improvementsolutions.repository.BusinessRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DateTimeException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.Period;
import java.time.ZoneId;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
@Slf4j
public class BirthdayGreetingNotificationService {

    public static final int UPCOMING_DAYS = 10;
    private static final ZoneId ZONE = ZoneId.of("America/Guayaquil");
    private static final Pattern EMAIL = Pattern.compile("^[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}$", Pattern.CASE_INSENSITIVE);
    private static final DateTimeFormatter DM = DateTimeFormatter.ofPattern("dd/MM");
    private static final DateTimeFormatter FULL = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    private final BusinessRepository businessRepository;
    private final BusinessEmployeeRepository employeeRepository;
    private final BirthdayGreetingMailSentRepository sentRepository;
    private final EmailService emailService;

    public LocalDate today() {
        return LocalDate.now(ZONE);
    }

    public String resolvePhrase(Business business) {
        String name = companyName(business);
        String custom = business.getBirthdayGreetingMessage();
        if (custom != null && !custom.isBlank()) {
            return applyCompanyName(custom.trim(), name);
        }
        return "De parte de todo el equipo de " + name
                + ", te deseamos un día lleno de alegría y muchos éxitos. "
                + "Que este nuevo año de vida venga acompañado de grandes momentos y nuevas oportunidades.\n\n"
                + "¡Muchas felicidades!";
    }

    public String applyCompanyName(String phrase, String name) {
        if (phrase == null) return "";
        String n = name == null || name.isBlank() ? "la empresa" : name;
        return phrase.replace("[Nombre de la empresa]", n)
                .replace("[nombre de la empresa]", n)
                .replace("[empresa]", n);
    }

    @Transactional(readOnly = true)
    public BirthdayUpcomingDto upcoming(Long businessId) {
        Business business = businessRepository.findById(businessId)
                .orElseThrow(() -> new RuntimeException("Empresa no encontrada"));
        BirthdayUpcomingDto out = new BirthdayUpcomingDto();
        out.setEnabled(Boolean.TRUE.equals(business.getBirthdayGreetingEnabled()));
        out.setMailConfigured(emailService.isConfigured());
        out.setCompanyName(companyName(business));
        out.setMessage(resolvePhrase(business));
        LocalDate today = today();
        String phrase = resolvePhrase(business);
        List<BirthdayUpcomingItemDto> items = new ArrayList<>();
        for (BusinessEmployee e : employeeRepository.findActiveWithBirthDate(businessId)) {
            LocalDate next = nextBirthday(e.getDateBirth().toLocalDate(), today);
            if (next == null) continue;
            long days = ChronoUnit.DAYS.between(today, next);
            if (days < 0 || days > UPCOMING_DAYS) continue;
            BirthdayUpcomingItemDto row = new BirthdayUpcomingItemDto();
            row.setId(e.getId());
            row.setFullName(fullName(e));
            row.setEmail(e.getEmail());
            row.setPosition(e.getPosition());
            row.setPhoto(e.getImagePath() != null && !e.getImagePath().isBlank() ? e.getImagePath() : e.getImage());
            row.setBirthDayMonth(e.getDateBirth().toLocalDate().format(DM));
            row.setNextDate(next.format(FULL));
            row.setDaysLeft((int) days);
            row.setAgeTurning(Period.between(e.getDateBirth().toLocalDate(), next).getYears());
            row.setHasEmail(isEmail(e.getEmail()));
            row.setEmailsSentToday(Math.min(2, sentRepository.countByEmployeeIdAndSentDateAndSlotNot(e.getId(), today, 9)));
            if (days == 0) row.setPhrase(phrase);
            items.add(row);
        }
        items.sort(Comparator.comparingInt(BirthdayUpcomingItemDto::getDaysLeft)
                .thenComparing(BirthdayUpcomingItemDto::getFullName, String.CASE_INSENSITIVE_ORDER));
        out.setItems(items);
        out.setInfo(items.isEmpty()
                ? "No hay cumpleaños en los próximos " + UPCOMING_DAYS + " días."
                : items.size() + " cumpleaños en los próximos " + UPCOMING_DAYS + " días.");
        return out;
    }

    public int currentSlot() {
        int hour = LocalTime.now(ZONE).getHour();
        return hour < 15 ? 1 : 2;
    }

    /** Mañana 08:00 Ecuador. */
    @Scheduled(cron = "0 0 8 * * *", zone = "America/Guayaquil")
    public void morningRun() {
        runAllEnabled(1);
    }

    /** Tarde 15:00 Ecuador. */
    @Scheduled(cron = "0 0 15 * * *", zone = "America/Guayaquil")
    public void afternoonRun() {
        runAllEnabled(2);
    }

    /** Si el servidor arrancó después de la hora, completa el turno pendiente. */
    @Scheduled(cron = "0 */15 * * * *", zone = "America/Guayaquil")
    public void catchUp() {
        int hour = LocalTime.now(ZONE).getHour();
        if (hour >= 8) runAllEnabled(1);
        if (hour >= 15) runAllEnabled(2);
    }

    public void runAllEnabled(int slot) {
        log.info("[BirthdayMail] Inicio envío slot {}", slot);
        for (Business b : businessRepository.findAll()) {
            if (!Boolean.TRUE.equals(b.getBirthdayGreetingEnabled())) continue;
            try {
                sendSlot(b.getId(), slot, false);
            } catch (Exception e) {
                log.error("[BirthdayMail] Empresa {}: {}", b.getId(), e.getMessage());
            }
        }
    }

    public BirthdaySendResultDto sendNow(Long businessId) {
        return sendSlot(businessId, currentSlot(), false);
    }

    public BirthdaySendResultDto sendSlot(Long businessId, int slot, boolean force) {
        Business business = businessRepository.findById(businessId)
                .orElseThrow(() -> new RuntimeException("Empresa no encontrada"));
        BirthdaySendResultDto res = new BirthdaySendResultDto();
        if (!Boolean.TRUE.equals(business.getBirthdayGreetingEnabled()) && !force) {
            res.setMessage("Active primero la felicitación de cumpleaños y guarde.");
            return res;
        }
        if (!emailService.isConfigured()) {
            res.setMessage("El correo SMTP no está configurado en el servidor.");
            return res;
        }
        LocalDate today = today();
        String phrase = resolvePhrase(business);
        int sent = 0, skipped = 0, failed = 0;
        for (BusinessEmployee e : employeeRepository.findActiveBirthdaysOnDay(
                businessId, today.getMonthValue(), today.getDayOfMonth())) {
            if (!isEmail(e.getEmail())) {
                skipped++;
                continue;
            }
            if (sentRepository.existsByEmployeeIdAndSentDateAndSlot(e.getId(), today, slot)) {
                skipped++;
                continue;
            }
            boolean ok = emailService.sendHtml(
                    e.getEmail().trim(),
                    "¡Feliz cumpleaños, " + firstName(e) + "!",
                    buildHtml(business, fullName(e), phrase)
            );
            if (!ok) {
                failed++;
                continue;
            }
            try {
                sentRepository.save(BirthdayGreetingMailSent.builder()
                        .businessId(business.getId())
                        .employeeId(e.getId())
                        .sentDate(today)
                        .slot(slot)
                        .emailTo(e.getEmail().trim())
                        .sentAt(LocalDateTime.now(ZONE))
                        .build());
                sent++;
            } catch (Exception dup) {
                log.warn("[BirthdayMail] Ya registrado empleado {} slot {}: {}", e.getId(), slot, dup.getMessage());
                skipped++;
            }
        }
        res.setSent(sent);
        res.setSkipped(skipped);
        res.setFailed(failed);
        String turno = slot == 1 ? "mañana (08:00)" : "tarde (15:00)";
        if (sent > 0) {
            res.setMessage("Se envió la frase al correo del trabajador (" + sent + ") · turno " + turno + ".");
        } else {
            res.setMessage("No se envió correo: sin cumpleañeros hoy, sin email propio, o ya se envió este turno " + turno + ".");
        }
        return res;
    }

    public String companyName(Business b) {
        if (b.getTradeName() != null && !b.getTradeName().isBlank()) return b.getTradeName().trim();
        return b.getName() != null ? b.getName().trim() : "la empresa";
    }

    private LocalDate nextBirthday(LocalDate birth, LocalDate today) {
        if (birth == null) return null;
        int year = today.getYear();
        LocalDate next = safeDate(year, birth.getMonthValue(), birth.getDayOfMonth());
        if (next.isBefore(today)) {
            next = safeDate(year + 1, birth.getMonthValue(), birth.getDayOfMonth());
        }
        return next;
    }

    private LocalDate safeDate(int year, int month, int day) {
        try {
            return LocalDate.of(year, month, day);
        } catch (DateTimeException e) {
            return LocalDate.of(year, month, 28);
        }
    }

    private String fullName(BusinessEmployee e) {
        String n = (nz(e.getNombres()) + " " + nz(e.getApellidos())).trim();
        if (!n.isEmpty()) return n;
        return e.getName() != null && !e.getName().isBlank() ? e.getName().trim() : "Colaborador";
    }

    private String firstName(BusinessEmployee e) {
        String n = nz(e.getNombres());
        if (!n.isEmpty()) return n.split("\\s+")[0];
        return fullName(e).split("\\s+")[0];
    }

    private String nz(String s) {
        return s == null ? "" : s.trim();
    }

    private boolean isEmail(String s) {
        return s != null && EMAIL.matcher(s.trim()).matches();
    }

    private String buildHtml(Business business, String fullName, String phrase) {
        String company = esc(companyName(business));
        String body = esc(phrase).replace("\n", "<br>");
        return "<!DOCTYPE html><html><body style='margin:0;background:#f8fafc;font-family:Georgia,serif;color:#1e293b;'>"
                + "<div style='max-width:640px;margin:0 auto;padding:24px;'>"
                + "<div style='background:linear-gradient(180deg,#fffaf3,#f7efe3);border:1px solid #e8d7b0;border-radius:16px;padding:28px;'>"
                + "<p style='margin:0 0 8px;letter-spacing:.08em;text-transform:uppercase;color:#1e3a8a;font-weight:700;font-family:Arial,sans-serif;font-size:12px;'>"
                + company + "</p>"
                + "<h1 style='margin:0 0 6px;color:#1e3a8a;font-size:26px;'>¡Feliz cumpleaños,</h1>"
                + "<h2 style='margin:0 0 16px;color:#b45309;font-size:28px;'>" + esc(fullName) + "!</h2>"
                + "<p style='margin:0 0 16px;line-height:1.6;font-size:16px;'>" + body + "</p>"
                + "<p style='margin:0;font-style:italic;color:#475569;'>Con cariño, todo el equipo de " + company + ".</p>"
                + "</div>"
                + "<p style='margin:16px 0 0;font-size:11px;color:#94a3b8;font-family:Arial,sans-serif;'>Improvement Solutions · felicitación automática</p>"
                + "</div></body></html>";
    }

    private String esc(String s) {
        if (s == null) return "";
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;");
    }
}
