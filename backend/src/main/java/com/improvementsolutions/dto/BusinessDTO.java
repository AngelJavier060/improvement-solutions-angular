package com.improvementsolutions.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class BusinessDTO {
    private Long id;
    private String ruc;
    private String name;
    private String nameShort;
    private String representativeLegal;
    private String tradeName;
    private String commercialActivity;
    private String email;
    private String mainPhone;
    private String secondaryPhone;
    private String address;
    private String logo;
    private String webpage;
}
