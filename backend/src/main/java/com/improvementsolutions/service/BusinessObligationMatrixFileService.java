package com.improvementsolutions.service;

import com.improvementsolutions.model.BusinessObligationMatrix;
import com.improvementsolutions.model.BusinessObligationMatrixFile;
import com.improvementsolutions.repository.BusinessObligationMatrixFileRepository;
import com.improvementsolutions.repository.BusinessObligationMatrixRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class BusinessObligationMatrixFileService {

    private final BusinessObligationMatrixFileRepository fileRepository;
    private final BusinessObligationMatrixRepository matrixRepository;
    private final FileStorageService fileStorageService;

    public List<BusinessObligationMatrixFile> findAll() {
        return fileRepository.findAll();
    }

    public Optional<BusinessObligationMatrixFile> findById(Long id) {
        return fileRepository.findById(id);
    }

    public List<BusinessObligationMatrixFile> findByMatrixId(Long matrixId) {
        return fileRepository.findByBusinessObligationMatrixId(matrixId);
    }

    public List<BusinessObligationMatrixFile> findByMatrixIdAndVersion(Long matrixId, Integer version) {
        return fileRepository.findByBusinessObligationMatrixIdAndVersion(matrixId, version);
    }

    public List<BusinessObligationMatrixFile> findByMatrixIdCurrentVersion(Long matrixId) {
        BusinessObligationMatrix matrix = matrixRepository.findById(matrixId)
                .orElseThrow(() -> new RuntimeException("Matriz de obligaciones no encontrada"));
        Integer v = matrix.getCurrentVersion() != null ? matrix.getCurrentVersion() : 1;
        return fileRepository.findByBusinessObligationMatrixIdAndVersion(matrixId, v);
    }

    @Transactional
    public BusinessObligationMatrixFile uploadFile(Long matrixId, MultipartFile file, String description) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new RuntimeException("Archivo vacío o no provisto");
        }
        BusinessObligationMatrix matrix = matrixRepository.findById(matrixId)
                .orElseThrow(() -> new RuntimeException("Matriz de obligaciones no encontrada (id=" + matrixId + ")"));

        if (matrix.getBusiness() == null || matrix.getBusiness().getId() == null) {
            throw new RuntimeException("La matriz de obligaciones no tiene empresa asociada");
        }

        Long businessId = matrix.getBusiness().getId();
        String subdirectory = businessId + "/obligation_matrix";

        String originalName = file.getOriginalFilename();
        if (originalName == null || originalName.trim().isEmpty()) {
            originalName = "documento";
        }

        log.info("Subiendo archivo de matriz legal: matrixId={}, businessId={}, originalName={}, subdir={}", matrixId, businessId, originalName, subdirectory);

        // Almacenar el archivo y obtener la ruta
        String filePath = fileStorageService.storeFile(file, subdirectory);

        // Crear registro de archivo en la base de datos
        BusinessObligationMatrixFile matrixFile = new BusinessObligationMatrixFile();
        matrixFile.setBusinessObligationMatrix(matrix);
        matrixFile.setName(originalName);
        matrixFile.setPath(filePath);
        // Asociar archivo a la versión actual de la matriz
        try {
            Integer v = matrix.getCurrentVersion();
            matrixFile.setVersion((v != null && v > 0) ? v : 1);
        } catch (Exception ignored) {
            matrixFile.setVersion(1);
        }
        matrixFile.setDescription(description);
        matrixFile.setCreatedAt(LocalDateTime.now());
        matrixFile.setUpdatedAt(LocalDateTime.now());

        BusinessObligationMatrixFile saved = fileRepository.save(matrixFile);
        log.info("Archivo guardado en DB: id={}, path={}", saved.getId(), saved.getPath());
        return saved;
    }

    @Transactional
    public BusinessObligationMatrixFile update(Long id, String description) {
        BusinessObligationMatrixFile file = fileRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Archivo no encontrado"));

        file.setDescription(description);
        file.setUpdatedAt(LocalDateTime.now());

        return fileRepository.save(file);
    }

    @Transactional
    public void delete(Long id) {
        BusinessObligationMatrixFile file = fileRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Archivo no encontrado"));

        // Eliminar el archivo físico
        fileStorageService.deleteFile(file.getPath());

        // Eliminar el registro de la base de datos
        fileRepository.delete(file);
    }

    @Transactional
    public BusinessObligationMatrixFile createFromPath(Long matrixId, String storedRelativePath, String originalName, String description) {
        BusinessObligationMatrix matrix = matrixRepository.findById(matrixId)
                .orElseThrow(() -> new RuntimeException("Matriz de obligaciones no encontrada"));

        BusinessObligationMatrixFile matrixFile = new BusinessObligationMatrixFile();
        matrixFile.setBusinessObligationMatrix(matrix);
        matrixFile.setName(originalName != null ? originalName : "documento");
        matrixFile.setPath(storedRelativePath);
        try {
            Integer v = matrix.getCurrentVersion();
            matrixFile.setVersion((v != null && v > 0) ? v : 1);
        } catch (Exception ignored) {
            matrixFile.setVersion(1);
        }
        matrixFile.setDescription(description);
        matrixFile.setCreatedAt(LocalDateTime.now());
        matrixFile.setUpdatedAt(LocalDateTime.now());
        return fileRepository.save(matrixFile);
    }
}
