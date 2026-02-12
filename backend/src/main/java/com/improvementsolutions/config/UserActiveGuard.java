package com.improvementsolutions.config;

import com.improvementsolutions.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Safety net: runs AFTER all other initializers and forces
 * every user in the DB to is_active = true.
 * This prevents the recurring 403 "Usuario inactivo" on login
 * caused by the dual-column (active / is_active) schema issue.
 */
@Component
@Order(999)
@RequiredArgsConstructor
@Slf4j
public class UserActiveGuard implements CommandLineRunner {

    private final UserRepository userRepository;

    @Override
    @Transactional
    public void run(String... args) {
        long fixed = 0;
        var users = userRepository.findAll();
        for (var user : users) {
            if (user.getActive() == null || !user.getActive()) {
                log.warn("[UserActiveGuard] Usuario '{}' (id={}) tenía is_active={}. Corrigiendo a TRUE.",
                        user.getUsername(), user.getId(), user.getActive());
                user.setActive(true);
                userRepository.save(user);
                fixed++;
            }
        }
        if (fixed > 0) {
            log.info("[UserActiveGuard] Corregidos {} usuario(s) con is_active incorrecto", fixed);
        } else {
            log.info("[UserActiveGuard] Todos los usuarios tienen is_active=true. OK.");
        }
    }
}
