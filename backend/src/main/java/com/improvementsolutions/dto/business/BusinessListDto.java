package com.improvementsolutions.dto.business;

import com.improvementsolutions.model.Business;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class BusinessListDto {
    private Long id;
    private String name;
    private String ruc;
    private String email;
    private String phone;
    private Boolean active;
    private String logo;

    public static BusinessListDto fromEntity(Business b) {
        if (b == null) return null;
        return new BusinessListDto(
            b.getId(),
            b.getName(),
            b.getRuc(),
            b.getEmail(),
            b.getPhone(),
            b.isActive(),
            b.getLogo()
        );
    }
}
