package com.improvementsolutions.dto.birthday;

import lombok.Data;

@Data
public class BirthdaySendResultDto {
    private int sent;
    private int skipped;
    private int failed;
    private String message;
}
