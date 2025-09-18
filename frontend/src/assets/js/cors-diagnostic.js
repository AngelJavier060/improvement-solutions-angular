// Lightweight CORS/Proxy diagnostic helper for development
(function(){
  try {
    const stamp = new Date().toISOString();
    console.log(`[CORS-DIAG ${stamp}] Script cargado`);

    // Detect current origin and API base
    const origin = window.location.origin;
    console.log(`[CORS-DIAG] Origin: ${origin}`);

    // Optionally probe a lightweight endpoint via proxy when available
    // This block is safe: it fails silently and never blocks app startup.
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);

    fetch('/api/health', { signal: controller.signal })
      .then(r => {
        clearTimeout(timeout);
        console.log(`[CORS-DIAG] /api/health -> status ${r.status}`);
      })
      .catch(err => {
        clearTimeout(timeout);
        console.log('[CORS-DIAG] /api/health no accesible (normal si no existe). Detalle:', err?.name || err);
      });
  } catch (e) {
    console.log('[CORS-DIAG] Error interno:', e);
  }
})();
