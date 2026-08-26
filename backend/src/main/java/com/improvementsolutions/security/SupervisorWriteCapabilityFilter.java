package com.improvementsolutions.security;

import com.improvementsolutions.service.UserOperationalCapabilityService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpMethod;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.util.AntPathMatcher;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Set;

/**
 * Escritura operativa según matriz de capacidades.
 * Superadmin siempre pasa. Admin/Gestor/Supervisor según flags de la matriz.
 */
@Component
@RequiredArgsConstructor
public class SupervisorWriteCapabilityFilter extends OncePerRequestFilter {

    private static final AntPathMatcher MATCHER = new AntPathMatcher();

    private static final String[] WRITE_PATHS = {
            "/api/inventory/**",
            "/api/fleet/**",
            "/api/attendance/**",
            "/api/incidents/**",
            "/api/gerencias-viajes/**",
            "/api/obligation-matrices/**",
            "/api/approvals/**",
            "/api/employee/**",
            "/api/employees/**",
            "/api/business-employees/**",
            "/api/employee_document",
            "/api/employee_document/**",
            "/api/employee_course",
            "/api/employee_course/**",
            "/api/employee_card",
            "/api/employee_card/**",
            "/api/employee_contract",
            "/api/employee_contract/**",
            "/api/files/upload",
            "/api/files/upload/**",
            "/api/files/staging/**",
            "/api/files/delete/**"
    };

    private static final Set<String> WRITE_METHODS = Set.of(
            HttpMethod.POST.name(),
            HttpMethod.PUT.name(),
            HttpMethod.PATCH.name(),
            HttpMethod.DELETE.name()
    );

    private final UserOperationalCapabilityService capabilityService;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String method = request.getMethod();
        if (!WRITE_METHODS.contains(method)) {
            filterChain.doFilter(request, response);
            return;
        }

        String path = normalizePath(request.getRequestURI());
        if (!matchesWritePath(path)) {
            filterChain.doFilter(request, response);
            return;
        }

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            filterChain.doFilter(request, response);
            return;
        }

        boolean isSuper = auth.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .anyMatch("ROLE_SUPER_ADMIN"::equals);
        if (isSuper) {
            filterChain.doFilter(request, response);
            return;
        }

        String capability = resolveRequiredCapability(path);
        if (!capabilityService.hasCapabilityByUsername(auth.getName(), capability)) {
            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
            response.setContentType("application/json;charset=UTF-8");
            response.getWriter().write(
                    "{\"title\":\"Acceso denegado\",\"message\":\"No tiene habilitada esta acción en la matriz de permisos. Contacte al Superadministrador.\",\"code\":\"CAPABILITY_DISABLED\",\"capability\":\""
                            + capability + "\"}"
            );
            return;
        }

        filterChain.doFilter(request, response);
    }

    private String resolveRequiredCapability(String path) {
        if (path == null) {
            return "write";
        }
        String p = path.toLowerCase();
        if (p.contains("/overtime") || p.contains("overtime-requests")) {
            return "overtime";
        }
        if (p.contains("/vacation")) {
            return "vacations";
        }
        if (p.contains("/permission")) {
            return "timeOff";
        }
        return "write";
    }

    private String normalizePath(String path) {
        if (path == null) {
            return "";
        }
        int q = path.indexOf('?');
        return q >= 0 ? path.substring(0, q) : path;
    }

    private boolean matchesWritePath(String path) {
        for (String pattern : WRITE_PATHS) {
            if (MATCHER.match(pattern, path)) {
                return true;
            }
        }
        return false;
    }
}
