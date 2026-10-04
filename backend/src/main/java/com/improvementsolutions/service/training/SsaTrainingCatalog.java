package com.improvementsolutions.service.training;

import com.improvementsolutions.model.training.TrainingPlanItem;

import java.util.ArrayList;
import java.util.List;

/** Temas SSA del cronograma OrienteOil 2026 (Excel), listos para cualquier empresa Completa. */
public final class SsaTrainingCatalog {

    private SsaTrainingCatalog() {}

    public static List<TrainingPlanItem> seedItems() {
        List<TrainingPlanItem> list = new ArrayList<>();
        int i = 1;
        list.add(item(i++, "Inducción y formación para nuevos empleados", "ALL", "Todas las áreas", "1,2,3,4,5,6,7,8,9,10,11,12", "30 min", 230, "CAPACITACION"));
        list.add(item(i++, "Reglamento interno y políticas de SST", "ALL", "Todas las áreas", "1,2", "1 hora", 230, "CAPACITACION"));
        list.add(item(i++, "Liderazgo y supervisión en prevención de riesgos laborales", "SUPERVISORS", "Supervisores y jefaturas", "2", "1 hora", 10, "CAPACITACION"));
        list.add(item(i++, "Factores de riesgo laborales asociados a la actividad", "ALL", "Todas las áreas", "3", "1 hora", 230, "CAPACITACION"));
        list.add(item(i++, "Gestión de riesgos de fatalidad y controles críticos", "ALL", "Todas las áreas", "4", "1 hora", 230, "CAPACITACION"));
        list.add(item(i++, "Estándares que salvan vidas — gestión de viaje", "DRIVERS", "Conductores", "5", "1 hora", 100, "CAPACITACION"));
        list.add(item(i++, "Estándares que salvan vidas — conducción segura (retroceso)", "DRIVERS", "Conductores", "5", "1 hora", 60, "CAPACITACION"));
        list.add(item(i++, "Reporte de actos y condiciones subestándar (Enapitos / tarjetas PARE)", "ALL", "Todas las áreas", "6", "1 hora", 230, "CAPACITACION"));
        list.add(item(i++, "Uso y cuidado de herramientas manuales", "ALL", "Todas las áreas", "7", "1 hora", 230, "CAPACITACION"));
        list.add(item(i++, "Uso y cuidado de equipos de protección personal (EPP)", "ALL", "Todas las áreas", "8", "1 hora", 230, "CAPACITACION"));
        list.add(item(i++, "Identificación, evaluación y medidas de control ante situaciones de riesgo", "ALL", "Todas las áreas", "10", "1 hora", 230, "CAPACITACION"));
        list.add(item(i++, "Seguridad en trabajos de alto riesgo", "ALL", "Todas las áreas", "11", "1 hora", 230, "CAPACITACION"));
        return list;
    }

    private static TrainingPlanItem item(int order, String name,
                                         String audience, String audienceLabel, String months,
                                         String duration, int planned, String activityType) {
        return TrainingPlanItem.builder()
                .name(name)
                .audienceCode(audience)
                .audienceLabel(audienceLabel)
                .months(months)
                .duration(duration)
                .methodology("Presencial")
                .activityType(activityType)
                .facilitatorType("INTERNO")
                .plannedCount(planned)
                .sortOrder(order)
                .origin("PLANIFICADA")
                .build();
    }
}
