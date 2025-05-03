package com.improvementsolutions.service;

import com.improvementsolutions.model.BusinessObligationMatrix;
import com.improvementsolutions.model.BusinessObligationMatrixFile;
import com.improvementsolutions.repository.BusinessObligationMatrixFileRepository;
import com.improvementsolutions.repository.BusinessObligationMatrixRepository;
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

    @Transactional
    public BusinessObligationMatrixFile uploadFile(Long matrixId, MultipartFile file, String description) throws IOException {
        BusinessObligationMatrix matrix = matrixRepository.findById(matrixId)
                .orElseThrow(() -> new RuntimeException("Matriz de obligaciones no encontrada"));

        // Definir subdirectorio para archivos de matrices de obligaciones basado en el ID de la empresa
        String subdirectory = matrix.getBusiness().getId() + "/obligation_matrix";

        // Almacenar el archivo y obtener la ruta
        String filePath = fileStorageService.storeFile(file, subdirectory);

        // Crear registro de archivo en la base de datos
        BusinessObligationMatrixFile matrixFile = new BusinessObligationMatrixFile();
        matrixFile.setBusinessObligationMatrix(matrix);
        matrixFile.setName(file.getOriginalFilename());
        matrixFile.setPath(filePath);
        matrixFile.setDescription(description);
        matrixFile.setCreatedAt(LocalDateTime.now());
        matrixFile.setUpdatedAt(LocalDateTime.now());

        return fileRepository.save(matrixFile);
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
}