package com.improvementsolutions.controller;

import com.improvementsolutions.model.*;
import com.improvementsolutions.repository.BusinessEmployeeRepository;
import com.improvementsolutions.service.EmployeePortalAccountService;
import com.improvementsolutions.service.UserAdminAuthorizationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Cuentas portal trabajador.
 * La creación es automática al registrar el empleado; estos endpoints
 * sirven para re-sincronizar o consultar estado.
 */
@RestController
@RequestMapping("/api/employee-accounts")
@RequiredArgsConstructor
@Slf4j
public class EmployeeAccountController {

    private final BusinessEmployeeRepository businessEmployeeRepository;
    private final UserAdminAuthorizationService authz;
    private final EmployeePortalAccountService portalAccountService;

    @PostMapping("/{businessEmployeeId}/create-account")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'MANAGER')")
    @Transactional
    public ResponseEntity<?> createEmployeeAccount(
            @PathVariable Long businessEmployeeId,
            @RequestBody(required = false) Map<String, String> payload,
            Authentication authentication) {
        try {
            BusinessEmployee be = businessEmployeeRepository.findById(businessEmployeeId)
                    .orElseThrow(() -> new RuntimeException("Empleado no encontrado"));

            Long businessId = be.getBusiness() != null ? be.getBusiness().getId() : null;
            authz.assertCanAccessBusiness(authentication, businessId);

            if (!portalAccountService.isEmployeeActive(be)) {
                return ResponseEntity.badRequest().body(Map.of(
                        "message", "El trabajador está inactivo. No se crea cuenta portal ni acceso al módulo."
                ));
            }

            User saved = portalAccountService.ensurePortalAccount(be);
            if (saved == null) {
                return ResponseEntity.badRequest()
                        .body(Map.of("message", "No se pudo crear la cuenta (empleado inactivo o sin cédula)"));
            }

            String cedula = be.getCedula() != null ? be.getCedula().trim() : saved.getUsername();
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("id", saved.getId());
            body.put("username", saved.getUsername());
            body.put("email", saved.getEmail());
            body.put("name", saved.getName() != null ? saved.getName() : "");
            body.put("message", "Cuenta lista. Usuario y contraseña = cédula (" + cedula
                    + "). Accede a la documentación de todas sus empresas.");
            return ResponseEntity.status(HttpStatus.CREATED).body(body);

        } catch (ResponseStatusException rse) {
            throw rse;
        } catch (RuntimeException e) {
            log.error("Error al crear/sincronizar cuenta de empleado: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/{businessEmployeeId}/has-account")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'MANAGER')")
    public ResponseEntity<Map<String, Object>> hasAccount(
            @PathVariable Long businessEmployeeId,
            Authentication authentication) {
        BusinessEmployee be = businessEmployeeRepository.findById(businessEmployeeId)
                .orElseThrow(() -> new RuntimeException("Empleado no encontrado"));

        Long businessId = be.getBusiness() != null ? be.getBusiness().getId() : null;
        authz.assertCanAccessBusiness(authentication, businessId);

        boolean hasAccount = be.getUser() != null;
        Map<String, Object> result = Map.of(
                "hasAccount", hasAccount,
                "username", hasAccount ? be.getUser().getUsername() : "",
                "userId", hasAccount ? be.getUser().getId() : 0
        );
        return ResponseEntity.ok(result);
    }

    @GetMapping("/business/{businessId}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'MANAGER')")
    public ResponseEntity<?> getEmployeesWithAccountStatus(
            @PathVariable Long businessId,
            Authentication authentication) {
        authz.assertCanAccessBusiness(authentication, businessId);

        var employees = businessEmployeeRepository.findByBusinessId(businessId);
        var result = employees.stream().map(be -> {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("id", be.getId());
            map.put("cedula", be.getCedula());
            map.put("nombres", be.getNombres());
            map.put("apellidos", be.getApellidos());
            map.put("fullName", be.getFullName());
            map.put("email", be.getEmail());
            map.put("phone", be.getPhone());
            map.put("position", be.getPosition());
            map.put("active", be.getActive());
            map.put("status", be.getStatus());
            map.put("hasAccount", be.getUser() != null);
            map.put("username", be.getUser() != null ? be.getUser().getUsername() : null);
            map.put("userId", be.getUser() != null ? be.getUser().getId() : null);
            return map;
        }).collect(java.util.stream.Collectors.toList());

        return ResponseEntity.ok(result);
    }

    /** Re-sincroniza cuentas portal de todos los empleados activos de la empresa. */
    @PostMapping("/business/{businessId}/ensure-all")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'MANAGER')")
    @Transactional
    public ResponseEntity<?> ensureAllAccounts(
            @PathVariable Long businessId,
            Authentication authentication) {
        authz.assertCanAccessBusiness(authentication, businessId);
        var employees = businessEmployeeRepository.findByBusinessId(businessId);
        int ok = 0;
        int skip = 0;
        for (BusinessEmployee be : employees) {
            if (be.getCedula() == null || be.getCedula().isBlank() || !portalAccountService.isEmployeeActive(be)) {
                skip++;
                continue;
            }
            try {
                portalAccountService.ensurePortalAccount(be);
                ok++;
            } catch (Exception e) {
                log.warn("ensure-all falló para empleado {}: {}", be.getId(), e.getMessage());
                skip++;
            }
        }
        return ResponseEntity.ok(Map.of(
                "processed", ok,
                "skipped", skip,
                "message", "Cuentas sincronizadas: " + ok + " (omitidos: " + skip + ")"
        ));
    }

    /**
     * Superadmin / Admin: sincroniza cuentas portal de trabajadores activos
     * en todas las empresas visibles (o todas si es SUPER_ADMIN).
     */
    @PostMapping("/sync-all")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    @Transactional
    public ResponseEntity<?> syncAllActiveAccounts(Authentication authentication) {
        try {
            if (authz.isCompanyAdmin(authentication) && !authz.isSuperAdmin(authentication)) {
                var businessIds = authz.companyBusinessIds(authentication);
                int ok = 0;
                int skip = 0;
                for (Long businessId : businessIds) {
                    var employees = businessEmployeeRepository.findByBusinessId(businessId);
                    for (BusinessEmployee be : employees) {
                        if (be.getCedula() == null || be.getCedula().isBlank()
                                || !portalAccountService.isEmployeeActive(be)) {
                            skip++;
                            continue;
                        }
                        try {
                            portalAccountService.ensurePortalAccount(be);
                            ok++;
                        } catch (Exception e) {
                            log.warn("sync-all falló BE {}: {}", be.getId(), e.getMessage());
                            skip++;
                        }
                    }
                }
                return ResponseEntity.ok(Map.of(
                        "processed", ok,
                        "skipped", skip,
                        "message", "Trabajadores sincronizados: " + ok + " (omitidos: " + skip + ")"
                ));
            }

            var summary = portalAccountService.ensureAllActivePortalAccounts();
            return ResponseEntity.ok(Map.of(
                    "processed", summary.processed(),
                    "skipped", summary.skipped(),
                    "total", summary.total(),
                    "message", "Trabajadores sincronizados: " + summary.processed()
                            + " (omitidos: " + summary.skipped() + ")"
            ));
        } catch (ResponseStatusException rse) {
            throw rse;
        } catch (Exception e) {
            log.error("Error sync-all portal trabajadores: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }
}
