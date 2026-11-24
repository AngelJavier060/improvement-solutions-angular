package com.improvementsolutions.config;

import com.improvementsolutions.model.BloodType;
import com.improvementsolutions.repository.BloodTypeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

/**
 * Crea el catálogo general solo si todavía no existe.
 * No asigna tipos a ninguna empresa y no modifica el personal ya guardado.
 */
@Component
@RequiredArgsConstructor
public class BloodTypeCatalogSeed implements ApplicationRunner {

    private final BloodTypeRepository bloodTypeRepository;

    @Override
    public void run(ApplicationArguments args) {
        if (bloodTypeRepository.count() > 0) return;
        String[] names = {"O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"};
        for (String name : names) {
            BloodType type = new BloodType();
            type.setName(name);
            type.setActive(true);
            bloodTypeRepository.save(type);
        }
    }
}
