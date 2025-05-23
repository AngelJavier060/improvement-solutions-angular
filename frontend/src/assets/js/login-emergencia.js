// Script para obtener un token de autenticación directamente
function authenticate(username, password) {
    // Parámetros configurables
    const backendUrl = 'http://localhost:8080/api/v1';
    const authEndpoint = '/auth/login';
    const diagnosticEndpoint = '/public/diagnostic/auth-bypass';
    
    console.log('Intentando autenticación con el endpoint principal...');
    
    // Realizar la petición de autenticación al endpoint principal
    fetch(`${backendUrl}${authEndpoint}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify({ username, password })
    })
    .then(response => {
        if (!response.ok) {
            console.error(`Error ${response.status}: ${response.statusText}`);
            console.log('Intentando con endpoint alternativo...');
            
            // Si falla, intentar con el endpoint de diagnóstico
            return fetch(`${backendUrl}${diagnosticEndpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });
        }
        return response;
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        return response.json();
    })
    .then(data => {
        console.log('Autenticación exitosa:', data);
        
        // Guardar token en localStorage
        if (data.token) {
            localStorage.setItem('auth_token', data.token);
            console.log('Token guardado en localStorage');
            
            // Guardar información de usuario
            if (data.userDetail) {
                localStorage.setItem('current_user', JSON.stringify(data.userDetail));
                console.log('Información de usuario guardada');
            }
            
            // Recargar para aplicar el token
            console.log('Recargando para aplicar el token...');
            window.location.reload();
        } else {
            console.error('No se recibió un token en la respuesta');
        }
    })
    .catch(error => {
        console.error('Error de autenticación:', error);
    });
}

// Función para ejecutar desde la consola del navegador
function loginEmergencia(username = 'javier', password = '12345') {
    console.log(`Ejecutando autenticación de emergencia para usuario: ${username}`);
    authenticate(username, password);
    return "Intento de autenticación en progreso... Revisa la consola para más detalles.";
}

// Auto-ejecución para estar disponible en el objeto window
(() => {
    // Exponer la función al ámbito global para que pueda ser llamada desde la consola
    window.loginEmergencia = loginEmergencia;
    
    console.log('Script de autenticación de emergencia cargado.');
    console.log('Uso: loginEmergencia() - o - loginEmergencia("usuario", "contraseña")');
})();
