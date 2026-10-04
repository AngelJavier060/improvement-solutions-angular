package com.improvementsolutions.dto.birthday;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
public class BirthdayGreetingTodayDto {
    private boolean enabled;
    private String message;
    private boolean showPhoto = true;
    private String companyName;
    private String companyLogo;
    private List<BirthdayPersonDto> people = new ArrayList<>();
}
