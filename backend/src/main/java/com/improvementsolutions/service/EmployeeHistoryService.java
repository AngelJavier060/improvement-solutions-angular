package com.improvementsolutions.service;

import com.improvementsolutions.dto.EmployeeHistoryItemDto;
import com.improvementsolutions.model.BusinessEmployee;
import com.improvementsolutions.model.BusinessEmployeeCard;
import com.improvementsolutions.model.BusinessEmployeeCourse;
import com.improvementsolutions.model.BusinessEmployeeDocument;
import com.improvementsolutions.repository.BusinessEmployeeCardRepository;
import com.improvementsolutions.repository.BusinessEmployeeCourseRepository;
import com.improvementsolutions.repository.BusinessEmployeeDocumentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
public class EmployeeHistoryService {

    private final BusinessEmployeeDocumentRepository documentRepository;
    private final BusinessEmployeeCourseRepository courseRepository;
    private final BusinessEmployeeCardRepository cardRepository;

    @Transactional(readOnly = true)
    public List<EmployeeHistoryItemDto> findHistoricByBusinessRuc(String ruc) {
        List<EmployeeHistoryItemDto> items = new ArrayList<>();
        if (ruc == null || ruc.isBlank()) return items;

        for (BusinessEmployeeDocument d : documentRepository.findHistoricByBusinessRuc(ruc.trim())) {
            BusinessEmployee be = d.getBusinessEmployee();
            items.add(EmployeeHistoryItemDto.builder()
                    .id(d.getId())
                    .section("document")
                    .sectionLabel("Documentos personales")
                    .employeeId(be != null ? be.getId() : null)
                    .employeeCedula(be != null ? be.getCedula() : null)
                    .employeeName(employeeName(be))
                    .employeeCode(be != null ? be.getCodigoEmpresa() : null)
                    .typeName(d.getTypeDocument() != null ? d.getTypeDocument().getName() : "Documento")
                    .issueDate(d.getStartDate())
                    .expiryDate(d.getEndDate())
                    .notes(d.getObservations())
                    .files(mapFiles(d.getFiles() == null ? List.of() : d.getFiles().stream()
                            .map(f -> file(f.getId(), f.getFilePath(), f.getFileName(), f.getFileType()))
                            .toList()))
                    .build());
        }

        for (BusinessEmployeeCourse c : courseRepository.findHistoricByBusinessRuc(ruc.trim())) {
            BusinessEmployee be = c.getBusinessEmployee();
            List<String> extra = new ArrayList<>();
            if (c.getHours() != null) extra.add(c.getHours() + " h");
            if (c.getScore() != null && !c.getScore().isBlank()) extra.add("Calif. " + c.getScore());
            items.add(EmployeeHistoryItemDto.builder()
                    .id(c.getId())
                    .section("course")
                    .sectionLabel("Cursos")
                    .employeeId(be != null ? be.getId() : null)
                    .employeeCedula(be != null ? be.getCedula() : null)
                    .employeeName(employeeName(be))
                    .employeeCode(be != null ? be.getCodigoEmpresa() : null)
                    .typeName(c.getCourseCertification() != null ? c.getCourseCertification().getName() : "Curso")
                    .issueDate(c.getIssueDate())
                    .expiryDate(c.getExpiryDate())
                    .notes(c.getObservations())
                    .extra(extra.isEmpty() ? null : String.join(" · ", extra))
                    .files(mapFiles(c.getFiles() == null ? List.of() : c.getFiles().stream()
                            .map(f -> file(f.getId(), f.getFilePath(), f.getFileName(), f.getFileType()))
                            .toList()))
                    .build());
        }

        for (BusinessEmployeeCard c : cardRepository.findHistoricByBusinessRuc(ruc.trim())) {
            BusinessEmployee be = c.getBusinessEmployee();
            items.add(EmployeeHistoryItemDto.builder()
                    .id(c.getId())
                    .section("card")
                    .sectionLabel("Tarjetas")
                    .employeeId(be != null ? be.getId() : null)
                    .employeeCedula(be != null ? be.getCedula() : null)
                    .employeeName(employeeName(be))
                    .employeeCode(be != null ? be.getCodigoEmpresa() : null)
                    .typeName(c.getCard() != null ? c.getCard().getName() : "Tarjeta")
                    .issueDate(c.getIssueDate())
                    .expiryDate(c.getExpiryDate())
                    .notes(c.getObservations())
                    .extra(c.getCardNumber() != null && !c.getCardNumber().isBlank() ? "N.º " + c.getCardNumber() : null)
                    .files(mapFiles(c.getFiles() == null ? List.of() : c.getFiles().stream()
                            .map(f -> file(f.getId(), f.getFilePath(), f.getFileName(), f.getFileType()))
                            .toList()))
                    .build());
        }

        items.sort(Comparator
                .comparing((EmployeeHistoryItemDto it) -> it.getEmployeeName() == null ? "" : it.getEmployeeName(), String.CASE_INSENSITIVE_ORDER)
                .thenComparing(EmployeeHistoryItemDto::getExpiryDate, Comparator.nullsLast(Comparator.reverseOrder())));
        return items;
    }

    private String employeeName(BusinessEmployee be) {
        if (be == null) return "Trabajador";
        String n = ((be.getNombres() == null ? "" : be.getNombres()) + " " +
                (be.getApellidos() == null ? "" : be.getApellidos())).trim();
        if (n.isBlank() && be.getName() != null) n = be.getName();
        return n.isBlank() ? "Trabajador" : n;
    }

    private List<EmployeeHistoryItemDto.FileRef> mapFiles(List<EmployeeHistoryItemDto.FileRef> files) {
        return files == null ? new ArrayList<>() : new ArrayList<>(files);
    }

    private EmployeeHistoryItemDto.FileRef file(Long id, String rel, String fileName, String fileType) {
        String path = rel == null ? "" : rel.replace("\\", "/");
        String dir;
        String name;
        int idx = path.lastIndexOf('/');
        if (idx > 0) {
            dir = path.substring(0, idx);
            name = path.substring(idx + 1);
        } else {
            dir = "";
            name = path;
        }
        String publicUrl = "/api/files/" + (dir.isEmpty() ? name : ("download/" + dir + "/" + name));
        return new EmployeeHistoryItemDto.FileRef(id, publicUrl, fileName != null ? fileName : name, fileType);
    }
}
