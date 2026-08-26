package com.improvementsolutions.service;

import com.improvementsolutions.model.Business;
import com.improvementsolutions.model.BusinessEmployee;
import com.improvementsolutions.model.Role;
import com.improvementsolutions.model.User;
import com.improvementsolutions.repository.BusinessEmployeeRepository;
import com.improvementsolutions.repository.RoleRepository;
import com.improvementsolutions.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

/**
 * Cuenta portal del trabajador: usuario = cédula, contraseña = cédula.
 * Solo para empleados ACTIVOS. Si queda inactivo en todas sus empresas,
 * la cuenta portal se desactiva y no puede iniciar sesión.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class EmployeePortalAccountService {

    private final BusinessEmployeeRepository businessEmployeeRepository;
    private final UserRepository userRepository;
    private final UserService userService;
    private final RoleRepository roleRepository;

    /**
     * Asegura cuenta ROLE_EMPLOYEE vinculada al registro BusinessEmployee.
     * No crea ni vincula cuenta si el empleado está inactivo.
     */
    @Transactional
    public User ensurePortalAccount(BusinessEmployee be) {
        if (be == null) {
            throw new IllegalArgumentException("Empleado requerido");
        }
        if (!isEmployeeActive(be)) {
            log.info("Empleado id={} inactivo: no se crea/vincula cuenta portal", be.getId());
            return null;
        }
        String cedula = be.getCedula() != null ? be.getCedula().trim() : "";
        if (!StringUtils.hasText(cedula)) {
            log.warn("Empleado id={} sin cédula: no se crea cuenta portal", be.getId());
            return null;
        }

        if (be.getUser() != null) {
            User linked = be.getUser();
            linked.setActive(true);
            attachBusiness(linked, be.getBusiness());
            syncOtherActiveRecordsSameCedula(cedula, linked);
            userRepository.save(linked);
            return linked;
        }

        // Buscar cuenta existente por cédula (username) o por otro registro del mismo trabajador
        Optional<User> byUsername = userRepository.findByUsername(cedula);
        User user = byUsername.orElse(null);

        if (user == null) {
            List<BusinessEmployee> sameCedula = businessEmployeeRepository.findByCedula(cedula);
            for (BusinessEmployee other : sameCedula) {
                if (other.getUser() != null && isEmployeeActive(other)) {
                    user = other.getUser();
                    break;
                }
            }
        }
        if (user == null) {
            List<BusinessEmployee> sameCedula = businessEmployeeRepository.findByCedula(cedula);
            for (BusinessEmployee other : sameCedula) {
                if (other.getUser() != null) {
                    user = other.getUser();
                    break;
                }
            }
        }

        if (user == null) {
            user = createNewEmployeeUser(be, cedula);
        } else {
            ensureEmployeeRole(user);
            user.setActive(true);
            attachBusiness(user, be.getBusiness());
            userRepository.save(user);
        }

        be.setUser(user);
        businessEmployeeRepository.save(be);
        syncOtherActiveRecordsSameCedula(cedula, user);

        log.info("Portal trabajador listo: cedula={}, userId={}, businessEmployeeId={}",
                cedula, user.getId(), be.getId());
        return user;
    }

    /**
     * Tras activar/desactivar un trabajador: crea cuenta si está activo,
     * o deshabilita el usuario portal si ya no tiene ninguna empresa activa.
     */
    @Transactional
    public void syncPortalAccess(BusinessEmployee be) {
        if (be == null) {
            return;
        }
        if (isEmployeeActive(be)) {
            ensurePortalAccount(be);
            return;
        }

        User user = be.getUser();
        String cedula = be.getCedula() != null ? be.getCedula().trim() : "";
        if (user == null && StringUtils.hasText(cedula)) {
            user = userRepository.findByUsername(cedula).orElse(null);
        }
        if (user == null || !isPureEmployeePortalUser(user)) {
            return;
        }

        List<BusinessEmployee> records = businessEmployeeRepository.findAllByUserId(user.getId());
        if ((records == null || records.isEmpty()) && StringUtils.hasText(cedula)) {
            records = businessEmployeeRepository.findByCedula(cedula);
        }
        boolean anyActive = records != null && records.stream().anyMatch(this::isEmployeeActive);
        if (!anyActive) {
            user.setActive(false);
            userRepository.save(user);
            log.info("Cuenta portal desactivada (sin empresas activas): userId={}, cedula={}",
                    user.getId(), cedula);
        }
    }

    public boolean isEmployeeActive(BusinessEmployee be) {
        if (be == null) {
            return false;
        }
        if (Boolean.FALSE.equals(be.getActive())) {
            return false;
        }
        String status = be.getStatus();
        if (status != null && "INACTIVO".equalsIgnoreCase(status.trim())) {
            return false;
        }
        return be.getActive() == null || Boolean.TRUE.equals(be.getActive())
                || (status != null && "ACTIVO".equalsIgnoreCase(status.trim()));
    }

    /** True si el usuario solo tiene ROLE_EMPLOYEE (portal trabajador). */
    public boolean isPureEmployeePortalUser(User user) {
        if (user == null || user.getRoles() == null || user.getRoles().isEmpty()) {
            return false;
        }
        boolean hasEmployee = false;
        for (Role r : user.getRoles()) {
            if (r == null || r.getName() == null) continue;
            String n = r.getName();
            if ("ROLE_EMPLOYEE".equals(n)) {
                hasEmployee = true;
            } else if ("ROLE_SUPER_ADMIN".equals(n)
                    || "ROLE_ADMIN".equals(n)
                    || "ROLE_MANAGER".equals(n)
                    || "ROLE_USER".equals(n)) {
                return false;
            }
        }
        return hasEmployee;
    }

    private User createNewEmployeeUser(BusinessEmployee be, String cedula) {
        String email = be.getEmail();
        if (!StringUtils.hasText(email)) {
            email = cedula + "@trabajador.local";
        } else {
            email = email.trim();
            // Si el email ya está tomado por otro usuario, usar sintético
            Optional<User> byEmail = userRepository.findByEmail(email);
            if (byEmail.isPresent()) {
                email = cedula + "@trabajador.local";
            }
        }

        User user = new User();
        user.setUsername(cedula);
        user.setPassword(cedula);
        user.setEmail(email);
        user.setName(be.getFullName());
        user.setPhone(be.getPhone());
        user.setActive(true);

        Set<Role> roles = new HashSet<>();
        roles.add(requireEmployeeRole());
        user.setRoles(roles);

        Set<Business> businesses = new HashSet<>();
        if (be.getBusiness() != null) {
            businesses.add(be.getBusiness());
        }
        user.setBusinesses(businesses);

        return userService.create(user);
    }

    private void ensureEmployeeRole(User user) {
        Role emp = requireEmployeeRole();
        if (user.getRoles() == null) {
            user.setRoles(new HashSet<>());
        }
        boolean has = user.getRoles().stream().anyMatch(r -> "ROLE_EMPLOYEE".equals(r.getName()));
        if (!has) {
            user.getRoles().add(emp);
        }
    }

    private Role requireEmployeeRole() {
        return roleRepository.findByName("ROLE_EMPLOYEE")
                .orElseGet(() -> {
                    Role r = new Role();
                    r.setName("ROLE_EMPLOYEE");
                    r.setDescription("Trabajador: consulta documentación de sus empresas");
                    return roleRepository.save(r);
                });
    }

    private void attachBusiness(User user, Business business) {
        if (user == null || business == null) {
            return;
        }
        if (user.getBusinesses() == null) {
            user.setBusinesses(new HashSet<>());
        }
        boolean already = user.getBusinesses().stream()
                .anyMatch(b -> b.getId() != null && b.getId().equals(business.getId()));
        if (!already) {
            user.getBusinesses().add(business);
        }
    }

    /** Vincula registros ACTIVOS con la misma cédula al mismo User y sincroniza empresas. */
    private void syncOtherActiveRecordsSameCedula(String cedula, User user) {
        List<BusinessEmployee> all = businessEmployeeRepository.findByCedula(cedula);
        for (BusinessEmployee row : all) {
            if (!isEmployeeActive(row)) {
                continue;
            }
            if (row.getUser() == null || (row.getUser().getId() != null && !row.getUser().getId().equals(user.getId()))) {
                row.setUser(user);
                businessEmployeeRepository.save(row);
            }
            attachBusiness(user, row.getBusiness());
        }
        userRepository.save(user);
    }
}
