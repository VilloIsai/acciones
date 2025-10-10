
// pwa_save.js - adds save/load/export + PWA install hook without modifying game logic
(function(){
  const KEY = 'acciones_saved_games_v1';

  function qs(id){ return document.getElementById(id); }

  function createControls() {
    const controls = qs('controls');
    if (!controls) return;
    // container
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

    // attach events
    qs('save-game').addEventListener('click', manualSave);
    qs('export-json').addEventListener('click', downloadLastJson);
    qs('export-png').addEventListener('click', exportPNG);
    qs('load-saved').addEventListener('click', loadSelected);
    qs('delete-saved').addEventListener('click', deleteSelected);
    qs('install-btn').addEventListener('click', promptInstall);
    refreshSavedList();
  }

  function getSnapshot(){
    if (typeof actions === 'undefined') { alert('No se detectó el juego (variable actions)'); return null; }
    return {
      id: Date.now(),
      date: new Date().toISOString(),
      numPlayers: window.numPlayers || 2,
      totalTurns: window.totalTurns || 20,
      currentTurn: window.currentTurn || 0,
      history: window.history || [],
      actions: Object.keys(window.actions).reduce((o,k)=>{
        o[k] = {
          color: window.actions[k].color,
          values: window.actions[k].values,
          minSquares: window.actions[k].minSquares,
          maxSquares: window.actions[k].maxSquares,
          overflow: window.actions[k].overflow,
          pointStyle: window.actions[k].pointStyle,
          pointRadius: window.actions[k].pointRadius,
          pointBorderWidth: window.actions[k].pointBorderWidth
        };
        return o;
      }, {})
    };
  }

  function manualSave(){
    const snap = getSnapshot();
    if (!snap) return;
    const all = JSON.parse(localStorage.getItem(KEY) || '[]');
    all.push(snap);
    localStorage.setItem(KEY, JSON.stringify(all));
    refreshSavedList();
    alert('Partida guardada localmente');
  }

  function refreshSavedList(){
    const sel = qs('saved-list');
    if (!sel) return;
    const all = JSON.parse(localStorage.getItem(KEY) || '[]');
    sel.innerHTML = '';
    all.slice().reverse().forEach(s=>{
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = `${new Date(s.date).toLocaleString()} (${s.numPlayers}j)`;
      sel.appendChild(opt);
    });
    if (sel.options.length===0){
      const opt = document.createElement('option');
      opt.textContent = '-- Sin partidas guardadas --';
      opt.value = '';
      sel.appendChild(opt);
    }
  }

  function loadSelected(){
    const sel = qs('saved-list');
    if (!sel) return;
    const id = sel.value;
    if (!id) return alert('Seleccioná una partida');
    const all = JSON.parse(localStorage.getItem(KEY) || '[]');
    const item = all.find(x=>String(x.id) === String(id));
    if (!item) return alert('No encontrada');
    // replace actions and state, preserving functions
    try {
      Object.keys(item.actions).forEach(name => {
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
      // call existing update function
      if (typeof window.updateChart === 'function') window.updateChart();
      alert('Partida cargada');
    } catch(e){
      console.error(e);
      alert('Error al cargar partida');
    }
  }

  function deleteSelected(){
    const sel = qs('saved-list');
    if (!sel) return;
    const id = sel.value;
    if (!id) return alert('Seleccioná una partida');
    let all = JSON.parse(localStorage.getItem(KEY) || '[]');
    all = all.filter(x=>String(x.id) !== String(id));
    localStorage.setItem(KEY, JSON.stringify(all));
    refreshSavedList();
    alert('Partida borrada');
  }

  function downloadLastJson(){
    const all = JSON.parse(localStorage.getItem(KEY) || '[]');
    if (!all.length) return alert('No hay partidas guardadas');
    const last = all[all.length-1];
    const blob = new Blob([JSON.stringify(last, null, 2)], {type:'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `acciones_partida_${last.id}.json`;
    a.click();
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
      console.error(e);
      alert('Error al exportar PNG');
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
      qs('install-btn').style.display = 'none';
    });
  }

  // Initialize on DOM ready
  document.addEventListener('DOMContentLoaded', ()=>{
    createControls();
  });
})();
