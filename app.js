const WS_URL = 'wss://arduino.arroyocreativa.com';
const REST_URL = 'https://arduino.arroyocreativa.com/api/sensors';
const sensorState = {
  joystick: { x: 0, y: 0 },
  luz: 0,
  temperatura: 0,
  slider: 0,
  acelerometro: { x: 0, y: 0, z: 0 },
  botones: { btn1: 0, btn2: 0, btn3: 0, btn4: 0 },
  microfono: 0,
  timestamp: '—',
  connected: false,
};

const ui = {
  connectionStatus: document.getElementById('connectionStatus'),
  jsValue: document.getElementById('jsValue'),
  luzValue: document.getElementById('luzValue'),
  tempValue: document.getElementById('tempValue'),
  sliderValue: document.getElementById('sliderValue'),
  accValue: document.getElementById('accValue'),
  micValue: document.getElementById('micValue'),
  btnValue: document.getElementById('btnValue'),
  timestampValue: document.getElementById('timestampValue'),
  scoreValue: document.getElementById('scoreValue'),
  speedValue: document.getElementById('speedValue'),
  boostValue: document.getElementById('boostValue'),
  shieldValue: document.getElementById('shieldValue'),
  lightMeter: document.getElementById('lightMeter'),
  soundMeter: document.getElementById('soundMeter'),
  runner: document.getElementById('runner'),
  obstacles: document.getElementById('obstacles'),
  effects: document.getElementById('effects'),
};

const game = {
  lanes: ['left', 'center', 'right'],
  currentLane: 1,
  targetLane: 1,
  laneCount: 3,
  laneWidth: 0,
  lanePositions: [],
  speed: 1,
  score: 0,
  boostTime: 0,
  shieldTime: 0,
  jumpTime: 0,
  slideTime: 0,
  lastFrameAt: performance.now(),
  obstacles: [],
  maxObstacles: 6,
  obstacleInterval: 1000,
  obstacleAccumulator: 0,
  run: true,
};

let ws;
let restInterval;
let gameFrame;

function updateConnectionStatus() {
  const connected = sensorState.connected;
  ui.connectionStatus.textContent = connected ? 'Conectado' : 'Desconectado';
  ui.connectionStatus.style.color = connected ? 'var(--success)' : 'var(--danger)';
}

function setTargetLaneFromJoystick() {
  const x = sensorState.joystick.x;
  if (x > 230) game.targetLane = 2;
  else if (x > 70) game.targetLane = 1;
  else if (x < -230) game.targetLane = 0;
  else if (x < -70) game.targetLane = 1;
};

function updateRunnerPosition() {
  const laneX = game.lanePositions[game.currentLane];
  const progress = 0.18;
  const currentLeft = ui.runner.style.left ? parseFloat(ui.runner.style.left) : laneX;
  const newX = currentLeft + (laneX - currentLeft) * progress;
  ui.runner.style.left = `${newX}px`;

  const targetY = game.jumpTime > 0 ? -40 : game.slideTime > 0 ? 18 : 0;
  ui.runner.style.transform = `translateX(0) translateY(${targetY}px) rotate(${sensorState.acelerometro.x / 24}deg)`;
}

function updateGameMetrics(deltaTime) {
  const speedFactor = 1 + Math.max(0, (sensorState.slider / 1023) * 0.8);
  const brightness = sensorState.luz / 1023;
  game.speed = 0.9 + speedFactor + (game.boostTime > 0 ? 0.8 : 0);
  game.score += deltaTime * 0.02 * game.speed;
  if (game.boostTime > 0) game.boostTime = Math.max(0, game.boostTime - deltaTime * 0.001);
  if (game.shieldTime > 0) game.shieldTime = Math.max(0, game.shieldTime - deltaTime * 0.001);
  if (game.jumpTime > 0) game.jumpTime = Math.max(0, game.jumpTime - deltaTime * 0.001);
  if (game.slideTime > 0) game.slideTime = Math.max(0, game.slideTime - deltaTime * 0.001);
  document.body.style.background = `radial-gradient(circle at top, rgba(31, 74, 131, ${0.4 + brightness * 0.4}), rgba(8,12,22,1) 62%)`;

  ui.scoreValue.textContent = Math.floor(game.score);
  ui.speedValue.textContent = `${game.speed.toFixed(1)}x`;
  ui.boostValue.textContent = `${Math.ceil(game.boostTime)}s`;
  ui.shieldValue.textContent = game.shieldTime > 0 ? 'ON' : 'OFF';
  ui.lightMeter.style.width = `${Math.min(100, (sensorState.luz / 1023) * 100)}%`;
  ui.soundMeter.style.width = `${Math.min(100, (sensorState.microfono / 1023) * 100)}%`;
}

