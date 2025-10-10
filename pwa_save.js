// pwa_save.js - versión corregida (evita colisión con window.history y añade debug)
(function(){
  const KEY = 'acciones_saved_games_v1';

  function qs(id){ return document.getElementById(id); }

  // Devuelve la "history" del juego en forma segura (array serializable)
  function getGameHistorySafe(){
    try {
      // Si existe la variable `history` del juego y es array, úsala.
      if (typeof history !== 'undefined' && Array.isArray(history)) {
        // devolvemos una copia simple (no referencias)
        return JSON.parse(JSON.stringify(history));
      }
      // Si internamente alguien guardó en window._game_history, úsala
      if (Array.isArray(window._game_history)) return JSON.parse(JSON.stringify(window._game_history));
    } catch(e){
      console.warn('getGameHistorySafe error', e);
    }
    return [];
  }

  function getSnapshot(){
    if (typeof actions === 'undefined') { alert('No se detectó el juego (variable actions)'); return null; }
    let gameHistory = getGameHistorySafe();
    // Construimos snapshot con solo datos serializables
    const snap = {
      id: Date.now(),
      date: new Date().toISOString(),
      numPlayers: window.numPlayers || 2,
      totalTurns: window.totalTurns || 20,
      currentTurn: window.currentTurn || 0,
      history: gameHistory,
      actions: {}
    };
    try {
      Object.keys(window.actions).forEach(k=>{
        const a = window.actions[k];
        snap.actions[k] = {
          color: a.color,
          values: Array.isArray(a.values) ? a.values.slice() : [],
          minSquares: Array.isArray(a.minSquares) ? a.minSquares.slice() : [],
          maxSquares: Array.isArray(a.maxSquares) ? a.maxSquares.slice() : [],
          overflow: Array.isArray(a.overflow) ? a.overflow.slice() : [],
          pointStyle: Array.isArray(a.pointStyle) ? a.pointStyle.slice() : [],
          pointRadius: Array.isArray(a.pointRadius) ? a.pointRadius.slice() : [],
          pointBorderWidth: Array.isArray(a.pointBorderWidth) ? a.pointBorderWidth.slice() : []
        };
      });
    } catch(e){
      console.error('Error al construir snapshot.actions', e);
      alert('Error preparando el guardado (ver consola)');
      return null;
    }
    return snap;
  }

  function manualSave(){
    const snap = getSnapshot();
    if (!snap) return;
    try {
      const all = JSON.parse(localStorage.getItem(KEY) || '[]');
      all.push(snap);
      localStorage.setItem(KEY, JSON.stringify(all));
      refreshSavedList();
      alert('Partida guardada localmente');
    } catch(e){
      console.error('Error guardando partida', e);
      alert('Error guardando partida (ver consola)');
    }
  }

  function refreshSavedList(){
    const sel = qs('saved-list');
    if (!sel) return;
    const all = JSON.parse(localStorage.getItem(KEY) || '[]');
    sel.innerHTML = '';
    if (!all.length) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = '-- Sin partidas guardadas --';
      sel.appendChild(opt);
      return;
    }
    all.slice().reverse().forEach(s=>{
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = `${new Date(s.date).toLocaleString()} (${s.numPlayers}j)`;
      sel.appendChild(opt);
    });
  }

  function loadSelected(){
    const sel = qs('saved-list');
    if (!sel) return;
    const id = sel.value;
    if (!id) return alert('Seleccioná una partida');
    try {
      const all = JSON.parse(localStorage.getItem(KEY) || '[]');
      const item = all.find(x=>String(x.id) === String(id));
      if (!item) return alert('No encontrada');
      // Cargamos datos en actions (sobrescribimos arrays)
      Object.keys(item.actions).forEach(name => {
        if (!window.actions[name]) return;
        window.actions[name].color = item.actions[name].color;
        window.actions[name].values = item.actions[name].values.slice();
        window.actions[name].minSquares = item.actions[name].minSquares.slice();
        window.actions[name].maxSquares = item.actions[name].maxSquares.slice();
        window.actions[name].overflow = item.actions[name].overflow.slice();
        window.actions[name].pointStyle = item.actions[name].pointStyle.slice();
        window.actions[name].pointRadius = item.actions[name].pointRadius.slice();
        window.actions[name].pointBorderWidth = item.actions[name].pointBorderWidth.slice();
      });
      window.numPlayers = item.numPlayers;
      window.totalTurns = item.totalTurns;
      window.currentTurn = item.currentTurn;
      if (typeof window.updateChart === 'function') window.updateChart();
      alert('Partida cargada');
    } catch(e){
      console.error('Error al cargar partida', e);
      alert('Error al cargar partida (ver consola)');
    }
  }

  function deleteSelected(){
    const sel = qs('saved-list');
    if (!sel) return;
    const id = sel.value;
    if (!id) return alert('Seleccioná una partida');
    try {
      let all = JSON.parse(localStorage.getItem(KEY) || '[]');
      all = all.filter(x=>String(x.id) !== String(id));
      localStorage.setItem(KEY, JSON.stringify(all));
      refreshSavedList();
      alert('Partida borrada');
    } catch(e){
      console.error('Error borrando partida', e);
      alert('Error al borrar (ver consola)');
    }
  }

  function downloadLastJson(){
    try {
      const all = JSON.parse(localStorage.getItem(KEY) || '[]');
      if (!all.length) return alert('No hay partidas guardadas');
      const last = all[all.length-1];
      const blob = new Blob([JSON.stringify(last, null, 2)], {type:'application/json'});
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `acciones_partida_${last.id}.json`;
      a.click();
    } catch(e){
      console.error('Error exportando JSON', e);
      alert('Error exportando JSON (ver consola)');
    }
  }

  function exportPNG(){
    const canvas = qs('gameChart');
    if (!canvas) return alert('No se encontró el canvas');
    try {
      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = `acciones_grafico_${Date.now()}.png`;
      a.click();
    } catch(e){
      console.error('Error al exportar PNG', e);
      alert('Error al exportar PNG (ver consola)');
    }
  }

  // PWA install prompt handling
  let deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', (e)=>{
    e.preventDefault();
    deferredPrompt = e;
    const btn = qs('install-btn');
    if (btn) btn.style.display = 'inline-block';
  });

  function promptInstall(){
    if (!deferredPrompt) return alert('Instalación no disponible');
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(choice => {
      deferredPrompt = null;
      const btn = qs('install-btn');
      if (btn) btn.style.display = 'none';
    });
  }

  // Build controls row (same layout as before)
  function createControls() {
    const controls = qs('controls');
    if (!controls) return;
    if (qs('pwa-controls')) return; // evitar duplicados
    const wrapper = document.createElement('div');
    wrapper.id = 'pwa-controls';
    wrapper.style.display = 'flex';
    wrapper.style.gap = '8px';
    wrapper.style.alignItems = 'center';
    wrapper.style.flexWrap = 'wrap';
    wrapper.style.justifyContent = 'center';
    wrapper.innerHTML = `
      <button class="btn" id="save-game">Guardar partida</button>
      <button class="btn" id="export-json">Descargar última (.json)</button>
      <button class="btn" id="export-png">Exportar gráfico (PNG)</button>
      <select id="saved-list" style="min-width:160px"></select>
      <button class="btn" id="load-saved">Cargar</button>
      <button class="btn" id="delete-saved">Borrar</button>
      <button class="btn" id="install-btn" style="display:none">Instalar app</button>
    `;
    controls.appendChild(wrapper);

    qs('save-game').addEventListener('click', manualSave);
    qs('export-json').addEventListener('click', downloadLastJson);
    qs('export-png').addEventListener('click', exportPNG);
    qs('load-saved').addEventListener('click', loadSelected);
    qs('delete-saved').addEventListener('click', deleteSelected);
    qs('install-btn').addEventListener('click', promptInstall);

    refreshSavedList();
  }

  // Poner funciones útiles en window para debug (opcional)
  window.pwa_manualSave = manualSave;
  window.pwa_refreshSavedList = refreshSavedList;
  window.pwa_loadSelected = loadSelected;

  document.addEventListener('DOMContentLoaded', ()=>{
    createControls();
  });

})();
