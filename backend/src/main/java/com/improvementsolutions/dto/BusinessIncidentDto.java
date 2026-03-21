package com.improvementsolutions.dto;

import lombok.*;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BusinessIncidentDto {

    private Long id;
    private Long businessId;
    private String businessName;
    private String businessRuc;

    // Sección 1: Datos Específicos
    private String affectationType;
    private LocalDate incidentDate;
    private LocalTime incidentTime;
    private String location;
    private String personnelType;
    private String companyName;

    // Sección 2: Personal
    private String personName;
    private String personCedula;
    private String personPosition;
    private String personArea;
    private Integer personAge;
    private String personGender;
    private String personShift;
    private String personExperience;

    // Sección 3: Detalles del Evento
    private String title;
    private String description;
    private String eventClassification;

    // Sección 4: Mitigación
    private String mitigationActions;

    // Sección 5: Investigación y Criterios
    private Boolean isHighPotential;
    private Boolean isCriticalEnap;
    private Boolean isFatal;
    private Boolean requiresResuscitation;
    private Boolean requiresRescue;
    private Boolean fallOver2m;
    private Boolean involvesAmputation;
    private Boolean affectsNormalTask;
    private Boolean isCollective;
    private String lifeRuleViolated;
    private String apiLevel;
    private String hasOccurredBefore;
    private String investigationLevel;

    // Sección 6: Comentarios y Evidencia
    private String preliminaryComments;
    private String controlMeasures;

    // Sección 7: Generación del Informe
    private String reportedBy;     // Elaborado por
    private LocalDate reportDate;  // Fecha del reporte
    private String reviewedBy;     // Revisado por
    private String approvedBy;     // Aprobado por

    // Evidencias (rutas de archivos subidos)
    private List<String> evidenceFiles;

    // Estado
    private String status;

    // Auditoría
    private String createdBy;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
