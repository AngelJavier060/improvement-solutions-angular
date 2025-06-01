package com.improvementsolutions.dto;

import java.util.List;

import com.improvementsolutions.dto.catalog.TypeDocumentDto;
import com.improvementsolutions.dto.catalog.PositionDto;
import com.improvementsolutions.dto.catalog.TypeContractDto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

@Data
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
public class DTOBusiness extends BaseDto {
    private String ruc;
    private String name;
    private String nameShort; // Equivalente a name_short en Laravel
    private String representativeLegal; // Equivalente a representative_legal en Laravel
    private String tradeName;
    private String commercialActivity;
    private String email;
    private String mainPhone; // Equivalente a phone en Laravel
    private String secondaryPhone;
    private String address;
    private String logo;
    private String webpage;
    private Long userId;
    
    // Referencias para presentación
    private String userName;
    
    // Relaciones
    private List<UserDTO> users;
    private List<BusinessEmployeeDto> employees;    private List<TypeDocumentDto> typeDocuments;
    private List<DepartmentDto> departments;
    private List<PositionDto> positions;
    private List<IessDto> iessItems;
    private List<TypeContractDto> typeContracts;
    private List<BusinessObligationMatrixDto> obligationMatrices;
}
