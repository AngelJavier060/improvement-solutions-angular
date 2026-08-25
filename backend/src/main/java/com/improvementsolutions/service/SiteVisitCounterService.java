package com.improvementsolutions.service;

import com.improvementsolutions.model.SiteVisitCounter;
import com.improvementsolutions.model.SiteVisitLog;
import com.improvementsolutions.repository.SiteVisitCounterRepository;
import com.improvementsolutions.repository.SiteVisitLogRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class SiteVisitCounterService {

    public static final String LANDING_KEY = "landing_home";
    private static final int SUSPICIOUS_HITS_24H = 40;

    private final SiteVisitCounterRepository repository;
    private final SiteVisitLogRepository logRepository;

    public SiteVisitCounterService(
            SiteVisitCounterRepository repository,
            SiteVisitLogRepository logRepository) {
        this.repository = repository;
        this.logRepository = logRepository;
    }

    @Transactional(readOnly = true)
    public long getTotal(String key) {
        return repository.findByCounterKey(key)
                .map(c -> c.getTotal() == null ? 0L : c.getTotal())
                .orElse(0L);
    }

    @Transactional
    public long increment(String key) {
        ensureExists(key);
        SiteVisitCounter counter = repository.findByCounterKeyForUpdate(key)
                .orElseThrow(() -> new IllegalStateException("No se pudo inicializar el contador"));
        long next = (counter.getTotal() == null ? 0L : counter.getTotal()) + 1L;
        counter.setTotal(next);
        repository.save(counter);
        return next;
    }

    /**
     * Guarda traza técnica de la visita (IP, navegador, idioma, referer).
     * Si falla el log, no debe romper el contador público.
     */
    @Transactional
    public void logVisitSafe(HttpServletRequest request) {
        try {
            SiteVisitLog log = new SiteVisitLog();
            log.setIpAddress(truncate(extractIpAddress(request), 64));
            log.setUserAgent(truncate(request.getHeader("User-Agent"), 512));
            log.setReferer(truncate(request.getHeader("Referer"), 512));
            log.setAcceptLanguage(truncate(request.getHeader("Accept-Language"), 120));
            log.setPath("/landing");
            log.setCreatedAt(LocalDateTime.now());
            logRepository.save(log);
        } catch (Exception ignored) {
            // Auditoría best-effort
        }
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getAdminOverview(int limit) {
        int size = Math.min(Math.max(limit, 1), 200);
        List<SiteVisitLog> logs = logRepository.findAllByOrderByCreatedAtDesc(PageRequest.of(0, size));
        LocalDateTime since = LocalDateTime.now().minusHours(24);

        List<Map<String, Object>> items = new ArrayList<>();
        for (SiteVisitLog log : logs) {
            Map<String, Object> row = new HashMap<>();
            row.put("id", log.getId());
            row.put("ipAddress", log.getIpAddress());
            row.put("userAgent", log.getUserAgent());
            row.put("referer", log.getReferer());
            row.put("acceptLanguage", log.getAcceptLanguage());
            row.put("path", log.getPath());
            row.put("createdAt", log.getCreatedAt());
            long hits24h = log.getIpAddress() == null
                    ? 0L
                    : logRepository.countByIpAddressAndCreatedAtAfter(log.getIpAddress(), since);
            row.put("hitsLast24h", hits24h);
            row.put("suspicious", hits24h >= SUSPICIOUS_HITS_24H);
            items.add(row);
        }

        Map<String, Object> body = new HashMap<>();
        body.put("totalVisits", getTotal(LANDING_KEY));
        body.put("uniqueIpsLast24h", logRepository.countDistinctIpsSince(since));
        body.put("recent", items);
        return body;
    }

    private void ensureExists(String key) {
        if (repository.findByCounterKey(key).isPresent()) {
            return;
        }
        try {
            SiteVisitCounter created = new SiteVisitCounter();
            created.setCounterKey(key);
            created.setTotal(0L);
            repository.saveAndFlush(created);
        } catch (DataIntegrityViolationException ignored) {
            // Otra petición lo creó en paralelo
        }
    }

    private String extractIpAddress(HttpServletRequest request) {
        String forwardedFor = request.getHeader("X-Forwarded-For");
        if (forwardedFor != null && !forwardedFor.isEmpty()) {
            return forwardedFor.split(",")[0].trim();
        }
        String realIp = request.getHeader("X-Real-IP");
        if (realIp != null && !realIp.isEmpty()) {
            return realIp.trim();
        }
        return request.getRemoteAddr();
    }

    private String truncate(String value, int max) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        if (trimmed.isEmpty()) {
            return null;
        }
        return trimmed.length() <= max ? trimmed : trimmed.substring(0, max);
    }
}
