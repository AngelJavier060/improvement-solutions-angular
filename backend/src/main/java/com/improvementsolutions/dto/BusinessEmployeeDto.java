package com.improvementsolutions.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

import java.time.LocalDate;

@Data
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
public class BusinessEmployeeDto extends BaseDto {
    private Long businessId;
    private String firstName;
    private String lastName;
    private String identificationNumber;
    private LocalDate birthdate;
    private String email;
    private String phone;
    private Long genderId;
    private Long civilStatusId;
    private Long ethniaId;
    private Long residentAddressId;
    private Long degreeId;
    private Long departmentId;
    private Long positionId;
    
    // Referencias para presentación
    private String genderName;
    private String civilStatusName;
    private String ethniaName;
    private String residentAddressName;
    private String degreeName;
    private String departmentName;
    private String positionName;
    private String businessName;
}
