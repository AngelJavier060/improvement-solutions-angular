package com.improvementsolutions.dto.inventory;

public class InventoryProductListDto {
    public Long id;
    public String code;
    public String category;
    public String productKind;
    public String sectionCode;
    public String sectionLabel;
    public String name;
    public String description;
    public String unitOfMeasure;
    public String image;
    public String status;
    public CategoryRefDto categoryRef;

    public static class CategoryRefDto {
        public Long id;
        public String name;

        public CategoryRefDto() {}

        public CategoryRefDto(Long id, String name) {
            this.id = id;
            this.name = name;
        }
    }
}
