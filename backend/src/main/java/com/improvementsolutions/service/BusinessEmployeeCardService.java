package com.improvementsolutions.service;

import com.improvementsolutions.dto.EmployeeCardResponse;
import com.improvementsolutions.model.*;
import com.improvementsolutions.repository.BusinessEmployeeCardRepository;
import com.improvementsolutions.repository.BusinessEmployeeRepository;
import com.improvementsolutions.repository.CardCatalogRepository;
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
public class BusinessEmployeeCardService {

    private final BusinessEmployeeCardRepository cardRepository;
    private final BusinessEmployeeRepository businessEmployeeRepository;
    private final CardCatalogRepository cardCatalogRepository;
    private final StorageService storageService;

    @Transactional(readOnly = true)
    public List<EmployeeCardResponse> getByBusinessEmployeeId(Long businessEmployeeId) {
        List<BusinessEmployeeCard> items = cardRepository.findByBusinessEmployeeId(businessEmployeeId);
        return items.stream()
                .filter(x -> x.getActive() == null || Boolean.TRUE.equals(x.getActive()))
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public EmployeeCardResponse create(Long businessEmployeeId,
                                       Long cardId,
                                       String cardNumber,
                                       LocalDate issueDate,
                                       LocalDate expiryDate,
                                       String observations,
                                       List<MultipartFile> files) {
        BusinessEmployee be = businessEmployeeRepository.findById(businessEmployeeId)
                .orElseThrow(() -> new IllegalArgumentException("BusinessEmployee no encontrado: " + businessEmployeeId));
        CardCatalog card = cardCatalogRepository.findById(cardId)
                .orElseThrow(() -> new IllegalArgumentException("Tarjeta no encontrada: " + cardId));

        BusinessEmployeeCard rec = new BusinessEmployeeCard();
        rec.setBusinessEmployee(be);
        rec.setCard(card);
        rec.setCardNumber(cardNumber);
        rec.setIssueDate(issueDate);
        rec.setExpiryDate(expiryDate);
        rec.setObservations(observations);

        // Desactivar tarjetas activas previas del mismo tipo
        List<BusinessEmployeeCard> prevActives = cardRepository
                .findByBusinessEmployeeIdAndCardIdAndActiveTrue(be.getId(), card.getId());
        if (prevActives != null && !prevActives.isEmpty()) {
            for (var p : prevActives) { p.setActive(false); }
            cardRepository.saveAll(prevActives);
        }

        rec = cardRepository.save(rec);

        if (files != null) {
            for (MultipartFile f : files) {
                if (f != null && !f.isEmpty()) {
                    String storedPath = storeFile("employee-cards", f);
                    BusinessEmployeeCardFile cf = new BusinessEmployeeCardFile();
                    cf.setCard(rec);
                    cf.setFilePath(storedPath);
                    cf.setFileName(f.getOriginalFilename());
                    cf.setFileType(f.getContentType());
                    rec.getFiles().add(cf);
                }
            }
        }

        rec = cardRepository.save(rec);
        return toResponse(rec);
    }

    @Transactional
    public void delete(Long id) {
        if (!cardRepository.existsById(id)) {
            throw new IllegalArgumentException("Registro de tarjeta no encontrado: " + id);
        }
        cardRepository.deleteById(id);
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
            log.error("Error almacenando archivo de tarjeta: {}", e.getMessage());
            throw new RuntimeException("No se pudo almacenar el archivo: " + e.getMessage());
        }
    }

    private EmployeeCardResponse toResponse(BusinessEmployeeCard c) {
        EmployeeCardResponse resp = new EmployeeCardResponse();
        resp.setId(c.getId());
        resp.setBusiness_employee_id(c.getBusinessEmployee().getId());
        resp.setCard(new EmployeeCardResponse.CardRef(
                c.getCard().getId(),
                c.getCard().getName()
        ));
        resp.setCard_number(c.getCardNumber());
        resp.setIssue_date(c.getIssueDate());
        resp.setExpiry_date(c.getExpiryDate());
        resp.setObservations(c.getObservations());
        resp.setActive(c.getActive());

        List<EmployeeCardResponse.CardFileResponse> files = new ArrayList<>();
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
                files.add(new EmployeeCardResponse.CardFileResponse(
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
