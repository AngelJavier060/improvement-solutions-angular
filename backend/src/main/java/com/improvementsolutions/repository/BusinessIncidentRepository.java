package com.improvementsolutions.repository;

import com.improvementsolutions.model.BusinessIncident;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface BusinessIncidentRepository extends JpaRepository<BusinessIncident, Long> {

    List<BusinessIncident> findByBusiness_IdOrderByIncidentDateDescCreatedAtDesc(Long businessId);

    List<BusinessIncident> findByBusiness_RucOrderByIncidentDateDescCreatedAtDesc(String ruc);

    List<BusinessIncident> findByBusiness_IdAndStatusOrderByIncidentDateDesc(Long businessId, String status);

    @Query("SELECT bi FROM BusinessIncident bi WHERE bi.business.id = :businessId " +
           "AND bi.incidentDate BETWEEN :from AND :to ORDER BY bi.incidentDate DESC")
    List<BusinessIncident> findByBusinessIdAndDateRange(
            @Param("businessId") Long businessId,
            @Param("from") LocalDate from,
            @Param("to") LocalDate to);

    @Query("SELECT COUNT(bi) FROM BusinessIncident bi WHERE bi.business.id = :businessId " +
           "AND MONTH(bi.incidentDate) = MONTH(CURRENT_DATE) AND YEAR(bi.incidentDate) = YEAR(CURRENT_DATE)")
    long countCurrentMonthByBusinessId(@Param("businessId") Long businessId);

    @Query("SELECT COUNT(bi) FROM BusinessIncident bi WHERE bi.business.id = :businessId " +
           "AND bi.status = :status")
    long countByBusinessIdAndStatus(@Param("businessId") Long businessId, @Param("status") String status);

    // Filtrar por tipo de afectación (para talento humano: solo 'Salud y Seguridad')
    List<BusinessIncident> findByBusiness_RucAndAffectationTypeOrderByIncidentDateDescCreatedAtDesc(
            String ruc, String affectationType);

    // Buscar incidentes de seguridad por cédula de persona en un rango de fechas
    @Query("SELECT bi FROM BusinessIncident bi WHERE bi.business.ruc = :ruc " +
           "AND bi.affectationType = 'Salud y Seguridad' " +
           "AND bi.personCedula = :cedula " +
           "AND bi.incidentDate BETWEEN :from AND :to " +
           "ORDER BY bi.incidentDate DESC")
    List<BusinessIncident> findSafetyIncidentsByCedulaAndDateRange(
            @Param("ruc") String ruc,
            @Param("cedula") String cedula,
            @Param("from") LocalDate from,
            @Param("to") LocalDate to);

    // Todos los incidentes de seguridad de un mes para una empresa
    @Query("SELECT bi FROM BusinessIncident bi WHERE bi.business.ruc = :ruc " +
           "AND bi.affectationType = 'Salud y Seguridad' " +
           "AND bi.incidentDate BETWEEN :from AND :to " +
           "ORDER BY bi.incidentDate DESC")
    List<BusinessIncident> findSafetyIncidentsByRucAndDateRange(
            @Param("ruc") String ruc,
            @Param("from") LocalDate from,
            @Param("to") LocalDate to);
}
