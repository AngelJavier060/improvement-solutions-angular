package com.improvementsolutions.service;

import com.improvementsolutions.model.Business;
import com.improvementsolutions.model.Role;
import com.improvementsolutions.model.User;
import com.improvementsolutions.repository.BusinessRepository;
import com.improvementsolutions.repository.RoleRepository;
import com.improvementsolutions.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Reglas de autorización para /api/admin/users (Fase B).
 *
 * - Superadministrador: privilegios intactos; no se crea/edita/elimina ROLE_SUPER_ADMIN aquí.
 * - Admin de empresa: solo gestiona usuarios de su(s) empresa(s); solo puede asignar ROLE_USER.
 * - Trabajador (ROLE_EMPLOYEE): editable en datos básicos; no se cambia su rol desde esta API.
 */
@Service
@RequiredArgsConstructor
public class UserAdminAuthorizationService {

    public static final String ROLE_SUPER_ADMIN = "ROLE_SUPER_ADMIN";
    public static final String ROLE_ADMIN = "ROLE_ADMIN";
    public static final String ROLE_USER = "ROLE_USER";
    public static final String ROLE_EMPLOYEE = "ROLE_EMPLOYEE";
    /** Gestor operativo: escribe docs/operación; no es Admin de parámetros */
    public static final String ROLE_MANAGER = "ROLE_MANAGER";

    private final UserRepository userRepository;
    private final BusinessRepository businessRepository;
    private final RoleRepository roleRepository;

    public boolean isSuperAdmin(Authentication authentication) {
        return hasAuthority(authentication, ROLE_SUPER_ADMIN);
    }

    /** Admin de empresa: ROLE_ADMIN sin ROLE_SUPER_ADMIN */
    public boolean isCompanyAdmin(Authentication authentication) {
        return hasAuthority(authentication, ROLE_ADMIN) && !isSuperAdmin(authentication);
    }

