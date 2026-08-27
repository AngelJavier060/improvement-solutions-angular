package com.improvementsolutions.config;

import com.improvementsolutions.service.EmployeePortalAccountService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

/**
 * Al arrancar, asegura cuentas portal (cédula/cédula) para empleados activos
 * que aún no las tengan. Idempotente; no toca inactivos.
 */
@Component
@Order(40)
@RequiredArgsConstructor
@Slf4j
public class EmployeePortalAccountStartupSync implements CommandLineRunner {

    private final EmployeePortalAccountService portalAccountService;

    @Override
    public void run(String... args) {
        try {
            var summary = portalAccountService.ensureAllActivePortalAccounts();
            log.info("[EmployeePortalStartupSync] processed={}, skipped={}, total={}",
                    summary.processed(), summary.skipped(), summary.total());
        } catch (Exception e) {
            log.warn("[EmployeePortalStartupSync] No se pudo sincronizar cuentas portal: {}", e.getMessage());
        }
    }
}
