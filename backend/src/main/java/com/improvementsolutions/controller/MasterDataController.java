package com.improvementsolutions.controller;

import com.improvementsolutions.model.CivilStatus;
import com.improvementsolutions.model.Degree;
import com.improvementsolutions.model.Department;
import com.improvementsolutions.model.Etnia;
import com.improvementsolutions.model.Gender;
import com.improvementsolutions.model.ObligationMatrix;
import com.improvementsolutions.model.Position;
import com.improvementsolutions.model.ResidentAddress;
import com.improvementsolutions.model.TypeDocument;
import com.improvementsolutions.repository.CivilStatusRepository;
import com.improvementsolutions.repository.DegreeRepository;
import com.improvementsolutions.repository.DepartmentRepository;
import com.improvementsolutions.repository.EtniaRepository;
import com.improvementsolutions.repository.GenderRepository;
import com.improvementsolutions.repository.ObligationMatrixRepository;
import com.improvementsolutions.repository.PositionRepository;
import com.improvementsolutions.repository.ResidentAddressRepository;
import com.improvementsolutions.repository.TypeDocumentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/master-data") // Prefijo /api/ para consistencia
@RequiredArgsConstructor
public class MasterDataController {
    private final GenderRepository genderRepository;
    private final DegreeRepository educationLevelRepository; // Cambiado de EducationLevelRepository
    private final CivilStatusRepository maritalStatusRepository; // Cambiado de MaritalStatusRepository
    private final ResidentAddressRepository residenceTypeRepository; // Cambiado de ResidenceTypeRepository
    private final EtniaRepository ethnicGroupRepository; // Cambiado de EthnicGroupRepository
    private final TypeDocumentRepository documentTypeRepository; // Cambiado de DocumentTypeRepository
    private final DepartmentRepository departmentRepository;
    private final PositionRepository positionRepository;
    private final ObligationMatrixRepository obligationMatrixRepository;

    // Gender
    @GetMapping("/genders")
    public ResponseEntity<List<Gender>> getAllGenders() {
        return ResponseEntity.ok(genderRepository.findAll());
    }

    @GetMapping("/genders/{id}")
    public ResponseEntity<Gender> getGenderById(@PathVariable Long id) {
        return genderRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/genders")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Gender> createGender(@RequestBody Gender gender) {
        if (genderRepository.findByName(gender.getName()).isPresent()) {
            return ResponseEntity.status(HttpStatus.CONFLICT).build();
        }
        gender.setCreatedAt(LocalDateTime.now());
        return ResponseEntity.status(HttpStatus.CREATED).body(genderRepository.save(gender));
    }

