package com.improvementsolutions.service;

import com.improvementsolutions.dto.user.UserOperationalCapabilityDto;
import com.improvementsolutions.model.User;
import com.improvementsolutions.model.UserOperationalCapability;
import com.improvementsolutions.repository.UserOperationalCapabilityRepository;
import com.improvementsolutions.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserOperationalCapabilityService {

    private final UserOperationalCapabilityRepository capabilityRepository;
    private final UserRepository userRepository;

    public boolean isSuperAdmin(User user) {
        return UserAdminAuthorizationService.hasRole(user, UserAdminAuthorizationService.ROLE_SUPER_ADMIN);
    }

    public boolean isCompanyOperator(User user) {
        return UserAdminAuthorizationService.hasRole(user, UserAdminAuthorizationService.ROLE_ADMIN)
                || UserAdminAuthorizationService.hasRole(user, UserAdminAuthorizationService.ROLE_MANAGER)
                || UserAdminAuthorizationService.hasRole(user, UserAdminAuthorizationService.ROLE_USER);
    }

    public boolean isSupervisor(User user) {
        return UserAdminAuthorizationService.hasRole(user, UserAdminAuthorizationService.ROLE_USER)
                && !UserAdminAuthorizationService.hasRole(user, UserAdminAuthorizationService.ROLE_ADMIN)
                && !UserAdminAuthorizationService.hasRole(user, UserAdminAuthorizationService.ROLE_MANAGER)
                && !isSuperAdmin(user)
                && !UserAdminAuthorizationService.hasRole(user, UserAdminAuthorizationService.ROLE_EMPLOYEE);
    }

    /** Defaults de escritura plena (Admin/Gestor) cuando aún no hay fila en BD. */
    public boolean defaultFullWriteByRole(User user) {
        return isSuperAdmin(user)
                || UserAdminAuthorizationService.hasRole(user, UserAdminAuthorizationService.ROLE_ADMIN)
                || UserAdminAuthorizationService.hasRole(user, UserAdminAuthorizationService.ROLE_MANAGER);
    }

    @Transactional(readOnly = true)
    public UserOperationalCapabilityDto resolveForUser(User user) {
        return resolveForUser(user, null);
    }

    @Transactional(readOnly = true)
    public UserOperationalCapabilityDto resolveForUser(User user, Authentication viewer) {
        if (user == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuario no encontrado");
        }
        // Superadmin: no consulta BD (siempre pleno) — evita fallos de esquema en login
        if (isSuperAdmin(user)) {
            return toDto(user, null, viewer);
        }
        try {
            return toDto(user, capabilityRepository.findByUserId(user.getId()).orElse(null), viewer);
        } catch (Exception ex) {
            // Esquema incompleto u otro error: defaults por rol
            return toDto(user, null, viewer);
        }
    }

    @Transactional(readOnly = true)
    public List<UserOperationalCapabilityDto> resolveForUsers(List<User> users, Authentication viewer) {
        if (users == null || users.isEmpty()) {
            return List.of();
        }
        Set<Long> ids = users.stream().map(User::getId).collect(Collectors.toSet());
        Map<Long, UserOperationalCapability> byUser = capabilityRepository.findByUserIdIn(ids).stream()
                .collect(Collectors.toMap(c -> c.getUser().getId(), Function.identity(), (a, b) -> a));
        List<UserOperationalCapabilityDto> out = new ArrayList<>();
        for (User u : users) {
            out.add(toDto(u, byUser.get(u.getId()), viewer));
        }
        return out;
    }

    @Transactional(readOnly = true)
    public boolean canWriteOps(User user) {
        UserOperationalCapabilityDto dto = resolveForUser(user);
        return dto.isCanWriteOps();
    }

    @Transactional(readOnly = true)
    public boolean canWriteOpsByUsername(String username) {
        return userRepository.findByUsername(username).map(this::canWriteOps).orElse(false);
    }

    @Transactional(readOnly = true)
    public boolean hasCapabilityByUsername(String username, String capability) {
        return userRepository.findByUsername(username)
                .map(u -> hasCapability(resolveForUser(u), capability))
                .orElse(false);
    }

    public boolean hasCapability(UserOperationalCapabilityDto dto, String capability) {
        if (dto == null) {
            return false;
        }
        return switch (capability == null ? "" : capability) {
            case "overtime" -> dto.isCanOvertime();
            case "vacations" -> dto.isCanVacations();
            case "timeOff", "permissions" -> dto.isCanTimeOff();
            case "create" -> dto.isCanCreate();
            case "edit" -> dto.isCanEdit();
            case "delete" -> dto.isCanDelete();
            case "upload" -> dto.isCanUpload();
            case "write" -> dto.isCanWriteOps();
            default -> dto.isCanWriteOps();
        };
    }

    /**
     * Actualiza capacidades. Super: Admin/Gestor/Supervisor.
     * Admin empresa: solo Supervisores de su alcance (ya validado en controller).
     */
    @Transactional
    public UserOperationalCapabilityDto updateCapabilities(Long userId,
                                                           UserOperationalCapabilityDto incoming,
                                                           Authentication actor) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuario no encontrado"));

        if (isSuperAdmin(user)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No se edita la matriz del Superadministrador");
        }
        if (UserAdminAuthorizationService.hasRole(user, UserAdminAuthorizationService.ROLE_EMPLOYEE)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Las cuentas de trabajador no usan esta matriz");
        }

        boolean actorIsSuper = actor != null && actor.getAuthorities().stream()
                .anyMatch(a -> "ROLE_SUPER_ADMIN".equals(a.getAuthority()));
        boolean actorIsAdmin = actor != null && actor.getAuthorities().stream()
                .anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority())) && !actorIsSuper;

        if (actorIsAdmin) {
            if (!isSupervisor(user)) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                        "Como administrador de empresa solo puedes ajustar Supervisores. Admin/Gestor los configura el Superadministrador.");
            }
        } else if (!actorIsSuper) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "No autorizado a editar la matriz");
        }

        UserOperationalCapability cap = capabilityRepository.findByUserId(userId).orElseGet(() ->
                UserOperationalCapability.builder()
                        .user(user)
                        .canView(true)
                        .canDownload(true)
                        .canCreate(defaultFullWriteByRole(user))
                        .canEdit(defaultFullWriteByRole(user))
                        .canDelete(defaultFullWriteByRole(user))
                        .canUpload(defaultFullWriteByRole(user))
                        .canOvertime(defaultFullWriteByRole(user))
                        .canVacations(defaultFullWriteByRole(user))
                        .canTimeOff(defaultFullWriteByRole(user))
                        .build()
        );

        cap.setCanView(true);
        if (incoming != null) {
            cap.setCanDownload(incoming.isCanDownload());
            cap.setCanCreate(incoming.isCanCreate());
            cap.setCanEdit(incoming.isCanEdit());
            cap.setCanDelete(incoming.isCanDelete());
            cap.setCanUpload(incoming.isCanUpload());
            cap.setCanOvertime(incoming.isCanOvertime());
            cap.setCanVacations(incoming.isCanVacations());
            cap.setCanTimeOff(incoming.isCanTimeOff());
        }

        return toDto(user, capabilityRepository.save(cap), actor);
    }

    private UserOperationalCapabilityDto toDto(User user, UserOperationalCapability stored, Authentication viewer) {
        boolean locked = isSuperAdmin(user);
        boolean isEmployee = UserAdminAuthorizationService.hasRole(user, UserAdminAuthorizationService.ROLE_EMPLOYEE);
        boolean defaultsFull = defaultFullWriteByRole(user);

        boolean canView = true;
        boolean canDownload = true;
        boolean canCreate;
        boolean canEdit;
        boolean canDelete;
        boolean canUpload;
        boolean canOvertime;
        boolean canVacations;
        boolean canTimeOff;

        if (isEmployee) {
            canView = false;
            canDownload = false;
            canCreate = canEdit = canDelete = canUpload = false;
            canOvertime = canVacations = canTimeOff = false;
        } else if (locked) {
            canCreate = canEdit = canDelete = canUpload = true;
            canOvertime = canVacations = canTimeOff = true;
        } else if (stored != null) {
            canView = stored.isCanView();
            canDownload = stored.isCanDownload();
            canCreate = stored.isCanCreate();
            canEdit = stored.isCanEdit();
            canDelete = stored.isCanDelete();
            canUpload = stored.isCanUpload();
            canOvertime = stored.isCanOvertime();
            canVacations = stored.isCanVacations();
            canTimeOff = stored.isCanTimeOff();
        } else if (defaultsFull) {
            // Admin/Gestor sin fila: todo habilitado hasta que Super lo restrinja
            canCreate = canEdit = canDelete = canUpload = true;
            canOvertime = canVacations = canTimeOff = true;
        } else {
            // Supervisor sin fila: solo lectura
            canCreate = canEdit = canDelete = canUpload = false;
            canOvertime = canVacations = canTimeOff = false;
        }

        return UserOperationalCapabilityDto.builder()
                .userId(user.getId())
                .username(user.getUsername())
                .name(user.getName())
                .roleKind(roleKind(user))
                .canView(canView)
                .canDownload(canDownload)
                .canCreate(canCreate)
                .canEdit(canEdit)
                .canDelete(canDelete)
                .canUpload(canUpload)
                .canOvertime(canOvertime)
                .canVacations(canVacations)
                .canTimeOff(canTimeOff)
                .writeLockedByRole(locked)
                .editable(isEditableForViewer(user, viewer))
                .canWriteOps(canCreate || canEdit || canDelete || canUpload)
                .build();
    }

    private boolean isEditableForViewer(User target, Authentication viewer) {
        if (viewer == null || isSuperAdmin(target)
                || UserAdminAuthorizationService.hasRole(target, UserAdminAuthorizationService.ROLE_EMPLOYEE)) {
            return false;
        }
        boolean viewerSuper = viewer.getAuthorities().stream()
                .anyMatch(a -> "ROLE_SUPER_ADMIN".equals(a.getAuthority()));
        if (viewerSuper) {
            return true;
        }
        boolean viewerAdmin = viewer.getAuthorities().stream()
                .anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority()));
        return viewerAdmin && isSupervisor(target);
    }

    private String roleKind(User user) {
        if (isSuperAdmin(user)) {
            return "superadmin";
        }
        if (UserAdminAuthorizationService.hasRole(user, UserAdminAuthorizationService.ROLE_EMPLOYEE)) {
            return "trabajador";
        }
        if (UserAdminAuthorizationService.hasRole(user, UserAdminAuthorizationService.ROLE_ADMIN)) {
            return "administrador";
        }
        if (UserAdminAuthorizationService.hasRole(user, UserAdminAuthorizationService.ROLE_MANAGER)) {
            return "gestor";
        }
        if (UserAdminAuthorizationService.hasRole(user, UserAdminAuthorizationService.ROLE_USER)) {
            return "supervisor";
        }
        return "otro";
    }
}
