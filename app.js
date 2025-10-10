// app.js - lógica mínima: crear jugadores, turnos, guardar en localStorage, undo y gráfico final
const STORAGE_KEY = 'acciones_game_saved';
let gameState = null;

function createPlayers(n){
  return Array.from({length:n},(_,i)=>({
    id: i+1,
    name: `Jugador ${i+1}`,
    alimentos: 5,
    placer: 5,
    salud: 5,
    oro: Math.floor(Math.random()*3)
  }));
}

function render(){
  const area = document.getElementById('players-area');
  if(!gameState){ area.innerHTML = '<p>No hay partida iniciada.</p>'; return; }
  area.innerHTML = '';
  gameState.players.forEach(p=>{
    const el = document.createElement('div');
    el.className = 'player-card';
    el.innerHTML = `<h4>${p.name}</h4>
      <p>Alimentos: ${p.alimentos}</p>
      <p>Placer: ${p.placer}</p>
      <p>Salud: ${p.salud}</p>
      <p>Oro: ${p.oro}</p>
      <div style="margin-top:6px">
        <button data-act="gain" data-id="${p.id}">+ Oro</button>
        <button data-act="lose" data-id="${p.id}">- Oro</button>
      </div>`;
    area.appendChild(el);
  });
  // attach buttons
  area.querySelectorAll('button[data-act]').forEach(b=>{
    b.addEventListener('click', e=>{
      const id = Number(b.dataset.id);
      const act = b.dataset.act;
      if(act==='gain') doAction({type:'mod', playerId:id, change:{oro:1}});
      else doAction({type:'mod', playerId:id, change:{oro:-1}});
    });
  });
}

function startGame(n){
  gameState = {
    players: createPlayers(n),
    turn: 1,
    history: []
  };
  saveTemp();
  render();
  refreshSavedList();
}

function doAction(action){
  gameState.history.push(JSON.stringify(gameState.players));
  const p = gameState.players.find(x=>x.id===action.playerId);
  for(const k in action.change) p[k] = (p[k]||0) + action.change[k];
  saveTemp();
  render();
}

function undo(){
  if(!gameState || gameState.history.length===0){ alert('Nada para deshacer'); return; }
  const last = gameState.history.pop();
  gameState.players = JSON.parse(last);
  saveTemp();
  render();
}

function nextTurn(){
  if(!gameState){ alert('Inicia una partida primero'); return; }
  gameState.turn++;
  gameState.players.forEach(p=>{
    if(p.salud < 3) p.oro = Math.max(0,p.oro-1);
  });
  gameState.history.push(JSON.stringify(gameState.players));
  saveTemp();
  render();
}

function saveTemp(){
  localStorage.setItem('acciones_game_temp', JSON.stringify(gameState));
}

function manualSave(){
  const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  const snapshot = {
    id: Date.now(),
    date: new Date().toISOString(),
    state: gameState
  };
  all.push(snapshot);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  refreshSavedList();
  alert('Partida guardada');
}

function refreshSavedList(){
  const list = document.getElementById('saved-list');
  const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  list.innerHTML = '';
  all.slice().reverse().forEach(s=>{
    const li = document.createElement('li');
    li.innerHTML = `${new Date(s.date).toLocaleString()} 
      <button data-load="${s.id}">Cargar</button>
      <button data-del="${s.id}">Borrar</button>`;
    list.appendChild(li);
  });
  list.querySelectorAll('button[data-load]').forEach(b=>{
    b.addEventListener('click', ()=> {
      const id = Number(b.dataset.load);
      const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      const item = all.find(x=>x.id===id);
      if(!item) return alert('No encontrado');
      gameState = item.state;
      saveTemp();
      render();
    });
  });
  list.querySelectorAll('button[data-del]').forEach(b=>{
    b.addEventListener('click', ()=>{
      const id = Number(b.dataset.del);
      let all = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      all = all.filter(x=>x.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
      refreshSavedList();
    });
  });
}

function clearSaved(){
  if(confirm('Borrar todas las partidas guardadas?')) {
    localStorage.removeItem(STORAGE_KEY);
    refreshSavedList();
  }
}

function loadTempIfExists(){
  const t = localStorage.getItem('acciones_game_temp');
  if(t){
    gameState = JSON.parse(t);
    render();
  }
}

function endGameAndShowChart(){
  if(!gameState){ alert('No hay partida'); return; }
  const labels = gameState.players.map(p=>p.name);
  const data = gameState.players.map(p=>p.oro);
  document.getElementById('chart-container').style.display = 'block';

  const ctx = document.getElementById('finalChart').getContext('2d');
  if(window._chart) window._chart.destroy();
  window._chart = new Chart(ctx, {
    type: 'bar',
    data: { labels, datasets: [{ label:'Oro final', data }] },
    options:{ responsive:true, maintainAspectRatio:false }
  });

  document.getElementById('export-png').onclick = ()=> {
    const url = document.getElementById('finalChart').toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `acciones_${Date.now()}.png`;
    a.click();
  };

  document.getElementById('download-json').onclick = ()=>{
    const blob = new Blob([JSON.stringify({date:new Date().toISOString(), state: gameState},null,2)], {type:'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `acciones_${Date.now()}.json`;
    a.click();
  };
}

document.getElementById('start-btn').addEventListener('click', ()=> startGame(Number(document.getElementById('player-count').value)));
document.getElementById('undo-btn').addEventListener('click', undo);
document.getElementById('next-turn').addEventListener('click', nextTurn);
document.getElementById('save-manual').addEventListener('click', manualSave);
document.getElementById('clear-saved').addEventListener('click', clearSaved);
document.getElementById('end-game').addEventListener('click', endGameAndShowChart);

loadTempIfExists();
refreshSavedList();
