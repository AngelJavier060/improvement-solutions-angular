package com.improvementsolutions.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@Order(41)
@RequiredArgsConstructor
@Slf4j
public class TrainingPlanSchemaGuard implements CommandLineRunner {

    private final JdbcTemplate jdbc;

    @Override
    @Transactional
    public void run(String... args) {
        try {
            createPlan();
            ensurePlanColumns();
            createItem();
            ensureItemColumns();
            dropUnusedItemColumns();
            createSession();
            ensureSessionColumns();
            createAttendance();
            sanitizeItemNames();
            defaultItemTypes();
            removeCatalogSeedDrills();
            removeUnusedCatalogSeeds();
            clearCatalogHeadcount();
        } catch (Exception e) {
            log.warn("[TrainingPlanGuard] No se pudo asegurar el esquema: {}", e.getMessage());
        }
    }

    private boolean table(String name) {
        Boolean exists = jdbc.queryForObject(
                "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=?)",
                Boolean.class, name);
        return Boolean.TRUE.equals(exists);
    }

    private void createPlan() {
        if (table("training_annual_plan")) return;
        jdbc.execute("CREATE TABLE training_annual_plan (" +
                " id BIGSERIAL PRIMARY KEY," +
                " business_id BIGINT NOT NULL REFERENCES businesses(id)," +
                " year INTEGER NOT NULL," +
                " program VARCHAR(20) NOT NULL," +
                " status VARCHAR(20) NOT NULL," +
                " closed_at TIMESTAMP," +
                " created_at TIMESTAMP," +
                " updated_at TIMESTAMP," +
                " CONSTRAINT uk_training_plan_biz_year_prog UNIQUE (business_id, year, program)" +
                ")");
        log.info("[TrainingPlanGuard] Tabla training_annual_plan creada.");
    }

    private void ensurePlanColumns() {
        if (!table("training_annual_plan")) return;
        addCol("training_annual_plan", "approval_status", "VARCHAR(20)");
        addCol("training_annual_plan", "approved_file", "VARCHAR(400)");
        addCol("training_annual_plan", "approved_at", "TIMESTAMP");
        addCol("training_annual_plan", "approved_by", "VARCHAR(80)");
    }

    private void createItem() {
        if (table("training_plan_item")) return;
        jdbc.execute("CREATE TABLE training_plan_item (" +
                " id BIGSERIAL PRIMARY KEY," +
                " plan_id BIGINT NOT NULL REFERENCES training_annual_plan(id) ON DELETE CASCADE," +
                " name VARCHAR(400) NOT NULL," +
                " audience_code VARCHAR(30)," +
                " audience_label VARCHAR(120)," +
                " months VARCHAR(40)," +
                " duration VARCHAR(40)," +
                " methodology VARCHAR(80)," +
                " planned_count INTEGER," +
                " sort_order INTEGER," +
                " origin VARCHAR(20) NOT NULL" +
                ")");
        log.info("[TrainingPlanGuard] Tabla training_plan_item creada.");
    }

    private void ensureItemColumns() {
        if (!table("training_plan_item")) return;
        addCol("training_plan_item", "description", "VARCHAR(800)");
        addCol("training_plan_item", "activity_type", "VARCHAR(40)");
        addCol("training_plan_item", "facilitator_type", "VARCHAR(40)");
        addCol("training_plan_item", "place", "VARCHAR(160)");
        addCol("training_plan_item", "materials", "VARCHAR(400)");
        addCol("training_plan_item", "facilitator", "VARCHAR(160)");
        addCol("training_plan_item", "evidence_pdf", "VARCHAR(400)");
        addCol("training_plan_item", "evidence_photos", "VARCHAR(1200)");
    }

    private void dropUnusedItemColumns() {
        if (!table("training_plan_item")) return;
        dropCol("training_plan_item", "code");
        dropCol("training_plan_item", "theme_code");
        dropCol("training_plan_item", "department");
    }

    private void addCol(String tableName, String col, String type) {
        Boolean exists = jdbc.queryForObject(
                "SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=? AND column_name=?)",
                Boolean.class, tableName, col);
        if (Boolean.TRUE.equals(exists)) return;
        jdbc.execute("ALTER TABLE " + tableName + " ADD COLUMN " + col + " " + type);
        log.info("[TrainingPlanGuard] Columna {}.{} agregada.", tableName, col);
    }

    private void dropCol(String tableName, String col) {
        Boolean exists = jdbc.queryForObject(
                "SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=? AND column_name=?)",
                Boolean.class, tableName, col);
        if (!Boolean.TRUE.equals(exists)) return;
        jdbc.execute("ALTER TABLE " + tableName + " DROP COLUMN IF EXISTS " + col);
        log.info("[TrainingPlanGuard] Columna {}.{} eliminada.", tableName, col);
    }

    private void createSession() {
        if (table("training_session")) return;
        jdbc.execute("CREATE TABLE training_session (" +
                " id BIGSERIAL PRIMARY KEY," +
                " business_id BIGINT NOT NULL," +
                " plan_id BIGINT NOT NULL REFERENCES training_annual_plan(id) ON DELETE CASCADE," +
                " item_id BIGINT NOT NULL REFERENCES training_plan_item(id) ON DELETE CASCADE," +
                " session_date DATE NOT NULL," +
                " place VARCHAR(160)," +
                " hours INTEGER," +
                " facilitator VARCHAR(160)," +
                " notes VARCHAR(500)," +
                " origin VARCHAR(20)," +
                " created_by VARCHAR(80)," +
                " created_at TIMESTAMP" +
                ")");
        log.info("[TrainingPlanGuard] Tabla training_session creada.");
    }

