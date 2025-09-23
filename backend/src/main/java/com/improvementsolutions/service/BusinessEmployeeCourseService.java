package com.improvementsolutions.service;

import com.improvementsolutions.dto.EmployeeCourseResponse;
import com.improvementsolutions.model.*;
import com.improvementsolutions.repository.BusinessEmployeeCourseRepository;
import com.improvementsolutions.repository.BusinessEmployeeRepository;
import com.improvementsolutions.repository.CourseCertificationRepository;
import com.improvementsolutions.storage.StorageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class BusinessEmployeeCourseService {

    private final BusinessEmployeeCourseRepository courseRepository;
    private final BusinessEmployeeRepository businessEmployeeRepository;
    private final CourseCertificationRepository certificationRepository;
    private final StorageService storageService;

    @Transactional(readOnly = true)
    public List<EmployeeCourseResponse> getByBusinessEmployeeId(Long businessEmployeeId, boolean includeHistory) {
        List<BusinessEmployeeCourse> items = courseRepository.findByBusinessEmployeeId(businessEmployeeId);
        return items.stream()
                .filter(x -> includeHistory || x.getActive() == null || Boolean.TRUE.equals(x.getActive()))
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    // Backward compatible overload
    @Transactional(readOnly = true)
    public List<EmployeeCourseResponse> getByBusinessEmployeeId(Long businessEmployeeId) {
        return getByBusinessEmployeeId(businessEmployeeId, false);
    }

    @Transactional
    public EmployeeCourseResponse create(Long businessEmployeeId,
                                         Long courseCertificationId,
                                         LocalDate issueDate,
                                         LocalDate expiryDate,
                                         Integer hours,
                                         String score,
                                         String observations,
                                         List<MultipartFile> files) {
        BusinessEmployee be = businessEmployeeRepository.findById(businessEmployeeId)
                .orElseThrow(() -> new IllegalArgumentException("BusinessEmployee no encontrado: " + businessEmployeeId));
        CourseCertification cert = certificationRepository.findById(courseCertificationId)
                .orElseThrow(() -> new IllegalArgumentException("Curso/Certificación no encontrado: " + courseCertificationId));

        BusinessEmployeeCourse course = new BusinessEmployeeCourse();
        course.setBusinessEmployee(be);
        course.setCourseCertification(cert);
        course.setIssueDate(issueDate);
        course.setExpiryDate(expiryDate);
        course.setHours(hours);
        course.setScore(score);
        course.setObservations(observations);

        // Desactivar registros activos previos del mismo curso
        List<BusinessEmployeeCourse> prevActives = courseRepository
                .findByBusinessEmployeeIdAndCourseCertificationIdAndActiveTrue(be.getId(), cert.getId());
        if (prevActives != null && !prevActives.isEmpty()) {
            for (var p : prevActives) { p.setActive(false); }
            courseRepository.saveAll(prevActives);
        }

        course = courseRepository.save(course);

        if (files != null) {
            for (MultipartFile f : files) {
                if (f != null && !f.isEmpty()) {
                    String storedPath = storeFile("employee-courses", f);
                    BusinessEmployeeCourseFile cf = new BusinessEmployeeCourseFile();
                    cf.setCourse(course);
                    cf.setFilePath(storedPath);
                    cf.setFileName(f.getOriginalFilename());
                    cf.setFileType(f.getContentType());
                    course.getFiles().add(cf);
                }
            }
        }

        course = courseRepository.save(course);
        return toResponse(course);
    }

    @Transactional
    public void delete(Long id) {
        if (!courseRepository.existsById(id)) {
            throw new IllegalArgumentException("Registro de curso no encontrado: " + id);
        }
        courseRepository.deleteById(id);
    }

    private String storeFile(String directory, MultipartFile file) {
        try {
            String originalFilename = file.getOriginalFilename();
            String ext = "";
            if (originalFilename != null && originalFilename.contains(".")) {
                ext = originalFilename.substring(originalFilename.lastIndexOf('.'));
            }
            String unique = java.util.UUID.randomUUID().toString() + ext;
            String stored = storageService.store(directory, file, unique);
            return stored;
        } catch (Exception e) {
            log.error("Error almacenando archivo de curso: {}", e.getMessage());
            throw new RuntimeException("No se pudo almacenar el archivo: " + e.getMessage());
        }
    }

    private EmployeeCourseResponse toResponse(BusinessEmployeeCourse c) {
        EmployeeCourseResponse resp = new EmployeeCourseResponse();
        resp.setId(c.getId());
        resp.setBusiness_employee_id(c.getBusinessEmployee().getId());
        resp.setCourse(new EmployeeCourseResponse.CourseRef(
                c.getCourseCertification().getId(),
                c.getCourseCertification().getName()
        ));
        resp.setIssue_date(c.getIssueDate());
        resp.setExpiry_date(c.getExpiryDate());
        resp.setHours(c.getHours());
        resp.setScore(c.getScore());
        resp.setObservations(c.getObservations());
        resp.setActive(c.getActive());

        List<EmployeeCourseResponse.CourseFileResponse> files = new ArrayList<>();
        if (c.getFiles() != null) {
            for (var f : c.getFiles()) {
                String rel = f.getFilePath();
                String dir = rel;
                String name = rel;
                int idx = rel.lastIndexOf('/');
                if (idx > 0) {
                    dir = rel.substring(0, idx);
                    name = rel.substring(idx + 1);
                } else {
                    dir = "";
                    name = rel;
                }
                String publicUrl = "/api/files/" + (dir.isEmpty() ? name : ("download/" + dir + "/" + name));
                files.add(new EmployeeCourseResponse.CourseFileResponse(
                        f.getId(),
                        publicUrl,
                        f.getFileName(),
                        f.getFileType()
                ));
            }
        }
        resp.setFiles(files);
        return resp;
    }
}
