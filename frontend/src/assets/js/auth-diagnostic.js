/**
 * Script de diagnóstico de autenticación para Improvement Solutions
 * 
 * Este script ayuda a depurar problemas con el flujo de autenticación
 */

const styles = `
body {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    padding: 20px;
    max-width: 800px;
    margin: 0 auto;
    line-height: 1.5;
}
h1 {
    color: #0066cc;
    border-bottom: 2px solid #0066cc;
    padding-bottom: 8px;
}
.test-panel {
    border: 1px solid #ddd;
    border-radius: 8px;
    padding: 15px;
    margin: 20px 0;
}
.panel-title {
    font-size: 18px;
    font-weight: bold;
    margin-bottom: 10px;
}
.form-group {
    margin-bottom: 15px;
}
label {
    display: block;
    margin-bottom: 5px;
    font-weight: 500;
}
input[type="text"], input[type="password"] {
    width: 100%;
    padding: 8px;
    border: 1px solid #ccc;
    border-radius: 4px;
}
button {
    background-color: #0066cc;
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    margin-right: 8px;
}
button:hover {
    background-color: #0055aa;
}
button.secondary {
    background-color: #6c757d;
}
button.secondary:hover {
    background-color: #5a6268;
}
.output {
    background-color: #f8f9fa;
    border: 1px solid #e9ecef;
    border-radius: 4px;
    padding: 10px;
    font-family: monospace;
    white-space: pre-wrap;
    margin-top: 10px;
    min-height: 100px;
    max-height: 300px;
    overflow-y: auto;
}
.output.success {
    border-color: #28a745;
    background-color: #d4edda;
}
.output.error {
    border-color: #dc3545;
    background-color: #f8d7da;
}
.status-indicator {
    display: inline-block;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    margin-right: 8px;
}
.status-indicator.success {
    background-color: #28a745;
}
.status-indicator.error {
    background-color: #dc3545;
}
.status-indicator.warning {
    background-color: #ffc107;
}
.status-indicator.pending {
    background-color: #6c757d;
}
.check-row {
    margin-bottom: 8px;
    display: flex;
    align-items: center;
}
.debug-info {
    font-size: 12px;
    color: #6c757d;
    margin-top: 5px;
}
.config-display {
    font-size: 12px;
    color: #495057;
    margin-top: 15px;
}
`;

// Crear la estructura HTML
document.head.innerHTML = `
<title>Diagnóstico de Autenticación - Improvement Solutions</title>
<style>${styles}</style>
`;

