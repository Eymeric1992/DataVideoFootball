const actions = {
  "Passe": { success: "✅", fail: "❌" },
  "Duel offensif": { success: "✅", fail: "❌" },
  "Duel defensif": { success: "✅", fail: "❌" },
  "Récupération": { success: "✅" },
  "Perte": { fail: "❌" },
  "Tir": { success: "✅", fail: "❌" },
  "But": { success: "✅" },
  "Passe D": { success: "✅" }
};
let teams = { team1: { name: "Équipe 1", players: [] }, team2: { name: "Équipe 2", players: [] } };
let data = [];
let chrono = 0;
let interval = null;
let isChronoRunning = false;
let playerPool = JSON.parse(localStorage.getItem('playerPool')) || [];
let teamChart = null;
let playerCharts = {};

function loadData() {
  const savedTeams = localStorage.getItem('teams');
  const savedData = localStorage.getItem('matchData');
  if (savedTeams) teams = JSON.parse(savedTeams);
  if (savedData) data = JSON.parse(savedData);
  updatePlayers();
  document.getElementById('team1Label').textContent = teams.team1.name;
  document.getElementById('team2Label').textContent = teams.team2.name;
  updateLog();
  updateSummary();
  updateCharts();
  updatePlayerPool();
}

function saveData() {
  localStorage.setItem('teams', JSON.stringify(teams));
  localStorage.setItem('matchData', JSON.stringify(data));
  localStorage.setItem('playerPool', JSON.stringify(playerPool));
}

function formatTime(sec) {
  const min = Math.floor(sec / 60);
  const s = sec % 60;
  return `${min.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function startChrono() {
  if (!interval) {
    interval = setInterval(() => {
      chrono++;
      document.getElementById('chrono').textContent = formatTime(chrono);
    }, 1000);
    isChronoRunning = true;
    updateActionButtons();
  }
}

function pauseChrono() {
  clearInterval(interval);
  interval = null;
  isChronoRunning = false;
  updateActionButtons();
}

function resetChrono() {
  pauseChrono();
  chrono = 0;
  document.getElementById('chrono').textContent = formatTime(0);
  updateActionButtons();
}

function resetStats() {
  data = [];
  updateLog();
  updateSummary();
  updateCharts();
  saveData();
  showMessage("Statistiques réinitialisées avec succès !");
}

function clearAllData() {
  teams = { team1: { name: "Équipe 1", players: [] }, team2: { name: "Équipe 2", players: [] } };
  data = [];
  chrono = 0;
  document.getElementById('chrono').textContent = formatTime(0);
  document.getElementById('team1Label').textContent = teams.team1.name;
  document.getElementById('team2Label').textContent = teams.team2.name;
  document.getElementById('team1Players').innerHTML = '';
  document.getElementById('team2Players').innerHTML = '';
  document.getElementById('log').classList.add('hidden');
  document.getElementById('log').innerHTML = '';
  document.getElementById('summaryBody').innerHTML = '';
  if (teamChart) teamChart.destroy();
  for (let chart in playerCharts) playerCharts[chart].destroy();
  playerCharts = {};
  pauseChrono();
  saveData(); // Sauvegarde pour préserver le playerPool
  showMessage("Toutes les données du match ont été effacées avec succès ! Le pool de joueurs est préservé.");
}

function updateActionButtons() {
  const buttons = document.querySelectorAll('.action-btn');
  buttons.forEach(button => {
    button.disabled = !isChronoRunning;
    if (!isChronoRunning) {
      button.title = "Démarrez le chrono pour activer cette action.";
    } else {
      button.title = "";
    }
  });
}

function showMessage(message) {
  const msgDiv = document.getElementById('addMessage');
  msgDiv.textContent = message;
  setTimeout(() => { msgDiv.textContent = ''; }, 2000);
}

function addPlayer(team) {
  const input = document.getElementById(team === 'team1' ? 'player1Name' : 'player2Name');
  const numberInput = document.getElementById(team === 'team1' ? 'player1Number' : 'player2Number');
  const positionSelect = document.getElementById(team === 'team1' ? 'player1Position' : 'player2Position');
  const teamNameInput = document.getElementById(team === 'team1' ? 'team1Name' : 'team2Name');
  const playerName = input.value.trim();
  const playerNumber = numberInput.value.trim();
  const playerPosition = positionSelect.value;
  const teamName = teamNameInput.value.trim() || teams[team].name;

  if (playerName && playerNumber && !teams[team].players.some(p => p.number === parseInt(playerNumber))) {
    teams[team].players.push({ name: playerName, number: parseInt(playerNumber), position: playerPosition });
    if (teamName !== teams[team].name) {
      teams[team].name = teamName;
      document.getElementById(team === 'team1' ? 'team1Label' : 'team2Label').textContent = teamName;
    }
    input.value = '';
    numberInput.value = '';
    updatePlayers();
    updateSummary();
    updateCharts();
    saveData();
    showMessage(`Joueur ${playerName} (#${playerNumber}, ${playerPosition}) ajouté avec succès à ${teamName} !`);
  } else {
    showMessage('Veuillez entrer un nom et un numéro unique.');
  }
}

