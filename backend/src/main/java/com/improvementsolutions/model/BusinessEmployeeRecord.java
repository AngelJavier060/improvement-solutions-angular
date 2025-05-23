package com.improvementsolutions.model;

import java.time.LocalDateTime;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.Column;

import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.FilterDef;
import org.hibernate.annotations.ParamDef;
import org.hibernate.annotations.Filter;

import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.ToString;

@Entity
@Table(name = "business_employee_records")
@Data
@EqualsAndHashCode(exclude = {"businessEmployee"})
@ToString(exclude = {"businessEmployee"})
@SQLDelete(sql = "UPDATE business_employee_records SET active = false WHERE id = ?")
@FilterDef(name = "deletedBusinessEmployeeRecordFilter", parameters = @ParamDef(name = "isDeleted", type = boolean.class))
@Filter(name = "deletedBusinessEmployeeRecordFilter", condition = "active = :isDeleted")
public class BusinessEmployeeRecord {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "business_employee_id")
    private BusinessEmployee businessEmployee;

    @Column(columnDefinition = "TEXT")
    private String recordType;
    
    @Column(columnDefinition = "TEXT")
    private String description;
    
    private LocalDateTime recordDate;
    private String recordedBy;
    private boolean active = true;
}
