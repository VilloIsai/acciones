// pwa_save.js - Versión robusta: screenshots + safe JSON snapshot (no rompe si actions undefined)
(function(){
  const KEY_SNAPS = 'acciones_screenshots_v1';
  const KEY_STATE = 'acciones_saved_games_v1';

  const qs = id => document.getElementById(id);

  function getSnaps(){
    try { return JSON.parse(localStorage.getItem(KEY_SNAPS) || '[]'); }
    catch(e){ console.error('getSnaps parse', e); return []; }
  }
  function setSnaps(a){ localStorage.setItem(KEY_SNAPS, JSON.stringify(a)); }

  // safe snapshot builder: retorna null si actions no está disponible
  function buildSnapshotSafe(){
    if (typeof window.actions === 'undefined' || !window.actions) return null;
    try {
      const snap = {
        id: Date.now(),
        date: new Date().toISOString(),
        numPlayers: window.numPlayers || null,
        totalTurns: window.totalTurns || null,
        currentTurn: window.currentTurn || null,
        history: (Array.isArray(window.history) ? JSON.parse(JSON.stringify(window.history)) : []),
        actions: {}
      };
      Object.keys(window.actions).forEach(k=>{
        const a = window.actions[k] || {};
        snap.actions[k] = {
          color: a.color || null,
          values: Array.isArray(a.values) ? a.values.slice() : [],
          minSquares: Array.isArray(a.minSquares) ? a.minSquares.slice() : [],
          maxSquares: Array.isArray(a.maxSquares) ? a.maxSquares.slice() : [],
          overflow: Array.isArray(a.overflow) ? a.overflow.slice() : [],
          pointStyle: Array.isArray(a.pointStyle) ? a.pointStyle.slice() : [],
          pointRadius: Array.isArray(a.pointRadius) ? a.pointRadius.slice() : [],
          pointBorderWidth: Array.isArray(a.pointBorderWidth) ? a.pointBorderWidth.slice() : []
        };
      });
      return snap;
    } catch(err){
      console.error('buildSnapshotSafe error', err);
      return null;
    }
  }

  // Save screenshot of canvas#gameChart
  function saveScreenshot(){
    const canvas = qs('gameChart');
    if (!canvas) return alert('No se encontró el gráfico (canvas #gameChart).');
    try {
      const dataURL = canvas.toDataURL('image/png');
      const snaps = getSnaps();
      snaps.push({
        id: Date.now(),
        date: new Date().toISOString(),
        filename: `acciones_snap_${snaps.length+1}_${Date.now()}.png`,
        numPlayers: window.numPlayers || null,
        currentTurn: window.currentTurn || null,
        totalTurns: window.totalTurns || null,
        dataURL
      });
      setSnaps(snaps);
      refreshSnapsList();
      alert('Captura guardada ✔');
    } catch(e){
      console.error('saveScreenshot', e);
      alert('No se pudo guardar la captura (ver consola). Puede ser problema CORS si usás imágenes externas).');
    }
  }

  // Safe manual save JSON (fallback, only if actions exists)
  function manualSaveSafe(){
    const snap = buildSnapshotSafe();
    if (!snap) return alert('No es posible guardar snapshot JSON porque la estructura del juego no está lista (actions indefinida).');
    try {
      const arr = JSON.parse(localStorage.getItem(KEY_STATE) || '[]');
      arr.push(snap);
      localStorage.setItem(KEY_STATE, JSON.stringify(arr));
      alert('Snapshot JSON guardado ✔ (también podés guardar la imagen con "Guardar partida")');
    } catch(e){
      console.error('manualSaveSafe', e);
      alert('Error guardando snapshot JSON (ver consola).');
    }
  }

  function downloadLastJson(){
    try {
      const arr = JSON.parse(localStorage.getItem(KEY_STATE) || '[]');
      if (!arr.length) return alert('No hay snapshots JSON guardados');
      const last = arr[arr.length-1];
      const blob = new Blob([JSON.stringify(last, null, 2)], {type:'application/json'});
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `acciones_partida_${last.id}.json`;
      a.click();
    } catch(e){
      console.error('downloadLastJson', e);
      alert('Error al descargar JSON');
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
      console.error('exportPNG', e);
      alert('Error al exportar PNG');
    }
  }

  function refreshSnapsList(){
    const sel = qs('snaps-list');
    if (!sel) return;
    const snaps = getSnaps();
    sel.innerHTML = '';
    if (!snaps.length){
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = '-- sin capturas --';
      sel.appendChild(opt);
      return;
    }
    snaps.slice().reverse().forEach(s=>{
      const opt = document.createElement('option');
      opt.value = s.id;
      const d = new Date(s.date);
      opt.textContent = `${d.toLocaleString()} ${s.currentTurn? ' - turno '+s.currentTurn : ''} (${s.numPlayers? s.numPlayers+'j':''})`;
      sel.appendChild(opt);
    });
  }

  function previewSelected(){
    const sel = qs('snaps-list');
    if (!sel || !sel.value) return alert('Seleccioná una captura');
    const snaps = getSnaps();
    const snap = snaps.find(s => String(s.id) === String(sel.value));
    if (!snap) return alert('No encontrada');
    showImageModal(snap.dataURL, snap.filename);
  }

  function downloadSelected(){
    const sel = qs('snaps-list');
    if (!sel || !sel.value) return alert('Seleccioná una captura');
    const snaps = getSnaps();
    const snap = snaps.find(s => String(s.id) === String(sel.value));
    if (!snap) return alert('No encontrada');
    const a = document.createElement('a');
    a.href = snap.dataURL;
    a.download = snap.filename;
    a.click();
  }

  function deleteSelectedSnap(){
    const sel = qs('snaps-list');
    if (!sel || !sel.value) return alert('Seleccioná una captura');
    const id = String(sel.value);
    let snaps = getSnaps();
    snaps = snaps.filter(s => String(s.id) !== id);
    setSnaps(snaps);
    refreshSnapsList();
    alert('Captura borrada');
  }

  function showImageModal(dataURL, filename){
    let modal = qs('pwa-snap-modal');
    if (!modal){
      modal = document.createElement('div');
      modal.id = 'pwa-snap-modal';
      modal.style.position = 'fixed';
      modal.style.inset = '0';
      modal.style.background = 'rgba(0,0,0,0.6)';
      modal.style.display = 'flex';
      modal.style.alignItems = 'center';
      modal.style.justifyContent = 'center';
      modal.style.zIndex = 9999;
      modal.onclick = ()=> modal.style.display = 'none';
      const inner = document.createElement('div');
      inner.style.maxWidth = '90%';
      inner.style.maxHeight = '90%';
      inner.style.background = '#fff';
      inner.style.padding = '8px';
      inner.style.borderRadius = '8px';
      inner.style.boxShadow = '0 10px 30px rgba(0,0,0,0.3)';
      const img = document.createElement('img');
      img.id = 'pwa-snap-img';
      img.style.maxWidth = '100%';
      img.style.maxHeight = '80vh';
      const dl = document.createElement('a');
      dl.id = 'pwa-snap-dl';
      dl.textContent = 'Descargar';
      dl.style.display = 'inline-block';
      dl.style.marginTop = '8px';
      dl.className = 'btn';
      inner.appendChild(img);
      inner.appendChild(dl);
      modal.appendChild(inner);
      document.body.appendChild(modal);
    }
    const img = qs('pwa-snap-img');
    const dl = qs('pwa-snap-dl');
    img.src = dataURL;
    dl.href = dataURL;
    dl.download = filename || 'captura.png';
    modal.style.display = 'flex';
  }

  // PWA install prompt (no cambia)
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
    deferredPrompt.userChoice.then(()=> {
      deferredPrompt = null;
      const btn = qs('install-btn');
      if (btn) btn.style.display = 'none';
    });
  }

  // Create controls row (or do nothing if no controls container)
  function createControls(){
    const controls = qs('controls');
    if (!controls) return;
    if (qs('pwa-controls')) return;
    const wrapper = document.createElement('div');
    wrapper.id = 'pwa-controls';
    wrapper.style.display = 'flex';
    wrapper.style.gap = '8px';
    wrapper.style.alignItems = 'center';
    wrapper.style.flexWrap = 'wrap';
    wrapper.style.justifyContent = 'center';
    wrapper.innerHTML = `
      <button class="btn" id="save-screenshot">Guardar partida (screenshot)</button>
      <button class="btn" id="manual-save-json">Guardar snapshot JSON (opcional)</button>
      <button class="btn" id="download-last-json">Descargar última (.json)</button>
      <button class="btn" id="export-chart-png">Exportar gráfico (PNG)</button>
      <div id="snaps-container" style="display:flex;gap:6px;align-items:center">
        <select id="snaps-list" style="min-width:180px"></select>
        <button class="btn" id="snaps-preview">Preview</button>
        <button class="btn" id="snaps-download">Descargar</button>
        <button class="btn" id="snaps-delete">Borrar</button>
      </div>
      <button class="btn" id="install-btn" style="display:none">Instalar app</button>
    `;
    controls.appendChild(wrapper);

    qs('save-screenshot').addEventListener('click', saveScreenshot);
    qs('manual-save-json').addEventListener('click', manualSaveSafe);
    qs('download-last-json').addEventListener('click', downloadLastJson);
    qs('export-chart-png').addEventListener('click', exportPNG);
    qs('snaps-preview').addEventListener('click', previewSelected);
    qs('snaps-download').addEventListener('click', downloadSelected);
    qs('snaps-delete').addEventListener('click', deleteSelectedSnap);
    qs('install-btn').addEventListener('click', promptInstall);

    refreshSnapsList();
  }

  // Expose a small API for debugging
  window.pwa_saveScreenshot = saveScreenshot;
  window.pwa_refreshSnapsList = refreshSnapsList;

  document.addEventListener('DOMContentLoaded', createControls);
})();