function clearTeam(team) {
  teams[team].players = [];
  teams[team].name = team === 'team1' ? 'Équipe 1' : 'Équipe 2';
  document.getElementById(team === 'team1' ? 'team1Label' : 'team2Label').textContent = teams[team].name;
  updatePlayers();
  updateSummary();
  updateCharts();
  saveData();
  showMessage(`Équipe ${teams[team].name} effacée avec succès !`);
}

function updatePlayers() {
  ['team1', 'team2'].forEach(team => {
    const table = document.getElementById(`${team}Players`);
    table.innerHTML = '';

    // En-tête
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    headerRow.innerHTML = `<th>Nom (#, Poste)</th>`;
    for (let action in actions) {
      headerRow.innerHTML += `<th>${action}</th>`;
    }
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Corps
    const tbody = document.createElement('tbody');
    teams[team].players.sort((a, b) => a.number - b.number).forEach(player => {
      const row = document.createElement('tr');

      // Nom, numéro, poste avec bouton de suppression
      const playerCell = document.createElement('td');
      playerCell.textContent = `${player.name} (#${player.number}, ${player.position})`;
      const deleteBtn = document.createElement('button');
      deleteBtn.textContent = '✖';
      deleteBtn.onclick = () => removePlayer(team, player);
      playerCell.appendChild(document.createElement('br'));
      playerCell.appendChild(deleteBtn);
      row.appendChild(playerCell);

      // Icônes pour chaque action
      for (let action in actions) {
        const td = document.createElement('td');
        td.style.padding = '2px';
        if (actions[action].success && actions[action].fail) {
          const btnSuccess = document.createElement('button');
          btnSuccess.textContent = actions[action].success;
          btnSuccess.className = 'action-btn success';
          btnSuccess.disabled = !isChronoRunning;
          btnSuccess.title = !isChronoRunning ? "Démarrez le chrono pour activer cette action." : "";
          btnSuccess.onclick = () => logAction(team, player, action, true);

          const btnFail = document.createElement('button');
          btnFail.textContent = actions[action].fail;
          btnFail.className = 'action-btn fail';
          btnFail.disabled = !isChronoRunning;
          btnFail.title = !isChronoRunning ? "Démarrez le chrono pour activer cette action." : "";
          btnFail.onclick = () => logAction(team, player, action, false);

          td.appendChild(btnSuccess);
          td.appendChild(btnFail);
        } else if (actions[action].success) {
          const btn = document.createElement('button');
          btn.textContent = actions[action].success;
          btn.className = 'action-btn success';
          btn.disabled = !isChronoRunning;
          btn.title = !isChronoRunning ? "Démarrez le chrono pour activer cette action." : "";
          btn.onclick = () => logAction(team, player, action, true);
          td.appendChild(btn);
        } else {
          const btn = document.createElement('button');
          btn.textContent = actions[action].fail;
          btn.className = 'action-btn fail';
          btn.disabled = !isChronoRunning;
          btn.title = !isChronoRunning ? "Démarrez le chrono pour activer cette action." : "";
          btn.onclick = () => logAction(team, player, action, false);
          td.appendChild(btn);
        }
        row.appendChild(td);
      }
      tbody.appendChild(row);
    });
    table.appendChild(tbody);
  });
}

function removePlayer(team, playerToRemove) {
  teams[team].players = teams[team].players.filter(p => p.number !== playerToRemove.number);
  updatePlayers();
  updateSummary();
  updateCharts();
  saveData();
  showMessage(`Joueur ${playerToRemove.name} supprimé avec succès de ${teams[team].name} !`);
}

function toggleLog() {
  const log = document.getElementById('log');
  log.classList.toggle('hidden');
}

function logAction(team, player, action, success) {
  const entry = {
    team: teams[team].name,
    player: player.name,
    number: player.number,
    position: player.position,
    action: action,
    success: success,
    minute: formatTime(chrono),
    seconds: chrono
  };
  data.push(entry);
  updateLog();
  updateSummary();
  updateCharts();
  saveData();
}

function updateLog() {
  const log = document.getElementById('log');
  log.innerHTML = '';
  data.forEach(entry => {
    const li = document.createElement('li');
    li.textContent = `${entry.minute} - ${entry.team} - ${entry.player} (#${entry.number}, ${entry.position}) : ${entry.action} (${entry.success ? 'Réussi' : 'Raté'})`;
    log.appendChild(li);
  });
}

