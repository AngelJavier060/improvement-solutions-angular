package com.improvementsolutions.dto.business;

import lombok.Data;

@Data
public class BusinessResponseDto {
    private Long id;
    private String name;
    private String nameShort;
    private String ruc;
    private String email;
    private String phone;
    private String address;
    private String sector;
    private String status;
    private String registrationDate;
    private String logoUrl;
    private String description;
    private Boolean active;
    private String createdAt;
    private String updatedAt;
}
