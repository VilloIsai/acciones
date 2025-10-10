// pwa_save.js - Guarda screenshots (PNGs) del canvas #gameChart y muestra lista para descargar/preview/delete
(function(){
  const KEY_SNAPS = 'acciones_screenshots_v1';
  const KEY_STATE = 'acciones_saved_games_v1'; // si querés mantener snapshot JSON también
  function qs(id){ return document.getElementById(id); }

  // crea fila de controles (o actualiza si ya existe)
  function createControls(){
    const controls = qs('controls');
    if (!controls) return;
    if (qs('pwa-controls')) return; // ya creado

    const wrapper = document.createElement('div');
    wrapper.id = 'pwa-controls';
    wrapper.style.display = 'flex';
    wrapper.style.gap = '8px';
    wrapper.style.alignItems = 'center';
    wrapper.style.flexWrap = 'wrap';
    wrapper.style.justifyContent = 'center';

    wrapper.innerHTML = `
      <button class="btn" id="save-screenshot">Guardar partida (screenshot)</button>
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
    qs('download-last-json').addEventListener('click', downloadLastJson);
    qs('export-chart-png').addEventListener('click', exportPNG);
    qs('snaps-preview').addEventListener('click', previewSelected);
    qs('snaps-download').addEventListener('click', downloadSelected);
    qs('snaps-delete').addEventListener('click', deleteSelectedSnap);
    qs('install-btn').addEventListener('click', promptInstall);

    refreshSnapsList();
  }

  // Obtener lista de screenshots del localStorage
  function getSnaps(){
    try {
      return JSON.parse(localStorage.getItem(KEY_SNAPS) || '[]');
    } catch(e){
      console.error('getSnaps parse error', e);
      return [];
    }
  }
  function setSnaps(a){ localStorage.setItem(KEY_SNAPS, JSON.stringify(a)); }

  // Guardar screenshot del canvas #gameChart
  function saveScreenshot(){
    try {
      const canvas = qs('gameChart');
      if (!canvas) return alert('No se encontró el gráfico (canvas #gameChart).');
      // toDataURL; si falla por CORS, avisar
      let url;
      try { url = canvas.toDataURL('image/png'); }
      catch(e){
        console.error('Error toDataURL', e);
        return alert('No se pudo capturar el gráfico (posible problema CORS).');
      }

      const snaps = getSnaps();
      const id = Date.now();
      const idx = snaps.length + 1;
      const snap = {
        id,
        date: new Date().toISOString(),
        filename: `acciones_snap_${idx}_${id}.png`,
        numPlayers: window.numPlayers || null,
        currentTurn: window.currentTurn || null,
        totalTurns: window.totalTurns || null,
        dataURL: url
      };
      snaps.push(snap);
      setSnaps(snaps);
      refreshSnapsList();
      alert('Captura guardada ✔');
    } catch(e){
      console.error('saveScreenshot error', e);
      alert('Error guardando captura (ver consola)');
    }
  }

  // Refrescar select con las capturas
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
    // mostramos con índice y fecha y turno
    snaps.slice().reverse().forEach(s=>{
      const opt = document.createElement('option');
      opt.value = s.id;
      const d = new Date(s.date);
      const turned = s.currentTurn ? `turno ${s.currentTurn}` : '';
      opt.textContent = `${d.toLocaleString()} ${turned} (${s.numPlayers? s.numPlayers+'j':''})`;
      sel.appendChild(opt);
    });
  }

  // Preview (abre modal con la imagen)
  function previewSelected(){
    const sel = qs('snaps-list');
    if (!sel || !sel.value) return alert('Seleccioná una captura');
    const snaps = getSnaps();
    const snap = snaps.find(s => String(s.id) === String(sel.value));
    if (!snap) return alert('No encontrada');
    showImageModal(snap.dataURL, snap.filename);
  }

  // Descargar
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

  // Borrar seleccionada
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

  // Modal helper
  function showImageModal(dataURL, filename){
    // crear modal sencillo
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

  // Exportar el gráfico actual (igual que screenshot pero sin guardarlo en lista)
  function exportPNG(){
    try {
      const canvas = qs('gameChart');
      if (!canvas) return alert('No se encontró el canvas');
      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = `acciones_grafico_${Date.now()}.png`;
      a.click();
    } catch(e){
      console.error('exportPNG error', e);
      alert('Error al exportar PNG');
    }
  }

  // Descargar último snapshot JSON (si existe)
  function downloadLastJson(){
    try {
      const arr = JSON.parse(localStorage.getItem(KEY_STATE) || '[]');
      if (!arr.length) return alert('No hay JSON guardado');
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

  // PWA install prompt
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

  // Exponer helpers mínimos para debug
  window.pwa_refreshSnapsList = refreshSnapsList;
  window.pwa_getSnaps = getSnaps;

  document.addEventListener('DOMContentLoaded', ()=>{
    createControls();
  });

})();
