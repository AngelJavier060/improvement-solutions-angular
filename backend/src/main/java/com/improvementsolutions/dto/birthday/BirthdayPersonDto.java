package com.improvementsolutions.dto.birthday;

import lombok.Data;

@Data
public class BirthdayPersonDto {
    private Long id;
    private String fullName;
    private String firstName;
    private String position;
    private String photo;
    private Integer age;
}