    @Transactional(readOnly = true)
    public User requireCurrentUser(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            throw forbidden("No autenticado");
        }
        return userRepository.findByUsername(authentication.getName())
                .orElseThrow(() -> forbidden("Usuario autenticado no encontrado"));
    }

    @Transactional(readOnly = true)
    public Set<Long> companyBusinessIds(Authentication authentication) {
        User current = requireCurrentUser(authentication);
        List<Business> businesses = businessRepository.findBusinessesByUserId(current.getId());
        if (businesses == null || businesses.isEmpty()) {
            return Collections.emptySet();
        }
        return businesses.stream()
                .map(Business::getId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
    }

    @Transactional(readOnly = true)
    public void assertCanAccessBusiness(Authentication authentication, Long businessId) {
        if (isSuperAdmin(authentication)) {
            return;
        }
        if (!isCompanyAdmin(authentication)) {
            throw forbidden("No autorizado");
        }
        Set<Long> mine = companyBusinessIds(authentication);
        if (businessId == null || !mine.contains(businessId)) {
            throw forbidden("Solo puedes gestionar usuarios de tu empresa");
        }
    }

    /**
     * Lectura: Super ve todo (excepto que filtramos supers en listados de company admin).
     * Company admin: solo usuarios de su empresa; nunca Superadministradores.
     */
    @Transactional(readOnly = true)
    public void assertCanViewUser(Authentication authentication, User target) {
        if (target == null) {
            throw notFound("Usuario no encontrado");
        }
        if (isSuperAdmin(authentication)) {
            return;
        }
        if (!isCompanyAdmin(authentication)) {
            throw forbidden("No autorizado");
        }
        if (hasRole(target, ROLE_SUPER_ADMIN)) {
            throw forbidden("No puedes gestionar Superadministradores");
        }
        if (!sharesBusiness(authentication, target)) {
            throw forbidden("El usuario no pertenece a tu empresa");
        }
    }

    /**
     * Mutación (update/delete/toggle/foto):
     * - Nadie gestiona Superadmin desde esta API.
     * - Company admin no muta otros Admin ni Super; sí USER (Supervisor), MANAGER (Gestor) y EMPLOYEE de su empresa.
     */
    @Transactional(readOnly = true)
    public void assertCanMutateUser(Authentication authentication, User target) {
        assertCanViewUser(authentication, target);

        if (hasRole(target, ROLE_SUPER_ADMIN)) {
            throw forbidden("Los Superadministradores no se gestionan desde esta API");
        }

        if (isCompanyAdmin(authentication) && hasRole(target, ROLE_ADMIN)) {
            throw forbidden("No puedes modificar administradores de empresa");
        }
    }

    @Transactional(readOnly = true)
    public List<User> filterVisibleUsers(Authentication authentication, List<User> users) {
        if (users == null) {
            return Collections.emptyList();
        }
        if (isSuperAdmin(authentication)) {
            return users;
        }
        Set<Long> mine = companyBusinessIds(authentication);
        return users.stream()
                .filter(u -> !hasRole(u, ROLE_SUPER_ADMIN))
                .filter(u -> userBelongsToAnyBusiness(u, mine))
                .collect(Collectors.toList());
    }

    /**
     * Roles permitidos al crear.
     * - Super: ROLE_USER (Supervisor), ROLE_MANAGER (Gestor) o ROLE_ADMIN.
     * - Company admin: ROLE_USER o ROLE_MANAGER de su empresa (nunca ADMIN/SUPER/EMPLOYEE).
     */
    @Transactional(readOnly = true)
    public Set<Role> resolveRolesForCreate(Authentication authentication, Set<Long> requestedRoleIds) {
        Role userRole = requireRole(ROLE_USER);
        Role adminRole = requireRole(ROLE_ADMIN);
        Role managerRole = requireRole(ROLE_MANAGER);

        if (isCompanyAdmin(authentication)) {
            if (requestedRoleIds == null || requestedRoleIds.isEmpty()) {
                return Set.of(userRole);
            }
            Set<Role> requested = resolveRolesByIds(requestedRoleIds);
            boolean wantsManager = requested.stream().anyMatch(r -> ROLE_MANAGER.equals(r.getName()));
            boolean triesEscalation = requested.stream().anyMatch(r ->
                    ROLE_ADMIN.equals(r.getName())
                            || ROLE_SUPER_ADMIN.equals(r.getName())
                            || ROLE_EMPLOYEE.equals(r.getName()));
            if (triesEscalation) {
                throw forbidden("Solo puedes crear Supervisor (consulta) o Gestor operativo");
            }
            boolean onlyAllowed = requested.stream().allMatch(r ->
                    ROLE_USER.equals(r.getName()) || ROLE_MANAGER.equals(r.getName()));
            if (!onlyAllowed) {
                throw forbidden("Rol no permitido para administrador de empresa");
            }
            return wantsManager ? Set.of(managerRole) : Set.of(userRole);
        }

        if (!isSuperAdmin(authentication)) {
            throw forbidden("No autorizado para crear usuarios");
        }

        if (requestedRoleIds == null || requestedRoleIds.isEmpty()) {
            return Set.of(userRole);
        }

        Set<Role> requested = resolveRolesByIds(requestedRoleIds);
        for (Role r : requested) {
            String name = r.getName();
            if (ROLE_SUPER_ADMIN.equals(name)) {
                throw forbidden("No se puede asignar Superadministrador desde esta API");
            }
            if (ROLE_EMPLOYEE.equals(name)) {
                throw forbidden("Las cuentas de Trabajador se crean desde Talento Humano / cuentas de empleado");
            }
            if (!ROLE_ADMIN.equals(name) && !ROLE_USER.equals(name) && !ROLE_MANAGER.equals(name)) {
                throw forbidden("Rol no permitido: " + name);
            }
        }

        boolean wantsAdmin = requested.stream().anyMatch(r -> ROLE_ADMIN.equals(r.getName()));
        if (wantsAdmin) {
            return Set.of(adminRole);
        }
        boolean wantsManager = requested.stream().anyMatch(r -> ROLE_MANAGER.equals(r.getName()));
        return wantsManager ? Set.of(managerRole) : Set.of(userRole);
    }

    /**
     * Valida cambios de rol en update.
     * - Company admin: solo USER o MANAGER.
     * - Super: USER, MANAGER o ADMIN; nunca SUPER_ADMIN / EMPLOYEE.
     */
    @Transactional(readOnly = true)
    public void assertRoleChangeAllowed(Authentication authentication, User target, Set<Long> requestedRoleIds) {
        if (requestedRoleIds == null || requestedRoleIds.isEmpty()) {
            return;
        }
        if (hasRole(target, ROLE_SUPER_ADMIN)) {
            throw forbidden("No se pueden cambiar roles de un Superadministrador");
        }
        if (hasRole(target, ROLE_EMPLOYEE)) {
            throw forbidden("No se puede cambiar el rol de una cuenta de Trabajador desde esta API");
        }

        Set<Role> requested = resolveRolesByIds(requestedRoleIds);

        if (isCompanyAdmin(authentication)) {
            boolean onlyOps = requested.stream().allMatch(r ->
                    ROLE_USER.equals(r.getName()) || ROLE_MANAGER.equals(r.getName()));
            if (!onlyOps || requested.isEmpty()) {
                throw forbidden("Solo puedes asignar Supervisor (consulta) o Gestor operativo");
            }
            return;
        }

        if (isSuperAdmin(authentication)) {
            for (Role r : requested) {
                String name = r.getName();
                if (ROLE_SUPER_ADMIN.equals(name) || ROLE_EMPLOYEE.equals(name)) {
                    throw forbidden("Rol no asignable desde esta API: " + name);
                }
                if (!ROLE_ADMIN.equals(name) && !ROLE_USER.equals(name) && !ROLE_MANAGER.equals(name)) {
                    throw forbidden("Rol no permitido: " + name);
                }
            }
            return;
        }

        throw forbidden("No autorizado");
    }

    private Role requireRole(String name) {
        return roleRepository.findByName(name)
                .orElseThrow(() -> new IllegalStateException("Rol " + name + " no encontrado"));
    }

    @Transactional(readOnly = true)
    public boolean sharesBusiness(Authentication authentication, User target) {
        Set<Long> mine = companyBusinessIds(authentication);
        return userBelongsToAnyBusiness(target, mine);
    }

    private boolean userBelongsToAnyBusiness(User user, Set<Long> businessIds) {
        if (user == null || businessIds == null || businessIds.isEmpty()) {
            return false;
        }
        // Preferir consulta por repositorio para evitar LAZY issues
        List<Business> targetBusinesses = businessRepository.findBusinessesByUserId(user.getId());
        if (targetBusinesses == null || targetBusinesses.isEmpty()) {
            return false;
        }
        return targetBusinesses.stream()
                .map(Business::getId)
                .anyMatch(businessIds::contains);
    }

    private Set<Role> resolveRolesByIds(Set<Long> roleIds) {
        Set<Role> roles = new HashSet<>();
        for (Long roleId : roleIds) {
            Role role = roleRepository.findById(roleId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Rol no encontrado: " + roleId));
            roles.add(role);
        }
        return roles;
    }

    public static boolean hasRole(User user, String roleName) {
        if (user == null || user.getRoles() == null) {
            return false;
        }
        return user.getRoles().stream().anyMatch(r -> roleName.equals(r.getName()));
    }

    private static boolean hasAuthority(Authentication authentication, String role) {
        if (authentication == null) {
            return false;
        }
        for (GrantedAuthority ga : authentication.getAuthorities()) {
            if (role.equals(ga.getAuthority())) {
                return true;
            }
        }
        return false;
    }

    private static ResponseStatusException forbidden(String message) {
        return new ResponseStatusException(HttpStatus.FORBIDDEN, message);
    }

    private static ResponseStatusException notFound(String message) {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, message);
    }
}
