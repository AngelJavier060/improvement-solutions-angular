package com.improvementsolutions.service;

import com.improvementsolutions.dto.EppCatalogDto;
import com.improvementsolutions.model.EppSection;
import com.improvementsolutions.repository.EppSectionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class EppSectionService {

    private final EppSectionRepository repository;

    private EppCatalogDto toDto(EppSection entity) {
        EppCatalogDto dto = new EppCatalogDto();
        dto.setId(entity.getId());
        dto.setName(entity.getName());
        dto.setCode(entity.getCode());
        dto.setDescription(entity.getDescription());
        dto.setActive(entity.getActive());
        dto.setCreatedAt(entity.getCreatedAt());
        dto.setUpdatedAt(entity.getUpdatedAt());
        return dto;
    }

    @Transactional(readOnly = true)
    public List<EppCatalogDto> findAll() {
        return repository.findAllByOrderByNameAsc().stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Optional<EppCatalogDto> findById(Long id) {
        return repository.findById(id).map(this::toDto);
    }

    @Transactional
    public EppCatalogDto create(EppCatalogDto input) {
        String name = requireName(input);
        String code = requireCode(input);
        if (repository.existsByNameIgnoreCaseExcludingId(name, null)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Ya existe un registro con ese nombre");
        }
        if (repository.existsByCodeIgnoreCaseExcludingId(code, null)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Ya existe un registro con ese código");
        }
        EppSection entity = new EppSection();
        entity.setName(name);
        entity.setCode(code);
        entity.setDescription(trimToNull(input.getDescription()));
        entity.setActive(input.getActive() != null ? input.getActive() : true);
        return toDto(repository.save(entity));
    }

    @Transactional
    public Optional<EppCatalogDto> update(Long id, EppCatalogDto input) {
        return repository.findById(id).map(entity -> {
            String name = requireName(input);
            String code = requireCode(input);
            if (repository.existsByNameIgnoreCaseExcludingId(name, id)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Ya existe un registro con ese nombre");
            }
            if (repository.existsByCodeIgnoreCaseExcludingId(code, id)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Ya existe un registro con ese código");
            }
            entity.setName(name);
            entity.setCode(code);
            entity.setDescription(trimToNull(input.getDescription()));
            if (input.getActive() != null) {
                entity.setActive(input.getActive());
            }
            return toDto(repository.save(entity));
        });
    }

    @Transactional
    public boolean delete(Long id) {
        if (!repository.existsById(id)) {
            return false;
        }
        repository.deleteById(id);
        return true;
    }

    private String requireName(EppCatalogDto input) {
        String name = input != null && input.getName() != null ? input.getName().trim() : "";
        if (name.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El nombre es obligatorio");
        }
        if (name.length() > 80) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El nombre no puede superar 80 caracteres");
        }
        return name;
    }

    private String requireCode(EppCatalogDto input) {
        String raw = input != null && input.getCode() != null ? input.getCode().trim().toUpperCase() : "";
        if (raw.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El código es obligatorio");
        }
        if (!raw.matches("^[A-Z0-9]{2,4}$")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "El código debe tener 2 a 4 caracteres (solo letras y números)");
        }
        return raw;
    }

    private String trimToNull(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
