package com.improvementsolutions.service.inventory;

import java.util.Objects;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.improvementsolutions.model.Business;
import com.improvementsolutions.model.User;
import com.improvementsolutions.repository.BusinessRepository;
import com.improvementsolutions.repository.UserRepository;

@Service
public class InventoryAuthorizationService {

    private final BusinessRepository businessRepository;
    private final UserRepository userRepository;

    public InventoryAuthorizationService(BusinessRepository businessRepository, UserRepository userRepository) {
        this.businessRepository = businessRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public Business requireBusinessForRucAndCurrentUser(String ruc) {
        Business business = businessRepository.findByRuc(ruc)
            .orElseThrow(() -> new IllegalArgumentException("Empresa no encontrada con RUC: " + ruc));

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            throw new AccessDeniedException("No autenticado");
        }

        if (isAdmin(auth)) {
            return business;
        }

        String username = auth.getName();
        User user = userRepository.findByUsername(username)
            .orElseThrow(() -> new AccessDeniedException("Usuario no encontrado: " + username));

        boolean belongs = user.getBusinesses().stream().anyMatch(b -> Objects.equals(b.getId(), business.getId()));
        if (!belongs) {
            throw new AccessDeniedException("El usuario no tiene acceso a la empresa con RUC: " + ruc);
        }
        return business;
    }

    private boolean isAdmin(Authentication auth) {
        for (GrantedAuthority ga : auth.getAuthorities()) {
            String role = ga.getAuthority();
            if ("ROLE_ADMIN".equals(role) || "ADMIN".equals(role)) return true;
        }
        return false;
    }
}
