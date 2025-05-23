/**
 * Script de diagnóstico para problemas de CORS en Improvement Solutions
 * Este script se inyecta en la página para mostrar detalles de las solicitudes HTTP
 */

(function() {
    // Configuración
    const config = {
        logToConsole: true,
        showVisualFeedback: true,
        captureAllRequests: true
    };

    // Elemento para mostrar los logs en pantalla
    let logContainer;
    
    // Inicializar la UI si está habilitada
    if (config.showVisualFeedback) {
        setupUI();
    }
    
    // Parchar XMLHttpRequest para capturar solicitudes
    patchXMLHttpRequest();
    
    // Parchar fetch para capturar solicitudes
    patchFetch();
    
    function setupUI() {
        // Crear contenedor de logs
        logContainer = document.createElement('div');
        logContainer.style.position = 'fixed';
        logContainer.style.bottom = '10px';
        logContainer.style.right = '10px';
        logContainer.style.width = '400px';
        logContainer.style.maxHeight = '300px';
        logContainer.style.overflowY = 'auto';
        logContainer.style.backgroundColor = 'rgba(0,0,0,0.8)';
        logContainer.style.color = '#fff';
        logContainer.style.padding = '10px';
        logContainer.style.borderRadius = '5px';
        logContainer.style.fontFamily = 'monospace';
        logContainer.style.fontSize = '12px';
        logContainer.style.zIndex = '9999';
        
        // Crear encabezado
        const header = document.createElement('div');
        header.style.borderBottom = '1px solid #444';
        header.style.paddingBottom = '5px';
        header.style.marginBottom = '5px';
        header.style.fontWeight = 'bold';
        header.textContent = 'Diagnóstico CORS - Improvement Solutions';
        logContainer.appendChild(header);
        
        // Crear área de logs
        const logsArea = document.createElement('div');
        logsArea.id = 'cors-diagnostic-logs';
        logContainer.appendChild(logsArea);
        
        // Añadir botón para limpiar logs
        const clearButton = document.createElement('button');
        clearButton.textContent = 'Limpiar Logs';
        clearButton.style.backgroundColor = '#555';
        clearButton.style.color = '#fff';
        clearButton.style.border = 'none';
        clearButton.style.padding = '5px 10px';
        clearButton.style.marginTop = '10px';
        clearButton.style.borderRadius = '3px';
        clearButton.style.cursor = 'pointer';
        clearButton.onclick = function() {
            document.getElementById('cors-diagnostic-logs').innerHTML = '';
        };
        logContainer.appendChild(clearButton);
        
        // Añadir botón para cerrar
        const closeButton = document.createElement('button');
        closeButton.textContent = 'X';
        closeButton.style.position = 'absolute';
        closeButton.style.top = '5px';
        closeButton.style.right = '5px';
        closeButton.style.backgroundColor = 'transparent';
        closeButton.style.color = '#fff';
        closeButton.style.border = 'none';
        closeButton.style.cursor = 'pointer';
        closeButton.onclick = function() {
            document.body.removeChild(logContainer);
        };
        logContainer.appendChild(closeButton);
        
        // Agregar al DOM cuando esté listo
        if (document.body) {
            document.body.appendChild(logContainer);
        } else {
            window.addEventListener('DOMContentLoaded', function() {
                document.body.appendChild(logContainer);
            });
        }
    }
    
    function logRequest(method, url, status, error) {
        const timestamp = new Date().toISOString().split('T')[1].slice(0, -1);
        const statusClass = error ? 'error' : 'success';
        const message = `[${timestamp}] ${method} ${url} - ${status || 'Pendiente'}`;
        
        if (config.logToConsole) {
            if (error) {
                console.error(message, error);
            } else {
                console.log(message);
            }
        }
        
        if (config.showVisualFeedback && logContainer) {
            const logItem = document.createElement('div');
            logItem.className = `log-item ${statusClass}`;
            logItem.style.borderLeft = error ? '3px solid #e74c3c' : '3px solid #2ecc71';
            logItem.style.padding = '5px';
            logItem.style.marginBottom = '5px';
            logItem.style.backgroundColor = error ? 'rgba(231, 76, 60, 0.2)' : 'transparent';
            logItem.textContent = message;
            
            const logsArea = document.getElementById('cors-diagnostic-logs');
            if (logsArea) {
                logsArea.appendChild(logItem);
                logsArea.scrollTop = logsArea.scrollHeight;
            }
        }
    }
    
    function patchXMLHttpRequest() {
        const originalOpen = XMLHttpRequest.prototype.open;
        const originalSend = XMLHttpRequest.prototype.send;
        
        XMLHttpRequest.prototype.open = function(method, url) {
            this._requestMethod = method;
            this._requestUrl = url;
            return originalOpen.apply(this, arguments);
        };
        
        XMLHttpRequest.prototype.send = function() {
            if (config.captureAllRequests || this._requestUrl.includes('localhost:8080')) {
                logRequest(this._requestMethod, this._requestUrl);
                
                this.addEventListener('load', function() {
                    logRequest(this._requestMethod, this._requestUrl, this.status);
                });
                
                this.addEventListener('error', function(e) {
                    logRequest(this._requestMethod, this._requestUrl, 'ERROR', e);
                });
            }
            
            return originalSend.apply(this, arguments);
        };
    }
    
    function patchFetch() {
        const originalFetch = window.fetch;
        
        window.fetch = function(input, init) {
            const method = init && init.method ? init.method : 'GET';
            const url = typeof input === 'string' ? input : input.url;
            
            if (config.captureAllRequests || url.includes('localhost:8080')) {
                logRequest(method, url);
                
                return originalFetch.apply(this, arguments)
                    .then(response => {
                        logRequest(method, url, response.status);
                        return response;
                    })
                    .catch(error => {
                        logRequest(method, url, 'ERROR', error);
                        throw error;
                    });
            }
            
            return originalFetch.apply(this, arguments);
        };
    }
})();
