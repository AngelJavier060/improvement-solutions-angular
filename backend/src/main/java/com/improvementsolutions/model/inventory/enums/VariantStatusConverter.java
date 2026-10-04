package com.improvementsolutions.model.inventory.enums;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter(autoApply = false)
public class VariantStatusConverter implements AttributeConverter<VariantStatus, String> {
    @Override
    public String convertToDatabaseColumn(VariantStatus attribute) {
        return attribute != null ? attribute.name() : VariantStatus.ACTIVO.name();
    }

    @Override
    public VariantStatus convertToEntityAttribute(String dbData) {
        if (dbData == null || dbData.isBlank()) return VariantStatus.ACTIVO;
        try {
            return VariantStatus.valueOf(dbData.trim().toUpperCase());
        } catch (Exception ignore) {
            return VariantStatus.ACTIVO;
        }
    }
}
