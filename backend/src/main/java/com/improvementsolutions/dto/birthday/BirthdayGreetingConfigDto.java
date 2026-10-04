package com.improvementsolutions.dto.birthday;

import lombok.Data;

@Data
public class BirthdayGreetingConfigDto {
    private Boolean enabled = Boolean.FALSE;
    private String message;
    private Boolean showPhoto = Boolean.TRUE;
}