document.body.innerHTML = `
<h1>Diagnóstico de Autenticación</h1>
<p>Esta herramienta te ayuda a diagnosticar problemas con la autenticación entre el frontend Angular y el backend Spring Boot.</p>

<div class="test-panel">
    <div class="panel-title">1. Verificar configuración</div>
    <div class="check-row">
        <span class="status-indicator" id="config-status"></span>
        <span>Configuración de URLs y CORS</span>
    </div>
    <button onclick="checkConfiguration()">Verificar configuración</button>
    <button class="secondary" onclick="resetOutput('config-output')">Limpiar</button>
    <div class="output" id="config-output">No se ha ejecutado la verificación</div>
</div>

<div class="test-panel">
    <div class="panel-title">2. Prueba de autenticación</div>
    <div class="form-group">
        <label for="username">Nombre de usuario o correo</label>
        <input type="text" id="username" value="javier">
    </div>
    <div class="form-group">
        <label for="password">Contraseña</label>
        <input type="password" id="password" value="12345">
    </div>
    <button onclick="testLogin()">Iniciar sesión</button>
    <button class="secondary" onclick="resetOutput('login-output')">Limpiar</button>
    <div class="output" id="login-output">No se ha ejecutado la prueba de inicio de sesión</div>
</div>

<div class="test-panel">
    <div class="panel-title">3. Prueba de endpoint protegido</div>
    <button onclick="testProtectedEndpoint()">Probar acceso a empresas</button>
    <button class="secondary" onclick="resetOutput('protected-output')">Limpiar</button>
    <div class="output" id="protected-output">No se ha ejecutado la prueba de endpoint protegido</div>
</div>

<div class="config-display" id="current-config">
</div>

<script>
// Variables globales
const apiUrl = 'http://localhost:8080';
const contextPath = '/api/v1';
let savedToken = localStorage.getItem('auth_token');

// Al cargar la página, mostrar la configuración actual
window.onload = function() {
    displayCurrentConfig();
    
    // Verificar si ya hay un token guardado
    if (savedToken) {
        document.getElementById('login-output').textContent = 'Ya existe un token guardado en localStorage';
        document.getElementById('login-output').classList.add('success');
    }
};

// Función para verificar la configuración
function checkConfiguration() {
    const outputElement = document.getElementById('config-output');
    const statusElement = document.getElementById('config-status');
    
    outputElement.textContent = 'Verificando configuración...';
    outputElement.className = 'output';
    statusElement.className = 'status-indicator pending';
    
    // Probar endpoint público de CORS
    fetch(apiUrl + contextPath + '/public/test', {
        method: 'OPTIONS'
    })
    .then(response => {
        // Verificar headers CORS en la respuesta OPTIONS
        const configReport = [];
        
        // Verificar si la solicitud OPTIONS se completó exitosamente
        if (response.ok) {
            configReport.push('✅ Configuración CORS básica correcta');
        } else {
            configReport.push('❌ Error en la configuración CORS para preflight OPTIONS');
        }
        
        // Ahora hacer una prueba GET para verificar el acceso real
        return fetch(apiUrl + contextPath + '/public/test')
            .then(getResponse => {
                if (getResponse.ok) {
                    configReport.push('✅ Acceso a endpoint público sin autenticación: OK');
                    configReport.push('');
                    configReport.push('Configuración actual:');
                    configReport.push('- API URL Base: ' + apiUrl);
                    configReport.push('- Context Path: ' + contextPath);
                    configReport.push('');
                    configReport.push('La configuración CORS parece estar correctamente configurada.');
                    
                    outputElement.textContent = configReport.join('\n');
                    outputElement.classList.add('success');
                    statusElement.classList.add('success');
                } else {
                    throw new Error('Error al acceder al endpoint público: ' + getResponse.status);
                }
            });
    })
    .catch(error => {
        outputElement.textContent = 'Error al verificar la configuración: ' + error.message + '\n\n' +
            'Posibles causas:\n' +
            '1. El servidor Spring Boot no está en ejecución\n' +
            '2. La configuración CORS en el servidor no está correcta\n' +
            '3. La URL base o context path no son correctos\n\n' +
            'Verificar que el servidor esté ejecutando en ' + apiUrl + ' y que tenga configurado el context-path como ' + contextPath;
        
        outputElement.classList.add('error');
        statusElement.classList.add('error');
    });
}

// Función para probar el inicio de sesión
function testLogin() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const outputElement = document.getElementById('login-output');
    
    outputElement.textContent = 'Intentando iniciar sesión...';
    outputElement.className = 'output';
    
    // Crear el cuerpo de la petición según sea email o nombre de usuario
    const isEmail = username.includes('@');
    const requestBody = isEmail ? 
        { email: username, password } : 
        { username, password };
    
    console.log('Enviando solicitud de login a:', apiUrl + contextPath + '/auth/login');
    console.log('Datos de la solicitud:', JSON.stringify(requestBody));
    
    fetch(apiUrl + contextPath + '/auth/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify(requestBody)
    })
    .then(response => {
        console.log('Respuesta recibida:', response);
        
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status} ${response.statusText}`);
        }
        return response.json();
    })
    .then(data => {
        console.log('Datos de respuesta:', data);
        
        // Guardar el token y mostrar la respuesta
        if (data.token) {
            savedToken = data.token;
            localStorage.setItem('auth_token', savedToken);
            
            outputElement.textContent = 'Inicio de sesión exitoso!\n\n' +
                'Token JWT recibido y guardado en localStorage.\n' +
                'Información del usuario:\n' +
                '- Nombre: ' + (data.userDetail?.name || 'N/A') + '\n' +
                '- Correo: ' + (data.userDetail?.email || 'N/A') + '\n' +
                '- Roles: ' + (data.userDetail?.roles?.join(', ') || 'N/A');
            
            outputElement.classList.add('success');
        } else {
            outputElement.textContent = 'La respuesta no contiene un token válido:\n' + 
                JSON.stringify(data, null, 2);
            outputElement.classList.add('error');
        }
    })
    .catch(error => {
        console.error('Error de autenticación:', error);
        
        outputElement.textContent = 'Error al iniciar sesión: ' + error.message + '\n\n' +
            'Detalles técnicos:\n' +
            '- URL: ' + apiUrl + contextPath + '/auth/login\n' +
            '- Método: POST\n' +
            '- Headers: Content-Type: application/json\n' +
            '- Body: ' + JSON.stringify(requestBody, null, 2) + '\n\n' +
            'Posibles causas:\n' +
            '1. Las credenciales son incorrectas\n' +
            '2. El endpoint de autenticación está mal configurado\n' +
            '3. Hay un problema con la configuración CORS para este endpoint específico';
        
        outputElement.classList.add('error');
    });
}

// Función para probar un endpoint protegido
function testProtectedEndpoint() {
    const outputElement = document.getElementById('protected-output');
    
    outputElement.textContent = 'Probando acceso a endpoint protegido...';
    outputElement.className = 'output';
    
    if (!savedToken) {
        outputElement.textContent = 'No hay token disponible. Por favor, inicia sesión primero.';
        outputElement.classList.add('error');
        return;
    }
    
    fetch(apiUrl + contextPath + '/businesses', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${savedToken}`
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status} ${response.statusText}`);
        }
        return response.json();
    })
    .then(data => {
        outputElement.textContent = 'Acceso exitoso al endpoint protegido!\n\n' +
            'Datos recibidos:\n' + 
            JSON.stringify(data, null, 2);
        
        outputElement.classList.add('success');
    })
    .catch(error => {
        outputElement.textContent = 'Error al acceder al endpoint protegido: ' + error.message + '\n\n' +
            'Posibles causas:\n' +
            '1. El token ha expirado o es inválido\n' +
            '2. No tienes permisos para acceder a este recurso\n' +
            '3. Hay un problema con la configuración del header Authorization';
        
        outputElement.classList.add('error');
    });
}

// Función para mostrar la configuración actual
function displayCurrentConfig() {
    const configElement = document.getElementById('current-config');
    
    configElement.innerHTML = `
        <strong>Configuración actual:</strong><br>
        API URL base: ${apiUrl}<br>
        Context Path: ${contextPath}<br>
        Token almacenado: ${savedToken ? 'Sí' : 'No'}<br>
    `;
}

// Función para reiniciar un output
function resetOutput(elementId) {
    const element = document.getElementById(elementId);
    element.textContent = '';
    element.className = 'output';
}
</script>
`;

console.log("Script de diagnóstico de autenticación cargado con éxito");
