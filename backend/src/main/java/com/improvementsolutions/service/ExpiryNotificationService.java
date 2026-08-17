package com.improvementsolutions.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.improvementsolutions.dto.expiry.ExpiryAlertConfigDto;
import com.improvementsolutions.dto.expiry.ExpiryAlertItemDto;
import com.improvementsolutions.dto.expiry.ExpiryAlertPreviewDto;
import com.improvementsolutions.model.*;
import com.improvementsolutions.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ExpiryNotificationService {

    private static final Pattern EMAIL = Pattern.compile("^[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}$", Pattern.CASE_INSENSITIVE);
    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final List<Integer> DEFAULT_THRESHOLDS = List.of(30, 15, 7);

    private final BusinessRepository businessRepository;
    private final UserRepository userRepository;
    private final FleetComplianceDocumentRepository fleetComplianceDocumentRepository;
    private final BusinessEmployeeDocumentRepository employeeDocumentRepository;
    private final BusinessEmployeeCourseRepository employeeCourseRepository;
    private final BusinessEmployeeCardRepository employeeCardRepository;
    private final BusinessEmployeeContractRepository employeeContractRepository;
    private final ExpiryAlertSentRepository expiryAlertSentRepository;
    private final EmailService emailService;
    private final ObjectMapper objectMapper;

    public ExpiryAlertConfigDto defaultConfig() {
        return new ExpiryAlertConfigDto();
    }

    public ExpiryAlertConfigDto parseConfig(String json) {
        if (json == null || json.isBlank()) {
            return defaultConfig();
        }
        try {
            ExpiryAlertConfigDto dto = objectMapper.readValue(json, ExpiryAlertConfigDto.class);
            if (dto.getThresholds() == null || dto.getThresholds().isEmpty()) {
                dto.setThresholds(new ArrayList<>(DEFAULT_THRESHOLDS));
            }
            if (dto.getEmails() == null) dto.setEmails(new ArrayList<>());
            if (dto.getUserIds() == null) dto.setUserIds(new ArrayList<>());
            return dto;
        } catch (Exception e) {
            log.warn("No se pudo leer expiry_notification_config: {}", e.getMessage());
            return defaultConfig();
        }
    }

    public String toJson(ExpiryAlertConfigDto dto) {
        try {
            ExpiryAlertConfigDto clean = dto == null ? defaultConfig() : dto;
            clean.setEmails(normalizeEmails(clean.getEmails()));
            if (clean.getUserIds() == null) clean.setUserIds(new ArrayList<>());
            if (clean.getThresholds() == null || clean.getThresholds().isEmpty()) {
                clean.setThresholds(new ArrayList<>(DEFAULT_THRESHOLDS));
            } else {
                clean.setThresholds(clean.getThresholds().stream()
                        .filter(n -> n != null && n > 0 && n <= 365)
                        .distinct()
                        .sorted(Comparator.reverseOrder())
                        .collect(Collectors.toList()));
            }
            return objectMapper.writeValueAsString(clean);
        } catch (Exception e) {
            throw new IllegalArgumentException("Configuración de avisos inválida");
        }
    }

    @Transactional(readOnly = true)
    public ExpiryAlertConfigDto getConfig(Long businessId) {
        Business business = requireBusiness(businessId);
        return parseConfig(business.getExpiryNotificationConfig());
    }

    @Transactional
    public ExpiryAlertConfigDto saveConfig(Long businessId, ExpiryAlertConfigDto dto) {
        Business business = requireBusiness(businessId);
        String json = toJson(dto);
        business.setExpiryNotificationConfig(json);
        business.setUpdatedAt(LocalDateTime.now());
        businessRepository.save(business);
        return parseConfig(json);
    }

    @Transactional(readOnly = true)
    public ExpiryAlertPreviewDto preview(Long businessId) {
        Business business = requireBusiness(businessId);
        ExpiryAlertConfigDto cfg = parseConfig(business.getExpiryNotificationConfig());
        List<String> recipients = resolveRecipients(businessId, cfg);
        List<ExpiryAlertItemDto> items = collectWindow(businessId, cfg, maxThreshold(cfg));
        return ExpiryAlertPreviewDto.builder()
                .mailConfigured(emailService.isConfigured())
                .enabled(cfg.isEnabled())
                .recipients(recipients)
                .items(items)
                .message(items.isEmpty()
                        ? "No hay documentos por vencer en la ventana configurada."
                        : "Se encontraron " + items.size() + " caducidad(es) en los próximos " + maxThreshold(cfg) + " días.")
                .build();
    }

    /**
     * Envía un correo de prueba con el listado actual (no marca umbrales 30/15/7).
     */
    @Transactional
    public ExpiryAlertPreviewDto sendTest(Long businessId) {
        Business business = requireBusiness(businessId);
        ExpiryAlertConfigDto cfg = parseConfig(business.getExpiryNotificationConfig());
        List<String> recipients = resolveRecipients(businessId, cfg);
        List<ExpiryAlertItemDto> items = collectWindow(businessId, cfg, maxThreshold(cfg));
        if (recipients.isEmpty()) {
            return ExpiryAlertPreviewDto.builder()
                    .mailConfigured(emailService.isConfigured())
                    .enabled(cfg.isEnabled())
                    .recipients(recipients)
                    .items(items)
                    .sentCount(0)
                    .message("Agregue al menos un correo o seleccione un usuario antes de enviar.")
                    .build();
        }
        if (!emailService.isConfigured()) {
            return ExpiryAlertPreviewDto.builder()
                    .mailConfigured(false)
                    .enabled(cfg.isEnabled())
                    .recipients(recipients)
                    .items(items)
                    .sentCount(0)
                    .message("El servidor no tiene SMTP configurado (spring.mail.host). La lista sí existe; el correo no se puede enviar.")
                    .build();
        }
        String subject = "Prueba · avisos de caducidad · " + businessName(business);
        String html = buildHtml(business, items, "Este es un correo de prueba con las caducidades actuales (hasta "
                + maxThreshold(cfg) + " días).");
        int sent = 0;
        for (String to : recipients) {
            if (emailService.sendHtml(to, subject, html)) sent++;
        }
        return ExpiryAlertPreviewDto.builder()
                .mailConfigured(true)
                .enabled(cfg.isEnabled())
                .recipients(recipients)
                .items(items)
                .sentCount(sent)
                .message(sent > 0
                        ? "Correo de prueba enviado a " + sent + " destinatario(s)."
                        : "No se pudo enviar el correo. Revise las credenciales SMTP.")
                .build();
    }

    /**
     * Job real: un aviso por umbral exacto (30, 15, 7) si aún no se envió.
     */
    @Transactional
    public ExpiryAlertPreviewDto runForBusiness(Long businessId) {
        Business business = requireBusiness(businessId);
        return runForBusiness(business, false);
    }

    @Scheduled(cron = "0 0 8 * * *", zone = "America/Guayaquil")
    public void dailyJob() {
        log.info("[ExpiryAlerts] Inicio de job diario");
        List<Business> businesses = businessRepository.findAll();
        for (Business business : businesses) {
            try {
                runForBusiness(business, true);
            } catch (Exception e) {
                log.error("[ExpiryAlerts] Error en empresa {}: {}", business.getId(), e.getMessage());
            }
        }
        log.info("[ExpiryAlerts] Job diario finalizado");
    }

    private ExpiryAlertPreviewDto runForBusiness(Business business, boolean skipIfDisabled) {
        ExpiryAlertConfigDto cfg = parseConfig(business.getExpiryNotificationConfig());
        if (skipIfDisabled && !cfg.isEnabled()) {
            return ExpiryAlertPreviewDto.builder()
                    .mailConfigured(emailService.isConfigured())
                    .enabled(false)
                    .message("Avisos desactivados para esta empresa.")
                    .build();
        }
        List<String> recipients = resolveRecipients(business.getId(), cfg);
        List<ExpiryAlertItemDto> due = collectExactThresholds(business.getId(), cfg);
        int skipped = 0;
        List<ExpiryAlertItemDto> toSend = new ArrayList<>();
        for (ExpiryAlertItemDto item : due) {
            boolean already = expiryAlertSentRepository.existsByBusiness_IdAndSourceTypeAndSourceIdAndThresholdDays(
                    business.getId(), item.getSourceType(), item.getSourceId(), item.getThreshold());
            if (already) {
                skipped++;
            } else {
                toSend.add(item);
            }
        }
        if (toSend.isEmpty()) {
            return ExpiryAlertPreviewDto.builder()
                    .mailConfigured(emailService.isConfigured())
                    .enabled(cfg.isEnabled())
                    .recipients(recipients)
                    .items(due)
                    .skippedAlreadySent(skipped)
                    .sentCount(0)
                    .message(due.isEmpty()
                            ? "Hoy no hay avisos en los umbrales 30 / 15 / 7 días."
                            : "Los avisos de hoy ya fueron enviados anteriormente.")
                    .build();
        }
        if (recipients.isEmpty() || !emailService.isConfigured()) {
            return ExpiryAlertPreviewDto.builder()
                    .mailConfigured(emailService.isConfigured())
                    .enabled(cfg.isEnabled())
                    .recipients(recipients)
                    .items(toSend)
                    .skippedAlreadySent(skipped)
                    .sentCount(0)
                    .message(recipients.isEmpty()
                            ? "Hay caducidades, pero no hay destinatarios configurados."
                            : "Hay caducidades, pero SMTP no está configurado.")
                    .build();
        }
        String subject = "Avisos de caducidad · " + businessName(business);
        String html = buildHtml(business, toSend, "Documentos que vencen en los umbrales configurados (30, 15 o 7 días).");
        int sentMails = 0;
        for (String to : recipients) {
            if (emailService.sendHtml(to, subject, html)) sentMails++;
        }
        if (sentMails > 0) {
            LocalDateTime now = LocalDateTime.now();
            for (ExpiryAlertItemDto item : toSend) {
                expiryAlertSentRepository.save(ExpiryAlertSent.builder()
                        .business(business)
                        .sourceType(item.getSourceType())
                        .sourceId(item.getSourceId())
                        .thresholdDays(item.getThreshold())
                        .expiryDate(item.getExpiryDate())
                        .sentAt(now)
                        .build());
            }
        }
        return ExpiryAlertPreviewDto.builder()
                .mailConfigured(true)
                .enabled(cfg.isEnabled())
                .recipients(recipients)
                .items(toSend)
                .skippedAlreadySent(skipped)
                .sentCount(sentMails)
                .message(sentMails > 0
                        ? "Se enviaron " + toSend.size() + " aviso(s) a " + sentMails + " destinatario(s)."
                        : "No se pudo enviar el correo.")
                .build();
    }

    private List<ExpiryAlertItemDto> collectWindow(Long businessId, ExpiryAlertConfigDto cfg, int maxDays) {
        LocalDate today = LocalDate.now();
        LocalDate to = today.plusDays(maxDays);
        List<ExpiryAlertItemDto> items = collectRaw(businessId, cfg, today, to);
        for (ExpiryAlertItemDto item : items) {
            item.setThreshold(matchingThreshold(cfg, item.getDaysLeft()));
        }
        items.sort(Comparator.comparingLong(ExpiryAlertItemDto::getDaysLeft)
                .thenComparing(ExpiryAlertItemDto::getModule));
        return items;
    }

    private List<ExpiryAlertItemDto> collectExactThresholds(Long businessId, ExpiryAlertConfigDto cfg) {
        LocalDate today = LocalDate.now();
        int max = maxThreshold(cfg);
        List<ExpiryAlertItemDto> window = collectRaw(businessId, cfg, today, today.plusDays(max));
        List<ExpiryAlertItemDto> exact = new ArrayList<>();
        Set<Integer> thresholds = new LinkedHashSet<>(cfg.getThresholds() == null ? DEFAULT_THRESHOLDS : cfg.getThresholds());
        for (ExpiryAlertItemDto item : window) {
            int days = (int) item.getDaysLeft();
            if (thresholds.contains(days)) {
                item.setThreshold(days);
                exact.add(item);
            }
        }
        return exact;
    }

    private List<ExpiryAlertItemDto> collectRaw(Long businessId, ExpiryAlertConfigDto cfg, LocalDate from, LocalDate to) {
        List<ExpiryAlertItemDto> items = new ArrayList<>();
        if (cfg.isFleet()) {
            for (FleetComplianceDocument d : fleetComplianceDocumentRepository.findActiveExpiringBetween(businessId, from, to)) {
                FleetVehicle v = d.getFleetVehicle();
                String placa = v != null && v.getPlaca() != null ? v.getPlaca() : "—";
                String codigo = v != null && v.getCodigoEquipo() != null ? v.getCodigoEquipo() : "";
                String label = d.getEntidadRemitenteName() != null && !d.getEntidadRemitenteName().isBlank()
                        ? d.getEntidadRemitenteName()
                        : (d.getTypeLabel() != null ? d.getTypeLabel() : d.getTypeCode());
                items.add(item("FLEET", d.getId(), "Flota",
                        "Unidad " + placa + (codigo.isBlank() ? "" : " (" + codigo + ")"),
                        label, d.getExpiryDate(), from));
            }
        }
        if (cfg.isPersonnelDocuments()) {
            for (BusinessEmployeeDocument d : employeeDocumentRepository.findActiveExpiringBetween(businessId, from, to)) {
                String docName = d.getTypeDocument() != null ? d.getTypeDocument().getName() : "Documento";
                items.add(item("EMP_DOC", d.getId(), "Personal · documentos",
                        employeeLabel(d.getBusinessEmployee()), docName, d.getEndDate(), from));
            }
        }
        if (cfg.isPersonnelCourses()) {
            for (BusinessEmployeeCourse d : employeeCourseRepository.findActiveExpiringBetween(businessId, from, to)) {
                String name = d.getCourseCertification() != null ? d.getCourseCertification().getName() : "Curso";
                items.add(item("EMP_COURSE", d.getId(), "Personal · cursos",
                        employeeLabel(d.getBusinessEmployee()), name, d.getExpiryDate(), from));
            }
        }
        if (cfg.isPersonnelCards()) {
            for (BusinessEmployeeCard d : employeeCardRepository.findActiveExpiringBetween(businessId, from, to)) {
                String name = d.getCard() != null ? d.getCard().getName() : "Tarjeta";
                items.add(item("EMP_CARD", d.getId(), "Personal · tarjetas",
                        employeeLabel(d.getBusinessEmployee()), name, d.getExpiryDate(), from));
            }
        }
        if (cfg.isPersonnelContracts()) {
            for (BusinessEmployeeContract d : employeeContractRepository.findActiveExpiringBetween(businessId, from, to)) {
                String name = d.getTypeContract() != null ? d.getTypeContract().getName() : "Contrato";
                items.add(item("EMP_CONTRACT", d.getId(), "Personal · contratos",
                        employeeLabel(d.getBusinessEmployee()), name, d.getEndDate(), from));
            }
        }
        return items;
    }

    private ExpiryAlertItemDto item(String type, Long id, String module, String subject, String document,
                                    LocalDate expiry, LocalDate today) {
        long days = java.time.temporal.ChronoUnit.DAYS.between(today, expiry);
        return ExpiryAlertItemDto.builder()
                .sourceType(type)
                .sourceId(id)
                .module(module)
                .subject(subject)
                .document(document)
                .expiryDate(expiry)
                .daysLeft(days)
                .build();
    }

    private Integer matchingThreshold(ExpiryAlertConfigDto cfg, long daysLeft) {
        List<Integer> th = cfg.getThresholds() == null ? DEFAULT_THRESHOLDS : cfg.getThresholds();
        return th.stream()
                .filter(n -> n != null && daysLeft <= n)
                .min(Integer::compareTo)
                .orElse(th.stream().max(Integer::compareTo).orElse(30));
    }

    private int maxThreshold(ExpiryAlertConfigDto cfg) {
        if (cfg.getThresholds() == null || cfg.getThresholds().isEmpty()) return 30;
        return cfg.getThresholds().stream().filter(n -> n != null && n > 0).max(Integer::compareTo).orElse(30);
    }

    private List<String> resolveRecipients(Long businessId, ExpiryAlertConfigDto cfg) {
        Set<String> emails = new LinkedHashSet<>(normalizeEmails(cfg.getEmails()));
        if (cfg.getUserIds() != null && !cfg.getUserIds().isEmpty()) {
            List<User> users = userRepository.findByBusinessIdWithRoles(businessId);
            for (User u : users) {
                if (u.getId() != null && cfg.getUserIds().contains(u.getId())
                        && Boolean.TRUE.equals(u.getActive())
                        && u.getEmail() != null && EMAIL.matcher(u.getEmail().trim()).matches()) {
                    emails.add(u.getEmail().trim().toLowerCase(Locale.ROOT));
                }
            }
        }
        return new ArrayList<>(emails);
    }

    private List<String> normalizeEmails(List<String> raw) {
        if (raw == null) return new ArrayList<>();
        Set<String> out = new LinkedHashSet<>();
        for (String s : raw) {
            if (s == null) continue;
            for (String part : s.split("[,;\\s]+")) {
                String e = part.trim().toLowerCase(Locale.ROOT);
                if (EMAIL.matcher(e).matches()) out.add(e);
            }
        }
        return new ArrayList<>(out);
    }

    private String employeeLabel(BusinessEmployee e) {
        if (e == null) return "Personal";
        String n = ((e.getNombres() == null ? "" : e.getNombres()) + " " +
                (e.getApellidos() == null ? "" : e.getApellidos())).trim();
        if (n.isBlank() && e.getName() != null) n = e.getName();
        String ced = e.getCedula() == null ? "" : e.getCedula();
        return (n.isBlank() ? "Personal" : n) + (ced.isBlank() ? "" : " · " + ced);
    }

    private String businessName(Business b) {
        if (b.getNameShort() != null && !b.getNameShort().isBlank()) return b.getNameShort();
        return b.getName() != null ? b.getName() : "Empresa";
    }

    private Business requireBusiness(Long businessId) {
        return businessRepository.findById(businessId)
                .orElseThrow(() -> new RuntimeException("Empresa no encontrada"));
    }

    private String buildHtml(Business business, List<ExpiryAlertItemDto> items, String intro) {
        StringBuilder rows = new StringBuilder();
        if (items == null || items.isEmpty()) {
            rows.append("<tr><td colspan='5' style='padding:10px;'>No hay documentos por vencer en este momento.</td></tr>");
        } else {
            for (ExpiryAlertItemDto it : items) {
                String days = it.getDaysLeft() == 0 ? "Hoy" : it.getDaysLeft() + " día(s)";
                rows.append("<tr>")
                        .append("<td style='padding:8px;border-bottom:1px solid #e5e7eb;'>").append(esc(it.getModule())).append("</td>")
                        .append("<td style='padding:8px;border-bottom:1px solid #e5e7eb;'>").append(esc(it.getSubject())).append("</td>")
                        .append("<td style='padding:8px;border-bottom:1px solid #e5e7eb;'>").append(esc(it.getDocument())).append("</td>")
                        .append("<td style='padding:8px;border-bottom:1px solid #e5e7eb;'>")
                        .append(it.getExpiryDate() == null ? "—" : it.getExpiryDate().format(DATE_FMT)).append("</td>")
                        .append("<td style='padding:8px;border-bottom:1px solid #e5e7eb;'>").append(days).append("</td>")
                        .append("</tr>");
            }
        }
        return "<!DOCTYPE html><html><body style='font-family:Arial,sans-serif;color:#111827;'>"
                + "<div style='max-width:720px;margin:0 auto;padding:16px;'>"
                + "<h2 style='color:#0f766e;margin-bottom:8px;'>Avisos de caducidad</h2>"
                + "<p style='margin:0 0 12px 0;'><strong>" + esc(businessName(business)) + "</strong></p>"
                + "<p>" + esc(intro) + "</p>"
                + "<table style='width:100%;border-collapse:collapse;font-size:13px;'>"
                + "<thead><tr style='background:#0f766e;color:#fff;'>"
                + "<th style='padding:8px;text-align:left;'>Módulo</th>"
                + "<th style='padding:8px;text-align:left;'>Referencia</th>"
                + "<th style='padding:8px;text-align:left;'>Documento</th>"
                + "<th style='padding:8px;text-align:left;'>Vence</th>"
                + "<th style='padding:8px;text-align:left;'>Quedan</th>"
                + "</tr></thead><tbody>"
                + rows
                + "</tbody></table>"
                + "<p style='margin-top:24px;font-size:12px;color:#6b7280;'>Improvement Solutions · aviso automático</p>"
                + "</div></body></html>";
    }

    private String esc(String s) {
        if (s == null) return "";
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;");
    }
}
