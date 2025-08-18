/**
 * Este script realiza una validación completa de las integraciones entre el
 * frontend Angular y el backend Spring Boot, con un enfoque en los problemas
 * de CORS y autenticación.
 */

// Estilos CSS para la página
const styles = `
body {
    font-family: Arial, sans-serif;
    max-width: 800px;
    margin: 0 auto;
    padding: 20px;
    line-height: 1.6;
    color: #333;
}

h1 {
    color: #2c3e50;
    border-bottom: 2px solid #3498db;
    padding-bottom: 10px;
}

h2 {
    color: #2980b9;
    margin-top: 20px;
}

.test-container {
    border: 1px solid #ddd;
    border-radius: 5px;
    padding: 15px;
    margin-bottom: 15px;
}

.test-title {
    font-weight: bold;
    margin-bottom: 10px;
}

.test-button {
    background-color: #3498db;
    color: white;
    border: none;
    padding: 8px 15px;
    border-radius: 4px;
    cursor: pointer;
    margin-right: 5px;
}

.test-button:hover {
    background-color: #2980b9;
}

.result {
    min-height: 30px;
    margin-top: 10px;
    padding: 10px;
    border: 1px solid #f0f0f0;
    border-radius: 4px;
    background-color: #f9f9f9;
    white-space: pre-wrap;
    font-family: monospace;
    font-size: 13px;
}

.success {
    border-color: #2ecc71;
    background-color: #d5f5e3;
}

.error {
    border-color: #e74c3c;
    background-color: #fadbd8;
}

.steps {
    background-color: #f8f9fa;
    border-left: 3px solid #2980b9;
    padding: 10px;
    margin-bottom: 20px;
}

.warning {
    background-color: #fff3cd;
    border: 1px solid #ffeeba;
    border-radius: 5px;
    padding: 10px;
    margin-bottom: 15px;
}

.code {
    background-color: #f8f9fa;
    border: 1px solid #e9ecef;
    border-radius: 4px;
    font-family: monospace;
    padding: 10px;
    margin: 10px 0;
    overflow-x: auto;
}

.badge {
    display: inline-block;
    padding: 3px 8px;
    font-size: 12px;
    border-radius: 10px;
    margin-right: 5px;
}

.badge-primary {
    background-color: #3498db;
    color: white;
}

.badge-success {
    background-color: #2ecc71;
    color: white;
}

.badge-warning {
    background-color: #f39c12;
    color: white;
}

.badge-danger {
    background-color: #e74c3c;
    color: white;
}

.config-display {
    margin-top: 15px;
    font-size: 12px;
}
`;

// HTML para la página
document.head.innerHTML = `
<title>Validación de Integración - Improvement Solutions</title>
<style>${styles}</style>
`;

