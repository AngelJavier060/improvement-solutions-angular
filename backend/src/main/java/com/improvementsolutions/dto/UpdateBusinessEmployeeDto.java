package com.improvementsolutions.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import com.fasterxml.jackson.annotation.JsonFormat;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * DTO para actualizar un empleado existente
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class UpdateBusinessEmployeeDto {
    
    // ID del empleado (requerido para actualización)
    private Long id;
    
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
    private Long positionId;
    private Long departmentId;
    private Long typeContractId;
    // Empresa contratista y bloque
    private Long contractorCompanyId;
    private Long contractorBlockId;
    
    // Información personal
    private String tipoSangre;
    private Long genderId;
    private Long civilStatusId;
    private Long etniaId;
    private Long degreeId;
    private String nivelEducacion;
    private String discapacidad;
    private String codigoIess;
    
    // Estado
    private Boolean active;
    private String status;
    
    // Imagen
    private String imagePath;
}