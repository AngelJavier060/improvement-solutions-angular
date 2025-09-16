package com.improvementsolutions.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import com.fasterxml.jackson.annotation.JsonFormat;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * DTO para crear un nuevo empleado
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateBusinessEmployeeDto {
    
    // Información básica (requerida)
    private String cedula;
    private String apellidos;
    private String nombres;
    private String phone;
    private String email;
    
    // Fecha de nacimiento (requerida)
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime dateBirth;
    
    // Lugar de nacimiento (opcional)
    private String lugarNacimientoProvincia;
    private String lugarNacimientoCiudad;
    private String lugarNacimientoParroquia;
    
    // Direcciones (requerida al menos una)
    private String address; // Dirección familiar
    private String direccionDomiciliaria;
    private String residentAddress; // Dirección de residencia
    
    // Contacto de emergencia (requerido)
    private String contactName;
    private String contactPhone;
    private String contactKinship;
    
    // Información laboral (opcional)
    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate fechaIngreso;
    private String codigoEmpresa;
    private Long businessId; // ID directo de la empresa
    private Long positionId;
    private Long departmentId;
    private Long typeContractId;
    private Double salario; // Agregado campo salario
    
    // Información de empresas contratistas y bloques (opcional)
    private Long contractorCompanyId; // ID de empresa contratista
    private Long contractorBlockId;   // ID de bloque contratista
    
    // Información personal (opcional)
    private String tipoSangre;
    private Long genderId;
    private Long civilStatusId;
    private Long etniaId;
    private Long degreeId;
    private String nivelEducacion; // Mantener por compatibilidad pero se usará degreeId
    private String discapacidad;
    private String codigoIess;
    private String iess; // Campo IESS
    
    // Estado (por defecto activo)
    private Boolean active = true;
    private String status = "ACTIVO";
    
    // Imagen (opcional)
    private String imagePath;
}