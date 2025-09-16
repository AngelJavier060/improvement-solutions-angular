package com.improvementsolutions.util;

import com.improvementsolutions.model.Business;
import com.improvementsolutions.model.User;
import com.improvementsolutions.repository.BusinessRepository;
import com.improvementsolutions.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class DatabaseInspector implements CommandLineRunner {

    private static final Logger logger = LoggerFactory.getLogger(DatabaseInspector.class);

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private BusinessRepository businessRepository;

    @Override
    public void run(String... args) throws Exception {
        if (args.length > 0 && "inspect".equals(args[0])) {
            inspectDatabase();
        }
    }

    public void inspectDatabase() {
        logger.info("=== INSPECCIÓN DE BASE DE DATOS ===");
        
        // Usuarios
        logger.info("\n--- USUARIOS ---");
        List<User> users = userRepository.findAll();
        for (User user : users) {
            logger.info("ID: {}, Username: {}, Email: {}, Name: {}, Active: {}", 
                user.getId(), user.getUsername(), user.getEmail(), user.getName(), user.getActive());
                
            // Empresas del usuario
            if (!user.getBusinesses().isEmpty()) {
                logger.info("  Empresas: ");
                for (Business business : user.getBusinesses()) {
                    logger.info("    - {} ({})", business.getName(), business.getRuc());
                }
            } else {
                logger.info("  Sin empresas asociadas");
            }
        }
        
        // Empresas
        logger.info("\n--- EMPRESAS ---");
        List<Business> businesses = businessRepository.findAll();
        for (Business business : businesses) {
            logger.info("ID: {}, Name: {}, RUC: {}, Email: {}, Active: {}", 
                business.getId(), business.getName(), business.getRuc(), business.getEmail(), business.isActive());
                
            // Usuarios de la empresa
            if (!business.getUsers().isEmpty()) {
                logger.info("  Usuarios: ");
                for (User user : business.getUsers()) {
                    logger.info("    - {} ({})", user.getUsername(), user.getName());
                }
            } else {
                logger.info("  Sin usuarios asociados");
            }
        }
        
        logger.info("=== FIN INSPECCIÓN ===");
    }
}
