package com.improvementsolutions.controller;

import com.improvementsolutions.model.*;
import com.improvementsolutions.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/master-data") // IMPORTANTE: No incluir /api/v1 porque ya está configurado en server.servlet.context-path
@RequiredArgsConstructor
public class MasterDataController {

    private final CivilStatusRepository civilStatusRepository;
    private final DegreeRepository degreeRepository;
    private final EthniaRepository ethniaRepository;
    private final GenderRepository genderRepository;
    private final PositionRepository positionRepository;
    private final ResidentAddressRepository residentAddressRepository;
    private final TypeContractRepository typeContractRepository;
    private final TypeDocumentRepository typeDocumentRepository;
    private final DepartmentRepository departmentRepository;
    private final ObligationMatrixRepository obligationMatrixRepository;

    // Civil Status
    @GetMapping("/civil-status")
    public ResponseEntity<List<CivilStatus>> getAllCivilStatus() {
        return ResponseEntity.ok(civilStatusRepository.findAll());
    }

    @GetMapping("/civil-status/{id}")
    public ResponseEntity<CivilStatus> getCivilStatusById(@PathVariable Long id) {
        return civilStatusRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/civil-status")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<CivilStatus> createCivilStatus(@RequestBody CivilStatus civilStatus) {
        civilStatus.setCreatedAt(LocalDateTime.now());
        civilStatus.setUpdatedAt(LocalDateTime.now());
        return new ResponseEntity<>(civilStatusRepository.save(civilStatus), HttpStatus.CREATED);
    }