    private void ensureSessionColumns() {
        if (!table("training_session")) return;
        addCol("training_session", "evidence_file", "VARCHAR(400)");
        addCol("training_session", "evidence_photos", "VARCHAR(1200)");
    }

    private void sanitizeItemNames() {
        if (!table("training_plan_item")) return;
        int n = jdbc.update(
                "UPDATE training_plan_item SET name = 'Inducción y formación para nuevos empleados' " +
                        "WHERE name LIKE 'Inducción y formación para nuevos empleados%' " +
                        "AND name <> 'Inducción y formación para nuevos empleados'");
        if (n > 0) {
            log.info("[TrainingPlanGuard] Se corrigió el sufijo numérico en {} tema(s) de inducción.", n);
        }
    }

    private void defaultItemTypes() {
        if (!table("training_plan_item")) return;
        int drills = jdbc.update(
                "UPDATE training_plan_item SET activity_type = 'SIMULACRO' " +
                        "WHERE (activity_type IS NULL OR activity_type = 'ENTRENAMIENTO') " +
                        "AND UPPER(name) LIKE '%SIMULACRO%'");
        int capac = jdbc.update(
                "UPDATE training_plan_item SET activity_type = 'CAPACITACION' WHERE activity_type IS NULL");
        int fac = jdbc.update(
                "UPDATE training_plan_item SET facilitator_type = 'INTERNO' WHERE facilitator_type IS NULL");
        if (drills + capac + fac > 0) {
            log.info("[TrainingPlanGuard] Tipos por defecto: {} simulacro, {} capacitación, {} facilitador interno.",
                    drills, capac, fac);
        }
    }

    /** No se plantan por catálogo: la empresa los registra con tipo Simulacro. */
    private void removeCatalogSeedDrills() {
        if (!table("training_plan_item")) return;
        int n = jdbc.update(
                "DELETE FROM training_plan_item WHERE UPPER(BTRIM(name)) IN (" +
                        "'SIMULACRO PARA CONTROL DE INCENDIOS'," +
                        "'SIMULACRO DE ACTUACIÓN ANTE UNA EMERGENCIA DE INCENDIO'," +
                        "'SIMULACRO DE ACTUACION ANTE UNA EMERGENCIA DE INCENDIO')");
        if (n > 0) {
            log.info("[TrainingPlanGuard] Se quitaron {} simulacro(s) de catálogo. La empresa los registra en el formulario.", n);
        }
    }

    /** El cronograma se arma al ingresar temas; no se dejan módulos de plantilla sin registrar. */
    private void removeUnusedCatalogSeeds() {
        if (!table("training_plan_item")) return;
        boolean hasSessions = table("training_session");
        String sessionGuard = hasSessions
                ? "AND NOT EXISTS (SELECT 1 FROM training_session s WHERE s.item_id = training_plan_item.id) "
                : "";
        int n = jdbc.update(
                "DELETE FROM training_plan_item WHERE (origin IS NULL OR origin <> 'EVENTUAL') " +
                        "AND (facilitator IS NULL OR BTRIM(facilitator) = '') " +
                        "AND (place IS NULL OR BTRIM(place) = '') " +
                        "AND (description IS NULL OR BTRIM(description) = '') " +
                        sessionGuard +
                        "AND name IN (" +
                        "'Inducción y formación para nuevos empleados'," +
                        "'Reglamento interno y políticas de SST'," +
                        "'Liderazgo y supervisión en prevención de riesgos laborales'," +
                        "'Factores de riesgo laborales asociados a la actividad'," +
                        "'Gestión de riesgos de fatalidad y controles críticos'," +
                        "'Estándares que salvan vidas — gestión de viaje'," +
                        "'Estándares que salvan vidas — conducción segura (retroceso)'," +
                        "'Reporte de actos y condiciones subestándar (Enapitos / tarjetas PARE)'," +
                        "'Uso y cuidado de herramientas manuales'," +
                        "'Uso y cuidado de equipos de protección personal (EPP)'," +
                        "'Identificación, evaluación y medidas de control ante situaciones de riesgo'," +
                        "'Seguridad en trabajos de alto riesgo')");
        if (n > 0) {
            log.info("[TrainingPlanGuard] Se quitaron {} tema(s) de plantilla no ingresados al cronograma.", n);
        }
    }

    /** El 230 (y cupos de plantilla) no son de la empresa: se calcula con Talento Humano. */
    private void clearCatalogHeadcount() {
        if (!table("training_plan_item")) return;
        int n = jdbc.update("UPDATE training_plan_item SET planned_count = NULL WHERE planned_count IN (230, 100, 60)");
        if (n > 0) {
            log.info("[TrainingPlanGuard] Se limpió el cupo de plantilla en {} tema(s).", n);
        }
    }

    private void createAttendance() {
        if (table("training_attendance")) return;
        jdbc.execute("CREATE TABLE training_attendance (" +
                " id BIGSERIAL PRIMARY KEY," +
                " session_id BIGINT NOT NULL REFERENCES training_session(id) ON DELETE CASCADE," +
                " employee_id BIGINT NOT NULL," +
                " present BOOLEAN NOT NULL," +
                " score VARCHAR(40)," +
                " CONSTRAINT uk_training_att_session_emp UNIQUE (session_id, employee_id)" +
                ")");
        log.info("[TrainingPlanGuard] Tabla training_attendance creada.");
    }
}