document.body.innerHTML = `
<h1>Validación de Integración Frontend-Backend</h1>

<div class="warning">
    <strong>Importante:</strong> Esta herramienta valida la configuración de CORS y autenticación entre el frontend 
    Angular (puerto 4200) y el backend Spring Boot (puerto 8081).
</div>

<h2>1. Validación de Endpoints Públicos</h2>

<div class="test-container">
    <div class="test-title">Endpoint de tipos de documento (público sin credenciales)</div>
    <button class="test-button" onclick="testPublicEndpoint('/api/v1/master-data/type-documents', 'public-endpoint-result')">
        Probar Endpoint
    </button>
    <button class="test-button" onclick="clearResult('public-endpoint-result')">
        Limpiar
    </button>
    <div id="public-endpoint-result" class="result"></div>
</div>

<div class="test-container">
    <div class="test-title">Endpoint de géneros (público sin credenciales)</div>
    <button class="test-button" onclick="testPublicEndpoint('/api/v1/public/generos', 'generos-endpoint-result')">
        Probar Endpoint
    </button>
    <button class="test-button" onclick="clearResult('generos-endpoint-result')">
        Limpiar
    </button>
    <div id="generos-endpoint-result" class="result"></div>
</div>

<h2>2. Prueba de Autenticación</h2>

<div class="test-container">
    <div class="test-title">Login (endpoint con credenciales)</div>
    <div style="margin-bottom: 10px;">
        <input type="text" id="username" placeholder="Usuario" value="javier" style="margin-right: 10px; padding: 5px;">
        <input type="password" id="password" placeholder="Contraseña" value="12345" style="padding: 5px;">
    </div>
    <button class="test-button" onclick="testLogin('login-result')">
        Intentar Login
    </button>
    <button class="test-button" onclick="clearResult('login-result')">
        Limpiar
    </button>
    <div id="login-result" class="result"></div>
</div>

<h2>3. Prueba de Endpoint Protegido</h2>

<div class="test-container">
    <div class="test-title">Empresas (endpoint protegido con JWT)</div>
    <button class="test-button" onclick="testProtectedEndpoint('/api/v1/businesses', 'protected-endpoint-result')">
        Probar con token actual
    </button>
    <button class="test-button" onclick="clearResult('protected-endpoint-result')">
        Limpiar
    </button>
    <div id="protected-endpoint-result" class="result"></div>
</div>

<h2>4. Diagnóstico</h2>

<div class="test-container">
    <div class="test-title">Configuración CORS</div>
    <button class="test-button" onclick="checkCorsConfig('cors-config-result')">
        Verificar Configuración CORS
    </button>
    <button class="test-button" onclick="clearResult('cors-config-result')">
        Limpiar
    </button>
    <div id="cors-config-result" class="result"></div>
</div>

<div class="test-container">
    <div class="test-title">Token JWT Actual</div>
    <button class="test-button" onclick="showCurrentToken('token-result')">
        Mostrar Token
    </button>
    <button class="test-button" onclick="clearResult('token-result')">
        Limpiar
    </button>
    <div id="token-result" class="result"></div>
</div>

<script>
// Variables globales
let savedToken = localStorage.getItem('auth_token');
let baseUrl = 'http://localhost:8081';

// Función para probar endpoints públicos
function testPublicEndpoint(endpoint, resultId) {
    const resultDiv = document.getElementById(resultId);
    resultDiv.textContent = 'Probando endpoint público...';
    resultDiv.className = 'result';
    
    fetch(baseUrl + endpoint, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(\`HTTP Error: \${response.status} \${response.statusText}\`);
        }
        return response.json();
    })
    .then(data => {
        resultDiv.textContent = 'Éxito! Respuesta: ' + JSON.stringify(data, null, 2);
        resultDiv.className = 'result success';
    })
    .catch(error => {
        resultDiv.textContent = 'Error: ' + error.message;
        resultDiv.className = 'result error';
    });
}

// Función para probar la autenticación
function testLogin(resultId) {
    const resultDiv = document.getElementById(resultId);
    resultDiv.textContent = 'Enviando credenciales...';
    resultDiv.className = 'result';
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    fetch(baseUrl + '/api/v1/auth/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(\`HTTP Error: \${response.status} \${response.statusText}\`);
        }
        return response.json();
    })
    .then(data => {
        savedToken = data.token;
        localStorage.setItem('auth_token', savedToken);
        resultDiv.textContent = 'Autenticación exitosa! Token recibido y guardado.';
        resultDiv.className = 'result success';
    })
    .catch(error => {
        resultDiv.textContent = 'Error de autenticación: ' + error.message;
        resultDiv.className = 'result error';
    });
}

// Función para probar endpoints protegidos
function testProtectedEndpoint(endpoint, resultId) {
    const resultDiv = document.getElementById(resultId);
    resultDiv.textContent = 'Probando endpoint protegido...';
    resultDiv.className = 'result';
    
    if (!savedToken) {
        resultDiv.textContent = 'Error: No hay token guardado. Por favor, inicia sesión primero.';
        resultDiv.className = 'result error';
        return;
    }
    
    fetch(baseUrl + endpoint, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': \`Bearer \${savedToken}\`
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(\`HTTP Error: \${response.status} \${response.statusText}\`);
        }
        return response.json();
    })
    .then(data => {
        resultDiv.textContent = 'Éxito! Respuesta: ' + JSON.stringify(data, null, 2);
        resultDiv.className = 'result success';
    })
    .catch(error => {
        resultDiv.textContent = 'Error al acceder a endpoint protegido: ' + error.message;
        resultDiv.className = 'result error';
    });
}

// Función para verificar la configuración CORS
function checkCorsConfig(resultId) {
    const resultDiv = document.getElementById(resultId);
    resultDiv.textContent = 'Verificando configuración CORS...';
    resultDiv.className = 'result';
    
    Promise.all([
        // Intentamos una petición OPTIONS a varios endpoints
        fetch(baseUrl + '/api/v1/auth/login', { method: 'OPTIONS' }).catch(e => e),
        fetch(baseUrl + '/api/v1/businesses', { method: 'OPTIONS' }).catch(e => e),
        fetch(baseUrl + '/api/v1/public/generos', { method: 'OPTIONS' }).catch(e => e)
    ])
    .then(results => {
        let report = 'Reporte de configuración CORS:\n\n';
        
        // Endpoint auth/login
        if (!(results[0] instanceof Error)) {
            report += '✅ Endpoint /api/v1/auth/login: CORS configurado correctamente\n';
        } else {
            report += '❌ Endpoint /api/v1/auth/login: Problema con CORS - ' + results[0].message + '\n';
        }
        
        // Endpoint businesses
        if (!(results[1] instanceof Error)) {
            report += '✅ Endpoint /api/v1/businesses: CORS configurado correctamente\n';
        } else {
            report += '❌ Endpoint /api/v1/businesses: Problema con CORS - ' + results[1].message + '\n';
        }
        
        // Endpoint public/generos
        if (!(results[2] instanceof Error)) {
            report += '✅ Endpoint /api/v1/public/generos: CORS configurado correctamente\n';
        } else {
            report += '❌ Endpoint /api/v1/public/generos: Problema con CORS - ' + results[2].message + '\n';
        }
        
        resultDiv.textContent = report;
        resultDiv.className = 'result';
    });
}

// Función para mostrar el token actual
function showCurrentToken(resultId) {
    const resultDiv = document.getElementById(resultId);
    
    if (!savedToken) {
        resultDiv.textContent = 'No hay token guardado.';
        resultDiv.className = 'result';
        return;
    }
    
    // Decodificar el token JWT para mostrar información
    try {
        const tokenParts = savedToken.split('.');
        const header = JSON.parse(atob(tokenParts[0]));
        const payload = JSON.parse(atob(tokenParts[1]));
        
        resultDiv.textContent = 'Token JWT guardado:\n\n';
        resultDiv.textContent += 'Header: ' + JSON.stringify(header, null, 2) + '\n\n';
        resultDiv.textContent += 'Payload: ' + JSON.stringify(payload, null, 2);
        resultDiv.className = 'result';
    } catch (e) {
        resultDiv.textContent = 'Token guardado (no se puede decodificar): ' + savedToken;
        resultDiv.className = 'result';
    }
}

// Función para limpiar el resultado
function clearResult(resultId) {
    document.getElementById(resultId).textContent = '';
    document.getElementById(resultId).className = 'result';
}
</script>
`;

console.log("Herramienta de diagnóstico cargada correctamente.");