function updateSensorUI() {
  ui.jsValue.textContent = `x: ${sensorState.joystick.x}, y: ${sensorState.joystick.y}`;
  ui.luzValue.textContent = sensorState.luz;
  ui.tempValue.textContent = `${sensorState.temperatura} °C`;
  ui.sliderValue.textContent = sensorState.slider;
  ui.accValue.textContent = `x:${sensorState.acelerometro.x} y:${sensorState.acelerometro.y} z:${sensorState.acelerometro.z}`;
  ui.micValue.textContent = sensorState.microfono;
  ui.btnValue.textContent = `${sensorState.botones.btn1}${sensorState.botones.btn2}${sensorState.botones.btn3}${sensorState.botones.btn4}`;
  ui.timestampValue.textContent = sensorState.timestamp;
}

function addObstacle() {
  const lane = Math.floor(Math.random() * game.laneCount);
  const id = `obs-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const element = document.createElement('div');
  element.className = 'obstacle';
  element.dataset.lane = lane;
  element.dataset.y = '0';
  element.dataset.id = id;
  game.obstacles.push({ id, lane, y: 0, element });
  ui.obstacles.appendChild(element);
}

function removeObstacle(obs) {
  ui.obstacles.removeChild(obs.element);
  game.obstacles = game.obstacles.filter((item) => item.id !== obs.id);
}

function updateObstacles(deltaTime) {
  const trackHeight = ui.gameArea?.clientHeight || 560;
  game.obstacleAccumulator += deltaTime * game.speed;
  if (game.obstacleAccumulator > game.obstacleInterval) {
    game.obstacleAccumulator = 0;
    if (game.obstacles.length < game.maxObstacles) addObstacle();
  }

  game.obstacles.slice().forEach((obs) => {
    obs.y += deltaTime * 0.06 * game.speed;
    const laneX = game.lanePositions[obs.lane];
    obs.element.style.left = `${laneX}px`;
    obs.element.style.bottom = `${obs.y}px`;

    const runnerRect = ui.runner.getBoundingClientRect();
    const obsRect = obs.element.getBoundingClientRect();
    const collision = !(
      runnerRect.right < obsRect.left ||
      runnerRect.left > obsRect.right ||
      runnerRect.bottom < obsRect.top ||
      runnerRect.top > obsRect.bottom
    );

    if (collision && obs.y > 80) {
      if (game.shieldTime <= 0) {
        game.score = Math.max(0, game.score - 40);
        spawnEffect('damage', laneX, obs.y);
      }
      removeObstacle(obs);
    }

    if (obs.y > trackHeight + 120) removeObstacle(obs);
  });
}

function spawnEffect(type, left, bottom) {
  const element = document.createElement('div');
  element.className = 'effect';
  element.style.left = `${left}px`;
  element.style.bottom = `${bottom}px`;
  element.style.width = type === 'damage' ? '90px' : '40px';
  element.style.height = type === 'damage' ? '90px' : '40px';
  element.style.background = type === 'damage' ? 'rgba(255, 100, 100, 0.35)' : 'rgba(69, 214, 255, 0.3)';
  ui.effects.appendChild(element);
  setTimeout(() => element.remove(), 450);
}

function applyButtonActions() {
  const { btn1, btn2, btn3, btn4 } = sensorState.botones;
  if (btn1) game.jumpTime = 0.6;
  if (btn2) game.slideTime = 0.6;
  if (btn3) game.boostTime = Math.min(3, game.boostTime + 0.1);
  if (btn4) game.shieldTime = Math.min(3, game.shieldTime + 0.05);
}

function portRunnerToLane() {
  if (game.currentLane !== game.targetLane) {
    if (Math.abs(game.targetLane - game.currentLane) === 2) {
      game.currentLane += game.targetLane > game.currentLane ? 1 : -1;
    } else {
      game.currentLane = game.targetLane;
    }
  }
}

function renderRunner() {
  const trackWidth = ui.gameArea.offsetWidth;
  const laneWidth = trackWidth / 3;
  game.lanePositions = [laneWidth / 2 - 36, laneWidth * 1.5 - 36, laneWidth * 2.5 - 36];
  portRunnerToLane();
  updateRunnerPosition();
}

function renderFrame(timestamp) {
  const deltaTime = timestamp - game.lastFrameAt;
  game.lastFrameAt = timestamp;
  setTargetLaneFromJoystick();
  applyButtonActions();
  renderRunner();
  updateGameMetrics(deltaTime);
  updateObstacles(deltaTime);
  updateSensorUI();
  gameFrame = requestAnimationFrame(renderFrame);
}

function handleSensorBundle(bundle) {
  if (!bundle || !bundle.data) return;
  const data = bundle.data;
  sensorState.joystick = data.joystick || sensorState.joystick;
  sensorState.luz = data.luz ?? sensorState.luz;
  sensorState.temperatura = data.temperatura ?? sensorState.temperatura;
  sensorState.slider = data.slider ?? sensorState.slider;
  sensorState.acelerometro = data.acelerometro || sensorState.acelerometro;
  sensorState.botones = data.botones || sensorState.botones;
  sensorState.microfono = data.microfono ?? sensorState.microfono;
  sensorState.timestamp = data.timestamp || sensorState.timestamp;
  sensorState.connected = bundle.connected ?? true;
  updateConnectionStatus();
}

function fetchRestData() {
  fetch(REST_URL)
    .then((res) => res.json())
    .then((bundle) => {
      handleSensorBundle(bundle);
    })
    .catch(() => {
      sensorState.connected = false;
      updateConnectionStatus();
    });
}

function connectWebSocket() {
  ws = new WebSocket(WS_URL);

  ws.onopen = () => {
    console.log('WS conectado');
    sensorState.connected = true;
    updateConnectionStatus();
    if (restInterval) clearInterval(restInterval);
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      handleSensorBundle(data);
    } catch (error) {
      console.warn('Mensaje WS inválido', error);
    }
  };

  ws.onclose = () => {
    console.warn('WS cerrado. Activando fallback REST.');
    sensorState.connected = false;
    updateConnectionStatus();
    restInterval = setInterval(fetchRestData, 1200);
  };

  ws.onerror = () => {
    console.warn('Error WS. Intentando REST fallback.');
    sensorState.connected = false;
    updateConnectionStatus();
    if (ws.readyState !== WebSocket.OPEN) {
      restInterval = setInterval(fetchRestData, 1200);
    }
  };
}

function startGame() {
  ui.obstacles = document.getElementById('obstacles');
  ui.effects = document.getElementById('effects');
  ui.gameArea = document.getElementById('gameArea');
  renderFrame(performance.now());
  connectWebSocket();
  restInterval = setInterval(fetchRestData, 2000);
  for (let i = 0; i < 2; i += 1) addObstacle();
}

function initSimulator() {
  const fakeFrame = () => {
    const sample = {
      ok: true,
      connected: true,
      data: {
        joystick: { x: Math.round(Math.sin(Date.now() / 700) * 470), y: Math.round(Math.cos(Date.now() / 900) * 250) },
        luz: Math.round(400 + Math.abs(Math.sin(Date.now() / 1200)) * 620),
        temperatura: 22 + Math.round(Math.sin(Date.now() / 500) * 6),
        slider: Math.round(450 + Math.sin(Date.now() / 650) * 400),
        acelerometro: { x: Math.round(Math.sin(Date.now() / 450) * 280), y: Math.round(Math.cos(Date.now() / 520) * 240), z: Math.round(Math.sin(Date.now() / 380) * 210) },
        botones: { btn1: Number(Math.random() > 0.92), btn2: Number(Math.random() > 0.94), btn3: Number(Math.random() > 0.96), btn4: Number(Math.random() > 0.98) },
        microfono: Math.round(Math.abs(Math.sin(Date.now() / 340)) * 760),
        timestamp: new Date().toISOString(),
      },
    };
    handleSensorBundle(sample);
    setTimeout(fakeFrame, 130);
  };
  if (window.location.search.includes('simulate')) fakeFrame();
}

window.addEventListener('load', () => {
  startGame();
  initSimulator();
});
