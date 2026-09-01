package com.improvementsolutions.service;

import com.improvementsolutions.dto.EppCatalogDto;
import com.improvementsolutions.model.InventoryOutputType;
import com.improvementsolutions.repository.InventoryOutputTypeRepository;
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
public class InventoryOutputTypeService {

    private final InventoryOutputTypeRepository repository;

    private EppCatalogDto toDto(InventoryOutputType entity) {
        EppCatalogDto dto = new EppCatalogDto();
        dto.setId(entity.getId());
        dto.setName(entity.getName());
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
        if (repository.existsByNameIgnoreCaseExcludingId(name, null)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Ya existe un registro con ese nombre");
        }
        InventoryOutputType entity = new InventoryOutputType();
        entity.setName(name);
        entity.setDescription(trimToNull(input.getDescription()));
        entity.setActive(input.getActive() != null ? input.getActive() : true);
        return toDto(repository.save(entity));
    }

    @Transactional
    public Optional<EppCatalogDto> update(Long id, EppCatalogDto input) {
        return repository.findById(id).map(entity -> {
            String name = requireName(input);
            if (repository.existsByNameIgnoreCaseExcludingId(name, id)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Ya existe un registro con ese nombre");
            }
            entity.setName(name);
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

    private String trimToNull(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
