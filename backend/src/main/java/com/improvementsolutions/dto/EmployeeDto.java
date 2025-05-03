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
public class EmployeeDto extends BaseDto {
    private Long businessId;
    private Long userId;
    private String identification;
    private String firstName;
    private String lastName;
    private String email;
    private String phone;
    private LocalDate birthDate;
    private Long civilStatusId;
    private Long genderId;
    private Long ethniaId;
    private Long degreeId;
    private String bloodType;
    private String emergencyContactName;
    private String emergencyContactPhone;
    private String photo;
    private Boolean active;
    
    // Referencias para presentación
    private String businessName;
    private String civilStatusName;
    private String genderName;
    private String ethniaName;
    private String degreeName;
    private String userName;
}