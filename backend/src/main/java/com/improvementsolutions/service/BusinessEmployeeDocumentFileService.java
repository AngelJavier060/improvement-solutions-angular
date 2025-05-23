package com.improvementsolutions.service;

import com.improvementsolutions.model.BusinessEmployeeDocument;
import com.improvementsolutions.model.BusinessEmployeeDocumentFile;
import com.improvementsolutions.repository.BusinessEmployeeDocumentFileRepository;
import com.improvementsolutions.repository.BusinessEmployeeDocumentRepository;
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
public class BusinessEmployeeDocumentFileService {

    private final BusinessEmployeeDocumentFileRepository fileRepository;
    private final BusinessEmployeeDocumentRepository documentRepository;
    private final FileStorageService fileStorageService;
    private final FileUrlService fileUrlService;

    public List<BusinessEmployeeDocumentFile> findAll() {
        return fileRepository.findAll();
    }

    public Optional<BusinessEmployeeDocumentFile> findById(Long id) {
        return fileRepository.findById(id);
    }

    public List<BusinessEmployeeDocumentFile> findByDocumentId(Long documentId) {
        return fileRepository.findByBusinessEmployeeDocumentId(documentId);
    }

    @Transactional
    public BusinessEmployeeDocumentFile uploadFile(Long documentId, MultipartFile file, String description) throws IOException {
        BusinessEmployeeDocument document = documentRepository.findById(documentId)
                .orElseThrow(() -> new RuntimeException("Documento no encontrado"));

        // Definir subdirectorio para archivos de documentos basado en el ID de la empresa
        String subdirectory = document.getBusinessEmployee().getBusiness().getId() + "/" + 
                              document.getBusinessEmployee().getId() + "/document";

        // Almacenar el archivo y obtener la ruta
        String filePath = fileStorageService.storeFile(file, subdirectory);

        // Crear registro de archivo en la base de datos
        BusinessEmployeeDocumentFile documentFile = new BusinessEmployeeDocumentFile();
        documentFile.setBusinessEmployeeDocument(document);
        documentFile.setName(file.getOriginalFilename());
        documentFile.setFile(filePath); // Cambiado de setPath a setFile
        documentFile.setDescription(description);
        documentFile.setCreatedAt(LocalDateTime.now());
        documentFile.setUpdatedAt(LocalDateTime.now());

        return fileRepository.save(documentFile);
    }

    @Transactional
    public BusinessEmployeeDocumentFile update(Long id, String description) {
        BusinessEmployeeDocumentFile file = fileRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Archivo no encontrado"));

        file.setDescription(description);
        file.setUpdatedAt(LocalDateTime.now());

        return fileRepository.save(file);
    }

    /**
     * Genera una URL temporal para acceder a un archivo
     */
    public String getTemporaryUrl(Long id, int expirationMinutes) {
        BusinessEmployeeDocumentFile file = fileRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Archivo no encontrado"));
                
        return fileUrlService.generateTemporaryUrl(file.getFile(), expirationMinutes);
    }

    @Transactional
    public void delete(Long id) {
        BusinessEmployeeDocumentFile file = fileRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Archivo no encontrado"));

        // Eliminar el archivo físico
        fileStorageService.deleteFile(file.getFile()); // Cambiado de getPath a getFile

        // Eliminar el registro de la base de datos
        fileRepository.delete(file);
    }
}
