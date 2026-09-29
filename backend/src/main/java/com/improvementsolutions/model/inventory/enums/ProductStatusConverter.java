package com.improvementsolutions.model.inventory.enums;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter(autoApply = false)
public class ProductStatusConverter implements AttributeConverter<ProductStatus, String> {
    @Override
    public String convertToDatabaseColumn(ProductStatus attribute) {
        return attribute != null ? attribute.name() : ProductStatus.ACTIVO.name();
    }

    @Override
    public ProductStatus convertToEntityAttribute(String dbData) {
        if (dbData == null || dbData.isBlank()) return ProductStatus.ACTIVO;
        try {
            return ProductStatus.valueOf(dbData.trim().toUpperCase());
        } catch (Exception ignore) {
            return ProductStatus.ACTIVO;
        }
    }
}
