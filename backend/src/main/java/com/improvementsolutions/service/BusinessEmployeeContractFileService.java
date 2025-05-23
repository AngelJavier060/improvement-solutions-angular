package com.improvementsolutions.service;

import com.improvementsolutions.model.BusinessEmployeeContract;
import com.improvementsolutions.model.BusinessEmployeeContractFile;
import com.improvementsolutions.repository.BusinessEmployeeContractFileRepository;
import com.improvementsolutions.repository.BusinessEmployeeContractRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class BusinessEmployeeContractFileService {

    private final BusinessEmployeeContractFileRepository fileRepository;
    private final BusinessEmployeeContractRepository contractRepository;
    private final FileStorageService fileStorageService;
    private final FileUrlService fileUrlService;

    public List<BusinessEmployeeContractFile> findAll() {
        return fileRepository.findAll();
    }

    public Optional<BusinessEmployeeContractFile> findById(Long id) {
        return fileRepository.findById(id);
    }

    public List<BusinessEmployeeContractFile> findByContractId(Long contractId) {
        return fileRepository.findByBusinessEmployeeContractId(contractId);
    }

    @Transactional
    public BusinessEmployeeContractFile uploadFile(Long contractId, MultipartFile file, String description) throws IOException {
        BusinessEmployeeContract contract = contractRepository.findById(contractId)
                .orElseThrow(() -> new RuntimeException("Contrato no encontrado"));

        // Definir subdirectorio para archivos de contrato basado en el ID de la empresa
        String subdirectory = contract.getBusinessEmployee().getBusiness().getId() + "/" + 
                              contract.getBusinessEmployee().getId() + "/contract";

        // Almacenar el archivo y obtener la ruta
        String filePath = fileStorageService.storeFile(file, subdirectory);

        // Crear registro de archivo en la base de datos
        BusinessEmployeeContractFile contractFile = new BusinessEmployeeContractFile();
        contractFile.setBusinessEmployeeContract(contract);
        contractFile.setName(file.getOriginalFilename());
        contractFile.setFile(filePath); // Cambiado de setPath a setFile
        contractFile.setDescription(description);
        contractFile.setCreatedAt(LocalDateTime.now());
        contractFile.setUpdatedAt(LocalDateTime.now());

        return fileRepository.save(contractFile);
    }

    @Transactional
    public BusinessEmployeeContractFile update(Long id, String description) {
        BusinessEmployeeContractFile file = fileRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Archivo no encontrado"));

        file.setDescription(description);
        file.setUpdatedAt(LocalDateTime.now());

        return fileRepository.save(file);
    }

    /**
     * Genera una URL temporal para acceder a un archivo
     */
    public String getTemporaryUrl(Long id, int expirationMinutes) {
        BusinessEmployeeContractFile file = fileRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Archivo no encontrado"));
                
        return fileUrlService.generateTemporaryUrl(file.getFile(), expirationMinutes);
    }

    @Transactional
    public void delete(Long id) {
        BusinessEmployeeContractFile file = fileRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Archivo no encontrado"));

        // Eliminar el archivo físico
        fileStorageService.deleteFile(file.getFile()); // Cambiado de getPath a getFile

        // Eliminar el registro de la base de datos
        fileRepository.delete(file);
    }
}
