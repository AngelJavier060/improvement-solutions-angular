package com.improvementsolutions.model.inventory.enums;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

/** Evita 500 si en BD hay un valor de product_kind que no coincide con el enum. */
@Converter(autoApply = false)
public class ProductCategoryConverter implements AttributeConverter<ProductCategory, String> {
    @Override
    public String convertToDatabaseColumn(ProductCategory attribute) {
        return attribute != null ? attribute.name() : ProductCategory.EPP.name();
    }

    @Override
    public ProductCategory convertToEntityAttribute(String dbData) {
        if (dbData == null || dbData.isBlank()) return ProductCategory.EPP;
        try {
            return ProductCategory.valueOf(dbData.trim().toUpperCase());
        } catch (Exception ignore) {
            String v = dbData.trim().toUpperCase();
            if (v.contains("HERRAMIENT")) return ProductCategory.HERRAMIENTA;
            if (v.contains("PIEZA") || v.contains("REPUESTO")) return ProductCategory.PIEZA;
            return ProductCategory.EPP;
        }
    }
}