function updateSummary() {
  const showPercentage = document.getElementById('showPercentage').checked;
  const summaryBody = document.getElementById('summaryBody');
  summaryBody.innerHTML = '';

  ['team1', 'team2'].forEach(team => {
    teams[team].players.forEach(player => {
      const stats = {};
      for (let action in actions) {
        stats[action] = { success: 0, total: 0 };
      }

      data.filter(d => d.team === teams[team].name && d.player === player.name).forEach(d => {
        if (stats[d.action]) {
          stats[d.action].total++;
          if (d.success) stats[d.action].success++;
        }
      });

      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${teams[team].name}</td>
        <td>${player.name}</td>
        <td>${player.number}</td>
        <td>${player.position}</td>
      `;
      let hasStats = false;
      for (let action in stats) {
        if (stats[action].total > 0) {
          hasStats = true;
          const success = stats[action].success;
          const total = stats[action].total;
          if (showPercentage && action !== "Récupération" && action !== "Perte") {
            const percentage = total > 0 ? Math.round((success / total) * 100) : 0;
            row.innerHTML += `<td>${percentage}% (${success}/${total})</td>`;
          } else {
            row.innerHTML += `<td>${total}</td>`; // Juste le total pour Récupération et Perte
          }
        } else {
          row.innerHTML += `<td></td>`;
        }
      }
      if (hasStats) summaryBody.appendChild(row);
    });
  });
}

function updateCharts() {
  updateTeamChart();
  updatePlayerCharts();
}

function updateTeamChart() {
  const ctx = document.getElementById('teamChart').getContext('2d');
  if (teamChart) teamChart.destroy();

  const stats = {};
  for (let action in actions) {
    stats[action] = { success: 0, fail: 0 };
  }
  data.forEach(d => {
    if (stats[d.action]) {
      if (d.success) stats[d.action].success++;
      else stats[d.action].fail++;
    }
  });

  const labels = Object.keys(stats);
  const successData = labels.map(action => stats[action].success);
  const failData = labels.map(action => stats[action].fail);

  teamChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Réussites',
          data: successData,
          backgroundColor: 'rgba(75, 192, 192, 0.6)',
          borderColor: 'rgba(75, 192, 192, 1)',
          borderWidth: 1
        },
        {
          label: 'Échecs',
          data: failData,
          backgroundColor: 'rgba(255, 99, 132, 0.6)',
          borderColor: 'rgba(255, 99, 132, 1)',
          borderWidth: 1
        }
      ]
    },
    options: {
      scales: {
        y: {
          beginAtZero: true,
          title: { display: true, text: 'Nombre d\'Actions' }
        },
        x: {
          ticks: { font: { size: 10 } }
        }
      },
      plugins: {
        legend: { display: true }
      }
    }
  });
}

function updatePlayerCharts() {
  const container = document.getElementById('playerChartsContainer');
  container.innerHTML = '';
  ['team1', 'team2'].forEach(team => {
    teams[team].players.forEach(player => {
      const stats = {};
      for (let action in actions) {
        stats[action] = { success: 0, fail: 0 };
      }
      data.filter(d => d.team === teams[team].name && d.player === player.name).forEach(d => {
        if (stats[d.action]) {
          if (d.success) stats[d.action].success++;
          else stats[d.action].fail++;
        }
      });

      const div = document.createElement('div');
      div.style.margin = '20px 0';
      const canvas = document.createElement('canvas');
      canvas.id = `chart_${player.name}_${player.number}`;
      canvas.style.maxWidth = '100%';
      canvas.style.height = '150px';
      div.appendChild(canvas);
      container.appendChild(div);

      const labels = Object.keys(stats);
      const successData = labels.map(action => stats[action].success);
      const failData = labels.map(action => stats[action].fail);

      playerCharts[`${player.name}_${player.number}`] = new Chart(canvas, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [
            {
              label: 'Réussites',
              data: successData,
              backgroundColor: 'rgba(153, 102, 255, 0.6)',
              borderColor: 'rgba(153, 102, 255, 1)',
              borderWidth: 1
            },
            {
              label: 'Échecs',
              data: failData,
              backgroundColor: 'rgba(255, 99, 132, 0.6)',
              borderColor: 'rgba(255, 99, 132, 1)',
              borderWidth: 1
            }
          ]
        },
        options: {
          scales: {
            y: {
              beginAtZero: true,
              title: { display: true, text: 'Nombre d\'Actions' }
            },
            x: {
              ticks: { font: { size: 10 } }
            }
          },
          plugins: {
            legend: { display: true }
          }
        }
      });
    });
  });
}

function showTeamChart() {
  document.getElementById('teamChartContainer').style.display = 'block';
  document.getElementById('playerChartsContainer').style.display = 'none';
  updateTeamChart();
}

function showPlayerCharts() {
  document.getElementById('teamChartContainer').style.display = 'none';
  document.getElementById('playerChartsContainer').style.display = 'block';
  updatePlayerCharts();
}

function exportJSON() {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'match_data.json';
  a.click();
  URL.revokeObjectURL(url);
  showMessage("Données exportées avec succès au format JSON !");
}

function exportSummaryCSV() {
  const headers = ['Équipe', 'Joueur', 'N°', 'Poste', 'Passe', 'Duel offensif', 'Duel defensif', 'Récupération', 'Perte', 'Tir', 'But', 'Passe D'];
  const rows = [];
  ['team1', 'team2'].forEach(team => {
    teams[team].players.forEach(player => {
      const stats = {};
      for (let action in actions) {
        stats[action] = { success: 0, total: 0 };
      }
      data.filter(d => d.team === teams[team].name && d.player === player.name).forEach(d => {
        if (stats[d.action]) {
          stats[d.action].total++;
          if (d.success) stats[d.action].success++;
        }
      });
      const row = [
        teams[team].name,
        player.name,
        player.number,
        player.position
      ];
      for (let action in stats) {
        if (action === "Récupération" || action === "Perte") {
          row.push(stats[action].total > 0 ? `${stats[action].total}` : '');
        } else {
          row.push(stats[action].total > 0 ? `${stats[action].success}/${stats[action].total}` : '');
        }
      }
      rows.push(row);
    });
  });
  const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'match_summary.csv';
  a.click();
  URL.revokeObjectURL(url);
  showMessage("Résumé exporté avec succès au format CSV !");
}

function showPlayerPool() {
  const pool = document.getElementById('playerPool');
  pool.classList.toggle('hidden');
}

function savePlayerPool() {
  const name = document.getElementById('savedPlayerName').value.trim();
  const number = document.getElementById('savedPlayerNumber').value.trim();
  const position = document.getElementById('savedPlayerPosition').value;

  if (name && number && !playerPool.some(p => p.number === parseInt(number))) {
    playerPool.push({ name, number: parseInt(number), position });
    document.getElementById('savedPlayerName').value = '';
    document.getElementById('savedPlayerNumber').value = '';
    updatePlayerPool();
    saveData();
    showMessage('Joueur ajouté avec succès au pool !');
  } else {
    showMessage('Veuillez entrer un nom et un numéro unique.');
  }
}

function updatePlayerPool() {
  const list = document.getElementById('playerPoolList');
  list.innerHTML = '';
  playerPool.sort((a, b) => a.number - b.number).forEach(player => {
    const li = document.createElement('li');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = JSON.stringify(player);
    li.appendChild(checkbox);
    li.appendChild(document.createTextNode(` ${player.name} (#${player.number}, ${player.position})`));
    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = '✖';
    deleteBtn.onclick = () => removeFromPool(player);
    li.appendChild(deleteBtn);
    list.appendChild(li);
  });
}

function removeFromPool(playerToRemove) {
  playerPool = playerPool.filter(p => p.number !== playerToRemove.number);
  updatePlayerPool();
  saveData();
  showMessage(`Joueur ${playerToRemove.name} supprimé avec succès du pool !`);
}

function addSelectedToTeam(team) {
  const checkboxes = document.querySelectorAll('#playerPoolList input[type="checkbox"]:checked');
  const teamNameInput = document.getElementById(team === 'team1' ? 'team1Name' : 'team2Name');
  const teamName = teamNameInput.value.trim() || teams[team].name;

  checkboxes.forEach(checkbox => {
    const player = JSON.parse(checkbox.value);
    if (!teams[team].players.some(p => p.number === player.number)) {
      teams[team].players.push(player);
    }
  });

  if (teamName !== teams[team].name) {
    teams[team].name = teamName;
    document.getElementById(team === 'team1' ? 'team1Label' : 'team2Label').textContent = teamName;
  }

  checkboxes.forEach(checkbox => checkbox.checked = false); // Désélectionne après ajout
  updatePlayers();
  updateSummary();
  updateCharts();
  saveData();
  showMessage(`Joueurs sélectionnés ajoutés avec succès à ${teamName} !`);
}

function loadVideo() {
  const url = document.getElementById('videoUrl').value.trim();
  if (url) {
    const videoPlayer = document.getElementById('videoPlayer');
    videoPlayer.innerHTML = `<video controls><source src="${url}" type="video/mp4">Votre navigateur ne supporte pas la vidéo.</video>`;
    document.getElementById('videoSection').style.display = 'block';
    showMessage("Vidéo chargée avec succès !");
  } else {
    showMessage("Veuillez entrer une URL de vidéo valide.");
  }
}

loadData();