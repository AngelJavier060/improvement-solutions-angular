-- Insertar usuario administrador por defecto
-- Contraseña: admin123 (hasheada con BCrypt)
INSERT INTO users (username, email, password, name, is_active) 
VALUES ('admin', 'admin@improvementsolutions.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.', 'Administrador', true);

-- Asignar rol de administrador al usuario
INSERT INTO user_roles (user_id, role_id) 
SELECT u.id, r.id 
FROM users u, roles r 
WHERE u.username = 'admin' AND r.name = 'ROLE_ADMIN';

-- Insertar usuario de prueba
-- Contraseña: user123 (hasheada con BCrypt)
INSERT INTO users (username, email, password, name, is_active) 
VALUES ('user', 'user@improvementsolutions.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.', 'Usuario de Prueba', true);

-- Asignar rol de usuario normal
INSERT INTO user_roles (user_id, role_id) 
SELECT u.id, r.id 
FROM users u, roles r 
WHERE u.username = 'user' AND r.name = 'ROLE_USER';
