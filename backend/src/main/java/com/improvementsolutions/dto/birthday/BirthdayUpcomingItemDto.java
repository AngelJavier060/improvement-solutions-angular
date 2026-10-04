package com.improvementsolutions.dto.birthday;

import lombok.Data;

@Data
public class BirthdayUpcomingItemDto {
    private Long id;
    private String fullName;
    private String email;
    private String position;
    private String photo;
    private String birthDayMonth;
    private String nextDate;
    private int daysLeft;
    private Integer ageTurning;
    private String phrase;
    private int emailsSentToday;
    private boolean hasEmail;
}
