package com.improvementsolutions.dto.training;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
public class TrainingYearDto {
    private int year;
    private boolean current;
    private String status;
    private boolean canWrite;
    private String program;
    private String companyName;
    private String companyShort;
    private String legalRepresentative;
    private String logoUrl;
    private String ruc;
    private String docCode;
    private String revisionDate;
    private String version = "01";
    private String approvalStatus;
    private String approvedFile;
    private String approvedAt;
    private String approvedBy;
    /** Encabezado del registro ISO tomado del documento de Calidad de esta empresa. */
    private String registerName;
    private String registerCode;
    private String registerProcess;
    private String registerApprovedBy;
    private String registerDate;
    private String registerVersion;
    private int obligatedTotal;
    private int trainedTotal;
    private int percent;
    private int sessionCount;
    private int overdueTopics;
    private List<Integer> availableYears = new ArrayList<>();
    private List<TrainingItemDto> items = new ArrayList<>();
    private TrainingCensusDto census;
    private String info;
}
