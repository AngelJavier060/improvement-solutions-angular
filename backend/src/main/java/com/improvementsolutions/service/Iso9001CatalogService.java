package com.improvementsolutions.service;

import com.improvementsolutions.model.Iso9001CatalogItem;
import com.improvementsolutions.repository.Iso9001CatalogItemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Pattern;

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

    /** Catálogos donde el código corto es obligatorio (número de registro SGC). */
    private static final Set<String> CODE_REQUIRED_CATALOGS = Set.of("tipo-documento", "proceso");

    private static final Pattern ITEM_CODE_PATTERN = Pattern.compile("^[A-Z]{2,5}$");

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
        String cc = catalogCode.trim();
        String name = normalizeName(input.getName());
        String code = normalizeItemCode(cc, input.getCode());
        repository.findByCatalogCodeAndName(cc, name).ifPresent(x -> {
            throw new IllegalStateException("DUPLICATE_NAME");
        });
        assertCodeUnique(cc, code, null);
        Iso9001CatalogItem entity = new Iso9001CatalogItem();
        entity.setCatalogCode(cc);
        entity.setCode(code);
        entity.setName(name);
        entity.setDescription(trimToNull(input.getDescription()));
        return repository.save(entity);
    }

    @Transactional
    public Iso9001CatalogItem update(String catalogCode, Long id, Iso9001CatalogItem input) {
        assertCatalogCode(catalogCode);
        String cc = catalogCode.trim();
        Iso9001CatalogItem existing = repository.findByCatalogCodeAndId(cc, id)
                .orElseThrow(() -> new IllegalStateException("NOT_FOUND"));
        String name = normalizeName(input.getName());
        String code = normalizeItemCode(cc, input.getCode());
        if (repository.existsByCatalogCodeAndNameAndIdNot(cc, name, id)) {
            throw new IllegalStateException("DUPLICATE_NAME");
        }
        assertCodeUnique(cc, code, id);
        existing.setName(name);
        existing.setCode(code);
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

    private void assertCodeUnique(String catalogCode, String code, Long excludeId) {
        if (code == null) {
            return;
        }
        if (excludeId == null) {
            repository.findByCatalogCodeAndCodeIgnoreCase(catalogCode, code).ifPresent(x -> {
                throw new IllegalStateException("DUPLICATE_CODE");
            });
        } else if (repository.existsByCatalogCodeAndCodeIgnoreCaseAndIdNot(catalogCode, code, excludeId)) {
            throw new IllegalStateException("DUPLICATE_CODE");
        }
    }

    /**
     * Normaliza el código a mayúsculas (2–5 letras A–Z).
     * Obligatorio en tipo-documento; opcional en el resto.
     */
    private static String normalizeItemCode(String catalogCode, String raw) {
        if (raw == null || raw.isBlank()) {
            if (CODE_REQUIRED_CATALOGS.contains(catalogCode)) {
                throw new IllegalArgumentException("El código es obligatorio (2 a 5 letras, p. ej. PRO, MAN, FOR)");
            }
            return null;
        }
        String code = raw.trim().toUpperCase();
        if (!ITEM_CODE_PATTERN.matcher(code).matches()) {
            throw new IllegalArgumentException("El código debe tener entre 2 y 5 letras (A–Z), sin números ni espacios");
        }
        return code;
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
