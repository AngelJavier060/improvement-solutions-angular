package com.improvementsolutions.config;

import com.improvementsolutions.model.SystemModule;
import com.improvementsolutions.repository.SystemModuleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Ensures the system_modules catalogue is always populated on startup.
 * Uses JPA (not raw SQL) so it works regardless of Flyway migration state.
 */
@Component
@Order(1) // run early
@RequiredArgsConstructor
@Slf4j
public class SystemModuleInitializer implements CommandLineRunner {

    private final SystemModuleRepository systemModuleRepository;

    @Override
    @Transactional
    public void run(String... args) {
        log.info("[SystemModuleInitializer] Verificando catálogo de módulos del sistema...");

        // Módulos core iniciales
        ensureModule("SEGURIDAD_INDUSTRIAL",
                "Seguridad y Salud en el Trabajo",
                "Gestión de seguridad industrial, matriz legal y cumplimiento normativo",
                "fas fa-hard-hat", "#e74c3c", 1);

        ensureModule("TALENTO_HUMANO",
                "Talento Humano",
                "Gestión de empleados, contratos, documentos y certificaciones",
                "fas fa-users", "#3498db", 2);

        // Nuevos módulos funcionales para completar los 8 de la maqueta
        ensureModule("MEDICO",
                "Médico",
                "Servicios médicos y seguimiento de salud ocupacional.",
                "fas fa-stethoscope", "#2ecc71", 3);

        ensureModule("CALIDAD",
                "Calidad",
                "Gestión de calidad, auditorías y mejora continua",
                "fas fa-check-circle", "#27ae60", 4);

        ensureModule("MANTENIMIENTO",
                "Mantenimiento",
                "Gestión de mantenimiento preventivo y correctivo.",
                "fas fa-tools", "#95a5a6", 5);

        ensureModule("MEDIO_AMBIENTE",
                "Medio Ambiente",
                "Gestión ambiental y sostenibilidad empresarial.",
                "fas fa-leaf", "#27ae60", 6);

        ensureModule("PRODUCCION",
                "Producción",
                "Optimización y control de procesos productivos.",
                "fas fa-industry", "#9b59b6", 7);

        ensureModule("INVENTARIO",
                "Inventario",
                "Control de inventario, entradas, salidas y kardex",
                "fas fa-boxes", "#f39c12", 8);

        long count = systemModuleRepository.count();
        log.info("[SystemModuleInitializer] Catálogo listo — {} módulos en system_modules", count);
    }

    private void ensureModule(String code, String name, String description,
                              String icon, String color, int displayOrder) {
        if (systemModuleRepository.findByCode(code).isEmpty()) {
            SystemModule sm = SystemModule.builder()
                    .code(code)
                    .name(name)
                    .description(description)
                    .icon(icon)
                    .color(color)
                    .displayOrder(displayOrder)
                    .active(true)
                    .build();
            systemModuleRepository.save(sm);
            log.info("[SystemModuleInitializer] Módulo creado: {}", code);
        }
    }
}
