package com.improvementsolutions.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import com.fasterxml.jackson.annotation.JsonFormat;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * DTO para respuesta con información completa del empleado
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class BusinessEmployeeResponseDto {
    // Nombre del cargo (string plano)
    private String position;
    
    // ID y auditoría
    private Long id;
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime createdAt;
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime updatedAt;
    
    // Información básica
    private String cedula;
    private String apellidos;
    private String nombres;
    private String phone;
    private String email;
    
    // Fecha de nacimiento
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime dateBirth;
    
    // Lugar de nacimiento
    private String lugarNacimientoProvincia;
    private String lugarNacimientoCiudad;
    private String lugarNacimientoParroquia;
    
    // Direcciones
    private String address; // Dirección familiar
    private String direccionDomiciliaria;
    
    // Contacto de emergencia
    private String contactName;
    private String contactPhone;
    private String contactKinship;
    
    // Información laboral
    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate fechaIngreso;
    private String codigoEmpresa;
    
    // IDs de relaciones
    private Long businessId;
    private Long positionId;
    private Long departmentId;
    private Long typeContractId;
    private Long genderId;
    private Long civilStatusId;
    private Long etniaId;
    private Long degreeId;
    
    // Información expandida de relaciones
    private String businessName;
    private String positionName;
    private String departmentName;
    private String contractTypeName;
    private String genderName;
    private String civilStatusName;
    private String etniaName;
    private String degreeName;
    
    // Información personal
    private String tipoSangre;
    private Double salario; // Agregado campo salario
    private String nivelEducacion;
    private String discapacidad;
    private String codigoIess;
    
    // Estado
    private Boolean active;
    private String status;
    
    // Imagen
    private String imagePath;
}