    @PutMapping("/genders/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Gender> updateGender(@PathVariable Long id, @RequestBody Gender gender) {
        Optional<Gender> existingGenderOpt = genderRepository.findById(id);
        if (existingGenderOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Gender existingGender = existingGenderOpt.get();
        Optional<Gender> genderWithSameName = genderRepository.findByName(gender.getName());
        if (genderWithSameName.isPresent() && !genderWithSameName.get().getId().equals(id)) {
            return ResponseEntity.status(HttpStatus.CONFLICT).build();
        }

        existingGender.setName(gender.getName());
        existingGender.setUpdatedAt(LocalDateTime.now());
        return ResponseEntity.ok(genderRepository.save(existingGender));
    }

    @DeleteMapping("/genders/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteGender(@PathVariable Long id) {
        if (!genderRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        genderRepository.deleteById(id);
        return ResponseEntity.ok().build();
    }

    // Education Level (ahora Degree)
    @GetMapping("/education-levels")
    public ResponseEntity<List<Degree>> getAllEducationLevels() {
        return ResponseEntity.ok(educationLevelRepository.findAll());
    }

    @GetMapping("/education-levels/{id}")
    public ResponseEntity<Degree> getEducationLevelById(@PathVariable Long id) {
        return educationLevelRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/education-levels")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Degree> createEducationLevel(@RequestBody Degree educationLevel) {
        if (educationLevelRepository.findByName(educationLevel.getName()).isPresent()) {
            return ResponseEntity.status(HttpStatus.CONFLICT).build();
        }
        educationLevel.setCreatedAt(LocalDateTime.now());
        return ResponseEntity.status(HttpStatus.CREATED).body(educationLevelRepository.save(educationLevel));
    }

    @PutMapping("/education-levels/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Degree> updateEducationLevel(@PathVariable Long id, @RequestBody Degree educationLevel) {
        Optional<Degree> existingEducationLevelOpt = educationLevelRepository.findById(id);
        if (existingEducationLevelOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Degree existingEducationLevel = existingEducationLevelOpt.get();
        Optional<Degree> educationLevelWithSameName = educationLevelRepository.findByName(educationLevel.getName());
        if (educationLevelWithSameName.isPresent() && !educationLevelWithSameName.get().getId().equals(id)) {
            return ResponseEntity.status(HttpStatus.CONFLICT).build();
        }

        existingEducationLevel.setName(educationLevel.getName());
        existingEducationLevel.setUpdatedAt(LocalDateTime.now());
        return ResponseEntity.ok(educationLevelRepository.save(existingEducationLevel));
    }

    @DeleteMapping("/education-levels/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteEducationLevel(@PathVariable Long id) {
        if (!educationLevelRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        educationLevelRepository.deleteById(id);
        return ResponseEntity.ok().build();
    }

    // Department
    @GetMapping("/departments")
    public ResponseEntity<List<Department>> getAllDepartments() {
        return ResponseEntity.ok(departmentRepository.findAll());
    }

    @GetMapping("/departments/{id}")
    public ResponseEntity<Department> getDepartmentById(@PathVariable Long id) {
        return departmentRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/departments")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Department> createDepartment(@RequestBody Department department) {
        if (departmentRepository.findByName(department.getName()).isPresent()) {
            return ResponseEntity.status(HttpStatus.CONFLICT).build();
        }
        department.setCreatedAt(LocalDateTime.now());
        return ResponseEntity.status(HttpStatus.CREATED).body(departmentRepository.save(department));
    }

    @PutMapping("/departments/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Department> updateDepartment(@PathVariable Long id, @RequestBody Department department) {
        Optional<Department> existingDepartmentOpt = departmentRepository.findById(id);
        if (existingDepartmentOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Department existingDepartment = existingDepartmentOpt.get();
        Optional<Department> departmentWithSameName = departmentRepository.findByName(department.getName());
        if (departmentWithSameName.isPresent() && !departmentWithSameName.get().getId().equals(id)) {
            return ResponseEntity.status(HttpStatus.CONFLICT).build();
        }

        existingDepartment.setName(department.getName());
        existingDepartment.setUpdatedAt(LocalDateTime.now());
        return ResponseEntity.ok(departmentRepository.save(existingDepartment));
    }

    @DeleteMapping("/departments/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteDepartment(@PathVariable Long id) {
        if (!departmentRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        departmentRepository.deleteById(id);
        return ResponseEntity.ok().build();
    }

    // Position
    @GetMapping("/positions")
    public ResponseEntity<List<Position>> getAllPositions() {
        return ResponseEntity.ok(positionRepository.findAll());
    }

    @GetMapping("/positions/{id}")
    public ResponseEntity<Position> getPositionById(@PathVariable Long id) {
        return positionRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/positions")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Position> createPosition(@RequestBody Position position) {
        if (positionRepository.findByName(position.getName()).isPresent()) {
            return ResponseEntity.status(HttpStatus.CONFLICT).build();
        }
        position.setCreatedAt(LocalDateTime.now());
        return ResponseEntity.status(HttpStatus.CREATED).body(positionRepository.save(position));
    }

    @PutMapping("/positions/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Position> updatePosition(@PathVariable Long id, @RequestBody Position position) {
        Optional<Position> existingPositionOpt = positionRepository.findById(id);
        if (existingPositionOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Position existingPosition = existingPositionOpt.get();
        Optional<Position> positionWithSameName = positionRepository.findByName(position.getName());
        if (positionWithSameName.isPresent() && !positionWithSameName.get().getId().equals(id)) {
            return ResponseEntity.status(HttpStatus.CONFLICT).build();
        }

        existingPosition.setName(position.getName());
        existingPosition.setActive(position.getActive());
        existingPosition.setUpdatedAt(LocalDateTime.now());
        return ResponseEntity.ok(positionRepository.save(existingPosition));
    }

    @DeleteMapping("/positions/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deletePosition(@PathVariable Long id) {
        if (!positionRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        positionRepository.deleteById(id);
        return ResponseEntity.ok().build();
    }
    
    // Los endpoints IESS se han movido a IessController

    // Marital Status (ahora CivilStatus)
    @GetMapping("/marital-status")
    public ResponseEntity<List<CivilStatus>> getAllMaritalStatus() {
        return ResponseEntity.ok(maritalStatusRepository.findAll());
    }

    @GetMapping("/marital-status/{id}")
    public ResponseEntity<CivilStatus> getMaritalStatusById(@PathVariable Long id) {
        return maritalStatusRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/marital-status")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<CivilStatus> createMaritalStatus(@RequestBody CivilStatus maritalStatus) {
        if (maritalStatusRepository.findByName(maritalStatus.getName()).isPresent()) {
            return ResponseEntity.status(HttpStatus.CONFLICT).build();
        }
        maritalStatus.setCreatedAt(LocalDateTime.now());
        return ResponseEntity.status(HttpStatus.CREATED).body(maritalStatusRepository.save(maritalStatus));
    }

    @PutMapping("/marital-status/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<CivilStatus> updateMaritalStatus(@PathVariable Long id, @RequestBody CivilStatus maritalStatus) {
        Optional<CivilStatus> existingMaritalStatusOpt = maritalStatusRepository.findById(id);
        if (existingMaritalStatusOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        CivilStatus existingMaritalStatus = existingMaritalStatusOpt.get();
        Optional<CivilStatus> maritalStatusWithSameName = maritalStatusRepository.findByName(maritalStatus.getName());
        if (maritalStatusWithSameName.isPresent() && !maritalStatusWithSameName.get().getId().equals(id)) {
            return ResponseEntity.status(HttpStatus.CONFLICT).build();
        }

        existingMaritalStatus.setName(maritalStatus.getName());
        existingMaritalStatus.setUpdatedAt(LocalDateTime.now());
        return ResponseEntity.ok(maritalStatusRepository.save(existingMaritalStatus));
    }

    @DeleteMapping("/marital-status/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteMaritalStatus(@PathVariable Long id) {
        if (!maritalStatusRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        maritalStatusRepository.deleteById(id);
        return ResponseEntity.ok().build();
    }

    // Residence Type (ahora ResidentAddress)
    @GetMapping("/residence-types")
    public ResponseEntity<List<ResidentAddress>> getAllResidenceTypes() {
        return ResponseEntity.ok(residenceTypeRepository.findAll());
    }

    @GetMapping("/residence-types/{id}")
    public ResponseEntity<ResidentAddress> getResidenceTypeById(@PathVariable Long id) {
        return residenceTypeRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/residence-types")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ResidentAddress> createResidenceType(@RequestBody ResidentAddress residenceType) {
        if (residenceTypeRepository.findByName(residenceType.getName()).isPresent()) {
            return ResponseEntity.status(HttpStatus.CONFLICT).build();
        }
        residenceType.setCreatedAt(LocalDateTime.now());
        return ResponseEntity.status(HttpStatus.CREATED).body(residenceTypeRepository.save(residenceType));
    }

    @PutMapping("/residence-types/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ResidentAddress> updateResidenceType(@PathVariable Long id, @RequestBody ResidentAddress residenceType) {
        Optional<ResidentAddress> existingResidenceTypeOpt = residenceTypeRepository.findById(id);
        if (existingResidenceTypeOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        ResidentAddress existingResidenceType = existingResidenceTypeOpt.get();
        Optional<ResidentAddress> residenceTypeWithSameName = residenceTypeRepository.findByName(residenceType.getName());
        if (residenceTypeWithSameName.isPresent() && !residenceTypeWithSameName.get().getId().equals(id)) {
            return ResponseEntity.status(HttpStatus.CONFLICT).build();
        }

        existingResidenceType.setName(residenceType.getName());
        existingResidenceType.setUpdatedAt(LocalDateTime.now());
        return ResponseEntity.ok(residenceTypeRepository.save(existingResidenceType));
    }

    @DeleteMapping("/residence-types/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteResidenceType(@PathVariable Long id) {
        if (!residenceTypeRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        residenceTypeRepository.deleteById(id);
        return ResponseEntity.ok().build();
    }

    // Ethnic Group (ahora Etnia)
    @GetMapping("/ethnic-groups")
    public ResponseEntity<List<Etnia>> getAllEthnicGroups() {
        return ResponseEntity.ok(ethnicGroupRepository.findAll());
    }

    @GetMapping("/ethnic-groups/{id}")
    public ResponseEntity<Etnia> getEthnicGroupById(@PathVariable Long id) {
        return ethnicGroupRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/ethnic-groups")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Etnia> createEthnicGroup(@RequestBody Etnia ethnicGroup) {
        if (ethnicGroupRepository.findByName(ethnicGroup.getName()).isPresent()) {
            return ResponseEntity.status(HttpStatus.CONFLICT).build();
        }
        ethnicGroup.setCreatedAt(LocalDateTime.now());
        return ResponseEntity.status(HttpStatus.CREATED).body(ethnicGroupRepository.save(ethnicGroup));
    }

    @PutMapping("/ethnic-groups/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Etnia> updateEthnicGroup(@PathVariable Long id, @RequestBody Etnia ethnicGroup) {
        Optional<Etnia> existingEthnicGroupOpt = ethnicGroupRepository.findById(id);
        if (existingEthnicGroupOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Etnia existingEthnicGroup = existingEthnicGroupOpt.get();
        Optional<Etnia> ethnicGroupWithSameName = ethnicGroupRepository.findByName(ethnicGroup.getName());
        if (ethnicGroupWithSameName.isPresent() && !ethnicGroupWithSameName.get().getId().equals(id)) {
            return ResponseEntity.status(HttpStatus.CONFLICT).build();
        }

        existingEthnicGroup.setName(ethnicGroup.getName());
        existingEthnicGroup.setUpdatedAt(LocalDateTime.now());
        return ResponseEntity.ok(ethnicGroupRepository.save(existingEthnicGroup));
    }

    @DeleteMapping("/ethnic-groups/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteEthnicGroup(@PathVariable Long id) {
        if (!ethnicGroupRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        ethnicGroupRepository.deleteById(id);
        return ResponseEntity.ok().build();
    }

    // Document Type (ahora TypeDocument)
    @GetMapping("/document-types")
    public ResponseEntity<List<TypeDocument>> getAllDocumentTypes() {
        return ResponseEntity.ok(documentTypeRepository.findAll());
    }

    @GetMapping("/document-types/{id}")
    public ResponseEntity<TypeDocument> getDocumentTypeById(@PathVariable Long id) {
        return documentTypeRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/document-types")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<TypeDocument> createDocumentType(@RequestBody TypeDocument documentType) {
        if (documentTypeRepository.findByName(documentType.getName()).isPresent()) {
            return ResponseEntity.status(HttpStatus.CONFLICT).build();
        }
        documentType.setCreatedAt(LocalDateTime.now());
        return ResponseEntity.status(HttpStatus.CREATED).body(documentTypeRepository.save(documentType));
    }

    @PutMapping("/document-types/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<TypeDocument> updateDocumentType(@PathVariable Long id, @RequestBody TypeDocument documentType) {
        Optional<TypeDocument> existingDocumentTypeOpt = documentTypeRepository.findById(id);
        if (existingDocumentTypeOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        TypeDocument existingDocumentType = existingDocumentTypeOpt.get();
        Optional<TypeDocument> documentTypeWithSameName = documentTypeRepository.findByName(documentType.getName());
        if (documentTypeWithSameName.isPresent() && !documentTypeWithSameName.get().getId().equals(id)) {
            return ResponseEntity.status(HttpStatus.CONFLICT).build();
        }

        existingDocumentType.setName(documentType.getName());
        existingDocumentType.setUpdatedAt(LocalDateTime.now());
        return ResponseEntity.ok(documentTypeRepository.save(existingDocumentType));
    }

    @DeleteMapping("/document-types/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteDocumentType(@PathVariable Long id) {
        if (!documentTypeRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        documentTypeRepository.deleteById(id);
        return ResponseEntity.ok().build();
    }

    // Obligation Matrix
    @GetMapping("/obligation-matrices")
    public ResponseEntity<List<ObligationMatrix>> getAllObligationMatrices() {
        return ResponseEntity.ok(obligationMatrixRepository.findAll());
    }

    @GetMapping("/obligation-matrices/{id}")
    public ResponseEntity<ObligationMatrix> getObligationMatrixById(@PathVariable Long id) {
        return obligationMatrixRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
    
    @PostMapping("/obligation-matrices")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ObligationMatrix> createObligationMatrix(@RequestBody ObligationMatrix obligationMatrix) {
        // Validar que el departamento no sea nulo
        if (obligationMatrix.getDepartmentId() == null) {
            return ResponseEntity.badRequest().build();
        }
        obligationMatrix.setCreatedAt(LocalDateTime.now());
        return ResponseEntity.status(HttpStatus.CREATED).body(obligationMatrixRepository.save(obligationMatrix));
    }

    @PutMapping("/obligation-matrices/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ObligationMatrix> updateObligationMatrix(@PathVariable Long id, @RequestBody ObligationMatrix obligationMatrix) {
        Optional<ObligationMatrix> existingObligationMatrixOpt = obligationMatrixRepository.findById(id);
        if (existingObligationMatrixOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        ObligationMatrix existingObligationMatrix = existingObligationMatrixOpt.get();
        existingObligationMatrix.setLegalCompliance(obligationMatrix.getLegalCompliance());
        existingObligationMatrix.setLegalRegulation(obligationMatrix.getLegalRegulation());
        existingObligationMatrix.setDescription(obligationMatrix.getDescription());
        existingObligationMatrix.setDepartmentId(obligationMatrix.getDepartmentId());
        existingObligationMatrix.setUpdatedAt(LocalDateTime.now());
        return ResponseEntity.ok(obligationMatrixRepository.save(existingObligationMatrix));
    }

    @DeleteMapping("/obligation-matrices/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteObligationMatrix(@PathVariable Long id) {
        if (!obligationMatrixRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        obligationMatrixRepository.deleteById(id);
        return ResponseEntity.ok().build();
    }
}
