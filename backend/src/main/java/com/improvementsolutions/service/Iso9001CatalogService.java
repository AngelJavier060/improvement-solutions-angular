package com.improvementsolutions.service;

import com.improvementsolutions.model.Iso9001CatalogItem;
import com.improvementsolutions.repository.Iso9001CatalogItemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class Iso9001CatalogService {

    private static final Set<String> ALLOWED_CATALOG_CODES = Set.of(
            "tipo-documento",
            "proceso",
            "codigo",
            "almacenamiento",
            "disposicion-final"
    );

    private final Iso9001CatalogItemRepository repository;

    public void assertCatalogCode(String catalogCode) {
        if (catalogCode == null || !ALLOWED_CATALOG_CODES.contains(catalogCode.trim())) {
            throw new IllegalArgumentException("Código de catálogo ISO 9001 no válido: " + catalogCode);
        }
    }

    public List<Iso9001CatalogItem> findAllByCatalog(String catalogCode) {
        assertCatalogCode(catalogCode);
        return repository.findByCatalogCodeOrderByIdAsc(catalogCode.trim());
    }

    public Optional<Iso9001CatalogItem> findByCatalogAndId(String catalogCode, Long id) {
        assertCatalogCode(catalogCode);
        return repository.findByCatalogCodeAndId(catalogCode.trim(), id);
    }

    @Transactional
    public Iso9001CatalogItem create(String catalogCode, Iso9001CatalogItem input) {
        assertCatalogCode(catalogCode);
        String name = normalizeName(input.getName());
        repository.findByCatalogCodeAndName(catalogCode, name).ifPresent(x -> {
            throw new IllegalStateException("DUPLICATE_NAME");
        });
        Iso9001CatalogItem entity = new Iso9001CatalogItem();
        entity.setCatalogCode(catalogCode.trim());
        entity.setName(name);
        entity.setDescription(trimToNull(input.getDescription()));
        return repository.save(entity);
    }

    @Transactional
    public Iso9001CatalogItem update(String catalogCode, Long id, Iso9001CatalogItem input) {
        assertCatalogCode(catalogCode);
        Iso9001CatalogItem existing = repository.findByCatalogCodeAndId(catalogCode.trim(), id)
                .orElseThrow(() -> new IllegalStateException("NOT_FOUND"));
        String name = normalizeName(input.getName());
        if (repository.existsByCatalogCodeAndNameAndIdNot(catalogCode.trim(), name, id)) {
            throw new IllegalStateException("DUPLICATE_NAME");
        }
        existing.setName(name);
        existing.setDescription(trimToNull(input.getDescription()));
        return repository.save(existing);
    }

    @Transactional
    public void delete(String catalogCode, Long id) {
        assertCatalogCode(catalogCode);
        Iso9001CatalogItem existing = repository.findByCatalogCodeAndId(catalogCode.trim(), id)
                .orElseThrow(() -> new IllegalStateException("NOT_FOUND"));
        repository.delete(existing);
    }

    private static String normalizeName(String name) {
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("El nombre es obligatorio");
        }
        return name.trim();
    }

    private static String trimToNull(String description) {
        if (description == null || description.isBlank()) {
            return null;
        }
        return description.trim();
    }
}