    @PutMapping("/civil-status/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<CivilStatus> updateCivilStatus(@PathVariable Long id, @RequestBody CivilStatus civilStatusDetails) {
        return civilStatusRepository.findById(id)
                .map(civilStatus -> {
                    civilStatus.setName(civilStatusDetails.getName());
                    civilStatus.setUpdatedAt(LocalDateTime.now());
                    return ResponseEntity.ok(civilStatusRepository.save(civilStatus));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/civil-status/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteCivilStatus(@PathVariable Long id) {
        return civilStatusRepository.findById(id)
                .map(civilStatus -> {
                    civilStatusRepository.delete(civilStatus);
                    return ResponseEntity.ok().<Void>build();
                })
                .orElse(ResponseEntity.notFound().build());
    }

    // Degree
    @GetMapping("/degrees")
    public ResponseEntity<List<Degree>> getAllDegrees() {
        return ResponseEntity.ok(degreeRepository.findAll());
    }

    @GetMapping("/degrees/{id}")
    public ResponseEntity<Degree> getDegreeById(@PathVariable Long id) {
        return degreeRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/degrees")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Degree> createDegree(@RequestBody Degree degree) {
        degree.setCreatedAt(LocalDateTime.now());
        degree.setUpdatedAt(LocalDateTime.now());
        return new ResponseEntity<>(degreeRepository.save(degree), HttpStatus.CREATED);
    }

    @PutMapping("/degrees/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Degree> updateDegree(@PathVariable Long id, @RequestBody Degree degreeDetails) {
        return degreeRepository.findById(id)
                .map(degree -> {
                    degree.setName(degreeDetails.getName());
                    degree.setUpdatedAt(LocalDateTime.now());
                    return ResponseEntity.ok(degreeRepository.save(degree));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/degrees/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteDegree(@PathVariable Long id) {
        return degreeRepository.findById(id)
                .map(degree -> {
                    degreeRepository.delete(degree);
                    return ResponseEntity.ok().<Void>build();
                })
                .orElse(ResponseEntity.notFound().build());
    }

    // Etnia
    @GetMapping("/ethnias")
    public ResponseEntity<List<Etnia>> getAllEthnias() {
        return ResponseEntity.ok(ethniaRepository.findAll());
    }

    @GetMapping("/ethnias/{id}")
    public ResponseEntity<Etnia> getEthniaById(@PathVariable Long id) {
        return ethniaRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/ethnias")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Etnia> createEthnia(@RequestBody Etnia etnia) {
        etnia.setCreatedAt(LocalDateTime.now());
        etnia.setUpdatedAt(LocalDateTime.now());
        return new ResponseEntity<>(ethniaRepository.save(etnia), HttpStatus.CREATED);
    }

    @PutMapping("/ethnias/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Etnia> updateEthnia(@PathVariable Long id, @RequestBody Etnia etniaDetails) {
        return ethniaRepository.findById(id)
                .map(etnia -> {
                    etnia.setName(etniaDetails.getName());
                    etnia.setUpdatedAt(LocalDateTime.now());
                    return ResponseEntity.ok(ethniaRepository.save(etnia));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/ethnias/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteEthnia(@PathVariable Long id) {
        return ethniaRepository.findById(id)
                .map(etnia -> {
                    ethniaRepository.delete(etnia);
                    return ResponseEntity.ok().<Void>build();
                })
                .orElse(ResponseEntity.notFound().build());
    }

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
        gender.setCreatedAt(LocalDateTime.now());
        gender.setUpdatedAt(LocalDateTime.now());
        return new ResponseEntity<>(genderRepository.save(gender), HttpStatus.CREATED);
    }

    @PutMapping("/genders/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Gender> updateGender(@PathVariable Long id, @RequestBody Gender genderDetails) {
        return genderRepository.findById(id)
                .map(gender -> {
                    gender.setName(genderDetails.getName());
                    gender.setUpdatedAt(LocalDateTime.now());
                    return ResponseEntity.ok(genderRepository.save(gender));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/genders/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteGender(@PathVariable Long id) {
        return genderRepository.findById(id)
                .map(gender -> {
                    genderRepository.delete(gender);
                    return ResponseEntity.ok().<Void>build();
                })
                .orElse(ResponseEntity.notFound().build());
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
        position.setCreatedAt(LocalDateTime.now());
        position.setUpdatedAt(LocalDateTime.now());
        return new ResponseEntity<>(positionRepository.save(position), HttpStatus.CREATED);
    }

    @PutMapping("/positions/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Position> updatePosition(@PathVariable Long id, @RequestBody Position positionDetails) {
        return positionRepository.findById(id)
                .map(position -> {
                    position.setName(positionDetails.getName());
                    position.setUpdatedAt(LocalDateTime.now());
                    return ResponseEntity.ok(positionRepository.save(position));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/positions/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deletePosition(@PathVariable Long id) {
        return positionRepository.findById(id)
                .map(position -> {
                    positionRepository.delete(position);
                    return ResponseEntity.ok().<Void>build();
                })
                .orElse(ResponseEntity.notFound().build());
    }

    // Resident Address
    @GetMapping("/resident-addresses")
    public ResponseEntity<List<ResidentAddress>> getAllResidentAddresses() {
        return ResponseEntity.ok(residentAddressRepository.findAll());
    }

    @GetMapping("/resident-addresses/{id}")
    public ResponseEntity<ResidentAddress> getResidentAddressById(@PathVariable Long id) {
        return residentAddressRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/resident-addresses")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ResidentAddress> createResidentAddress(@RequestBody ResidentAddress residentAddress) {
        residentAddress.setCreatedAt(LocalDateTime.now());
        residentAddress.setUpdatedAt(LocalDateTime.now());
        return new ResponseEntity<>(residentAddressRepository.save(residentAddress), HttpStatus.CREATED);
    }

    @PutMapping("/resident-addresses/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ResidentAddress> updateResidentAddress(@PathVariable Long id, @RequestBody ResidentAddress residentAddressDetails) {
        return residentAddressRepository.findById(id)
                .map(residentAddress -> {
                    residentAddress.setName(residentAddressDetails.getName());
                    residentAddress.setUpdatedAt(LocalDateTime.now());
                    return ResponseEntity.ok(residentAddressRepository.save(residentAddress));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/resident-addresses/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteResidentAddress(@PathVariable Long id) {
        return residentAddressRepository.findById(id)
                .map(residentAddress -> {
                    residentAddressRepository.delete(residentAddress);
                    return ResponseEntity.ok().<Void>build();
                })
                .orElse(ResponseEntity.notFound().build());
    }

    // Type Contract
    @GetMapping("/type-contracts")
    public ResponseEntity<List<TypeContract>> getAllTypeContracts() {
        return ResponseEntity.ok(typeContractRepository.findAll());
    }

    @GetMapping("/type-contracts/{id}")
    public ResponseEntity<TypeContract> getTypeContractById(@PathVariable Long id) {
        return typeContractRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/type-contracts")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<TypeContract> createTypeContract(@RequestBody TypeContract typeContract) {
        typeContract.setCreatedAt(LocalDateTime.now());
        typeContract.setUpdatedAt(LocalDateTime.now());
        return new ResponseEntity<>(typeContractRepository.save(typeContract), HttpStatus.CREATED);
    }

    @PutMapping("/type-contracts/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<TypeContract> updateTypeContract(@PathVariable Long id, @RequestBody TypeContract typeContractDetails) {
        return typeContractRepository.findById(id)
                .map(typeContract -> {
                    typeContract.setName(typeContractDetails.getName());
                    typeContract.setUpdatedAt(LocalDateTime.now());
                    return ResponseEntity.ok(typeContractRepository.save(typeContract));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/type-contracts/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteTypeContract(@PathVariable Long id) {
        return typeContractRepository.findById(id)
                .map(typeContract -> {
                    typeContractRepository.delete(typeContract);
                    return ResponseEntity.ok().<Void>build();
                })
                .orElse(ResponseEntity.notFound().build());
    }

    // Type Document
    @GetMapping("/type-documents")
    public ResponseEntity<List<TypeDocument>> getAllTypeDocuments() {
        return ResponseEntity.ok(typeDocumentRepository.findAll());
    }

    @GetMapping("/type-documents/{id}")
    public ResponseEntity<TypeDocument> getTypeDocumentById(@PathVariable Long id) {
        return typeDocumentRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/type-documents")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<TypeDocument> createTypeDocument(@RequestBody TypeDocument typeDocument) {
        typeDocument.setCreatedAt(LocalDateTime.now());
        typeDocument.setUpdatedAt(LocalDateTime.now());
        return new ResponseEntity<>(typeDocumentRepository.save(typeDocument), HttpStatus.CREATED);
    }

    @PutMapping("/type-documents/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<TypeDocument> updateTypeDocument(@PathVariable Long id, @RequestBody TypeDocument typeDocumentDetails) {
        return typeDocumentRepository.findById(id)
                .map(typeDocument -> {
                    typeDocument.setName(typeDocumentDetails.getName());
                    typeDocument.setUpdatedAt(LocalDateTime.now());
                    return ResponseEntity.ok(typeDocumentRepository.save(typeDocument));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/type-documents/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteTypeDocument(@PathVariable Long id) {
        return typeDocumentRepository.findById(id)
                .map(typeDocument -> {
                    typeDocumentRepository.delete(typeDocument);
                    return ResponseEntity.ok().<Void>build();
                })
                .orElse(ResponseEntity.notFound().build());
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
        department.setCreatedAt(LocalDateTime.now());
        department.setUpdatedAt(LocalDateTime.now());
        return new ResponseEntity<>(departmentRepository.save(department), HttpStatus.CREATED);
    }

    @PutMapping("/departments/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Department> updateDepartment(@PathVariable Long id, @RequestBody Department departmentDetails) {
        return departmentRepository.findById(id)
                .map(department -> {
                    department.setName(departmentDetails.getName());
                    department.setUpdatedAt(LocalDateTime.now());
                    return ResponseEntity.ok(departmentRepository.save(department));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/departments/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteDepartment(@PathVariable Long id) {
        return departmentRepository.findById(id)
                .map(department -> {
                    departmentRepository.delete(department);
                    return ResponseEntity.ok().<Void>build();
                })
                .orElse(ResponseEntity.notFound().build());
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
        obligationMatrix.setCreatedAt(LocalDateTime.now());
        obligationMatrix.setUpdatedAt(LocalDateTime.now());
        return new ResponseEntity<>(obligationMatrixRepository.save(obligationMatrix), HttpStatus.CREATED);
    }

    @PutMapping("/obligation-matrices/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ObligationMatrix> updateObligationMatrix(@PathVariable Long id, @RequestBody ObligationMatrix obligationMatrixDetails) {
        return obligationMatrixRepository.findById(id)
                .map(obligationMatrix -> {
                    obligationMatrix.setName(obligationMatrixDetails.getName());
                    obligationMatrix.setUpdatedAt(LocalDateTime.now());
                    return ResponseEntity.ok(obligationMatrixRepository.save(obligationMatrix));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/obligation-matrices/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteObligationMatrix(@PathVariable Long id) {
        return obligationMatrixRepository.findById(id)
                .map(obligationMatrix -> {
                    obligationMatrixRepository.delete(obligationMatrix);
                    return ResponseEntity.ok().<Void>build();
                })
                .orElse(ResponseEntity.notFound().build());
    }
}
