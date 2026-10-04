package com.improvementsolutions.dto.inventory;

import java.math.BigDecimal;

public class InventoryVariantListDto {
    public Long id;
    public String code;
    public String description;
    public String generalSpecs;
    public String techSheetPdf;
    public String sizeLabel;
    public String dimensions;
    public BigDecimal currentQty;
    public BigDecimal minQty;
    public BigDecimal unitCost;
    public BigDecimal salePrice;
    public String location;
    public String image;
    public String status;
}
