const firebaseConfig = {
	apiKey: "AIzaSyDOv1n1TTC4OLb0zChkgwLMmDOaualD0i4",
	projectId: "climate-guard-a1b6e",
};

const isConfigured = firebaseConfig.apiKey !== "AIzaSyDOv1n1TTC4OLb0zChkgwLMmDOaualD0i4";

// ---- Referências de UI ----
const tempValueEl = document.getElementById('tempValue');
const umidValueEl = document.getElementById('umidValue');
const tempSubEl = document.getElementById('tempSub');
const umidSubEl = document.getElementById('umidSub');
const ringTemp = document.getElementById('ringTemp');
const ringUmid = document.getElementById('ringUmid');
const alertBar = document.getElementById('alertaUmidade');
const statusIndicator = document.getElementById('statusIndicator');
const statusText = document.getElementById('statusText');
const lastUpdatedEl = document.getElementById('lastUpdated');
const themeToggle = document.getElementById('themeToggle');
const tempReading = document.getElementById('tempReading');
const umidReading = document.getElementById('umidReading');

const RING_CIRCUMFERENCE = 314;
const TEMP_MIN = 0, TEMP_MAX = 45;
const UMID_MIN = 0, UMID_MAX = 100;

const UMID_ALERT_THRESHOLD = 30;
let humidityAlertLimit = Number(localStorage.getItem('humidityAlertLimit')) || UMID_ALERT_THRESHOLD;

function initializeAdministration(){
	const settingsForm = document.getElementById('settingsForm');
	const menuForm = document.getElementById('menuForm');
	const classForm = document.getElementById('classForm');
	const savedPoint = localStorage.getItem('monitorPoint') || 'Pátio central';
	document.getElementById('humidityLimit').value = humidityAlertLimit;
	document.getElementById('monitorPoint').value = savedPoint;
	document.getElementById('pointLabel').textContent = savedPoint;

	settingsForm.addEventListener('submit', (event) => {
		event.preventDefault();
		humidityAlertLimit = Number(document.getElementById('humidityLimit').value);
		localStorage.setItem('humidityAlertLimit', humidityAlertLimit);
		const point = document.getElementById('monitorPoint').value.trim() || 'Pátio central';
		localStorage.setItem('monitorPoint', point);
		document.getElementById('pointLabel').textContent = point;
		document.getElementById('settingsFeedback').textContent = 'Configurações salvas.';
	});

	menuForm.addEventListener('submit', (event) => {
		event.preventDefault();
		document.getElementById('menuDisplayMain').textContent = document.getElementById('menuMain').value;
		document.getElementById('menuDisplayDetails').textContent = `${document.getElementById('menuSide').value} · ${document.getElementById('menuTime').value}`;
		document.getElementById('menuFeedback').textContent = 'Cardápio publicado no portal.';
	});

	classForm.addEventListener('submit', (event) => {
		event.preventDefault();
		const card = document.createElement('article');
		card.className = 'class-card';
		const year = document.createElement('span');
		year.className = 'class-year';
		year.textContent = 'nova turma';
		const name = document.createElement('h3');
		name.textContent = document.getElementById('className').value;
		const details = document.createElement('p');
		details.textContent = `${document.getElementById('classTeacher').value} · ${document.getElementById('classStudents').value} alunos`;
		const link = document.createElement('a');
		link.href = '#turmas';
		link.textContent = 'Ver perfil →';
		card.append(year, name, details, link);
		document.getElementById('classGrid').append(card);
		classForm.reset();
		document.getElementById('classFeedback').textContent = 'Turma cadastrada.';
	});
}

function initializeChallenge(){
	const steps = [...document.querySelectorAll('.flow-step')];
	const status = document.getElementById('challengeStatus');
	const whatsapp = document.querySelector('#whatsappPreview p');
	const historyCount = document.getElementById('historyCount');
	let eventCount = 0;

	document.getElementById('runChallenge').addEventListener('click', () => {
		steps.forEach((step, index) => step.classList.toggle('active', index === 0));
		const messages = ['Coletando leitura do ponto monitorado…', 'Analisando umidade: 24% abaixo do limite.', 'Alerta crítico gerado.', 'WhatsApp recebeu o alerta.', 'Equipe iniciou a ventilação.', 'Ambiente estabilizado. Avaliação registrada.'];
		messages.forEach((message, index) => setTimeout(() => {
			steps.forEach((step, stepIndex) => step.classList.toggle('active', stepIndex <= index));
			status.textContent = message;
			if (index === 3) whatsapp.textContent = 'Umidade crítica no Pátio central. Ação recomendada: ventilar a sala.';
			if (index === 5) { eventCount += 1; historyCount.textContent = `${eventCount} evento${eventCount === 1 ? '' : 's'} registrado${eventCount === 1 ? '' : 's'}`; }
		}, index * 850));
	});
}

function updateMenuDisplay(){
	const weeklyMenu = JSON.parse(localStorage.getItem('weeklyMenu') || 'null');
	const legacyMenu = JSON.parse(localStorage.getItem('menu') || 'null');
	const savedMenu = (weeklyMenu && weeklyMenu[new Date().getDay()]) || legacyMenu;
	const menuMain = document.getElementById('menuDisplayMain');
	const menuDetails = document.getElementById('menuDisplayDetails');
	if (!savedMenu || !savedMenu.main){
		menuMain.textContent = 'Cardápio ainda não publicado';
		menuDetails.textContent = 'Consulte a administração para saber o almoço de hoje';
		return;
	}
	menuMain.textContent = savedMenu.main;
	menuDetails.textContent = `${savedMenu.side} · ${savedMenu.time}`;
}

function loadSavedPortalData(){
	updateMenuDisplay();
	window.addEventListener('storage', (event) => {
		if (event.key === 'weeklyMenu' || event.key === 'menu') updateMenuDisplay();
	});
	setInterval(updateMenuDisplay, 60 * 1000);

	const savedClasses = JSON.parse(localStorage.getItem('classes') || '[]');
	savedClasses.forEach((savedClass) => {
		const card = document.createElement('article');
		card.className = 'class-card';
		const year = document.createElement('span');
		year.className = 'class-year';
		year.textContent = 'nova turma';
		const name = document.createElement('h3');
		name.textContent = savedClass.name;
		const details = document.createElement('p');
		details.textContent = `${savedClass.teacher} · ${savedClass.students} alunos`;
		const link = document.createElement('a');
		link.href = '#turmas';
		link.textContent = 'Ver perfil →';
		card.append(year, name, details, link);
		document.getElementById('classGrid').append(card);
	});
}

function startCountdown(){
	const countdown = document.getElementById('countdown');
	const target = Date.now() + (42 * 60 + 18) * 1000;

	function updateCountdown(){
		const remaining = Math.max(0, target - Date.now());
		const totalSeconds = Math.floor(remaining / 1000);
		const minutes = Math.floor(totalSeconds / 60);
		const seconds = totalSeconds % 60;
		countdown.textContent = `00:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
	}

	updateCountdown();
	setInterval(updateCountdown, 1000);
}

// ========== TEMA CLARO/ESCURO ==========
function initTheme(){
	const saved = localStorage.getItem('theme') || 'dark';
	applyTheme(saved);
}

function applyTheme(theme){
	if (theme === 'light'){
		document.documentElement.setAttribute('data-theme', 'light');
		themeToggle.textContent = '☀️';
		themeToggle.setAttribute('aria-pressed', 'true');
		localStorage.setItem('theme', 'light');
	} else {
		document.documentElement.removeAttribute('data-theme');
		themeToggle.textContent = '🌙';
		themeToggle.setAttribute('aria-pressed', 'false');
		localStorage.setItem('theme', 'dark');
	}
}

themeToggle.addEventListener('click', () => {
	const current = localStorage.getItem('theme') || 'dark';
	applyTheme(current === 'dark' ? 'light' : 'dark');
});

document.querySelectorAll('.school-nav a').forEach((link) => {
	link.addEventListener('click', () => {
		document.querySelectorAll('.school-nav a').forEach((item) => item.classList.remove('active'));
		link.classList.add('active');
	});
});

// ========== GRADIENTE CONTÍNUO DE COR PARA TEMPERATURA ==========
const TEMP_COLOR_STOPS = [
	{ temp: 0,  rgb: [0, 212, 255] },    // 🔵 azul gelo
	{ temp: 10, rgb: [32, 184, 255] },   // 🔵 azul frio
	{ temp: 18, rgb: [76, 175, 125] },   // 🟢 verde agradável
	{ temp: 27, rgb: [168, 217, 61] },   // 🟢 verde-limão
	{ temp: 33, rgb: [217, 138, 61] },   // 🟠 laranja quente
	{ temp: 45, rgb: [255, 40, 40] },    // 🔴 vermelho intenso
];

function lerp(a, b, t){ 
	return a + (b - a) * t; 
}

function getTemperatureColor(temp){
	const t = Math.min(TEMP_MAX, Math.max(TEMP_MIN, temp));

	let lower = TEMP_COLOR_STOPS[0];
	let upper = TEMP_COLOR_STOPS[TEMP_COLOR_STOPS.length - 1];
  
	for (let i = 0; i < TEMP_COLOR_STOPS.length - 1; i++){
		if (t >= TEMP_COLOR_STOPS[i].temp && t <= TEMP_COLOR_STOPS[i + 1].temp){
			lower = TEMP_COLOR_STOPS[i];
			upper = TEMP_COLOR_STOPS[i + 1];
			break;
		}
	}

	const span = upper.temp - lower.temp;
	const localT = span === 0 ? 0 : (t - lower.temp) / span;

	const r = Math.round(lerp(lower.rgb[0], upper.rgb[0], localT));
	const g = Math.round(lerp(lower.rgb[1], upper.rgb[1], localT));
	const b = Math.round(lerp(lower.rgb[2], upper.rgb[2], localT));

	return `rgb(${r}, ${g}, ${b})`;
}

function setRing(el, value, min, max){
	const pct = Math.min(1, Math.max(0, (value - min) / (max - min)));
	const offset = RING_CIRCUMFERENCE * (1 - pct);
	el.style.strokeDashoffset = offset;
}

function updateTemperatureRingColor(temp){
	const color = getTemperatureColor(temp);
	ringTemp.style.stroke = color;
}

function classifyTemp(t){
	if (t >= 33) return 'calor intenso';
	if (t >= 27) return 'quente';
	if (t >= 18) return 'agradável';
	return 'frio';
}

function classifyUmid(u){
	if (u < 30) return 'ar muito seco';
	if (u < 50) return 'seco';
	if (u < 70) return 'confortável';
	return 'úmido';
}

let chart;
const ctx = document.getElementById('meuGrafico').getContext('2d');

function ensureChart(){
	if (chart) return chart;
	chart = new Chart(ctx, {
		type: 'line',
		data: {
			labels: [],
			datasets: [
				{
					label: 'Temperatura °C',
					data: [],
					borderColor: '#d98a3d',
					backgroundColor: 'rgba(217,138,61,0.08)',
					fill: true,
					tension: 0.35,
					pointRadius: 2,
					borderWidth: 2,
				},
				{
					label: 'Umidade %',
					data: [],
					borderColor: '#5fa8d3',
					backgroundColor: 'rgba(95,168,211,0.08)',
					fill: true,
					tension: 0.35,
					pointRadius: 2,
					borderWidth: 2,
				}
			]
		},
		options: {
			responsive: true,
			maintainAspectRatio: false,
			interaction: { mode: 'index', intersect: false },
			plugins: {
				legend: {
					labels: { color: '#8b93a7', font: { family: 'Inter', size: 12 } }
				}
			},
			scales: {
				x: { ticks: { color: '#8b93a7' }, grid: { color: '#2c3347' } },
				y: { ticks: { color: '#8b93a7' }, grid: { color: '#2c3347' } }
			}
		}
	});
	return chart;
}

function updateUI(latest, historyLabels, historyTemps, historyUmids){
	const t = latest.temperatura;
	const u = latest.umidade;

	if (typeof t !== 'number' || Number.isNaN(t) || typeof u !== 'number' || Number.isNaN(u)){
		tempSubEl.textContent = 'leitura inválida do sensor';
		umidSubEl.textContent = 'leitura inválida do sensor';
		return;
	}

	tempReading.classList.remove('is-loading');
	umidReading.classList.remove('is-loading');

	tempValueEl.textContent = t.toFixed(1);
	umidValueEl.textContent = u.toFixed(0);
	tempSubEl.textContent = classifyTemp(t);
	umidSubEl.textContent = classifyUmid(u);

	setRing(ringTemp, t, TEMP_MIN, TEMP_MAX);
	setRing(ringUmid, u, UMID_MIN, UMID_MAX);

	// ✨ ATUALIZA COR DO ANEL (GRADIENTE SUAVE)
	updateTemperatureRingColor(t);

	alertBar.classList.toggle('visivel', u < humidityAlertLimit);

	const c = ensureChart();
	c.data.labels = historyLabels;
	c.data.datasets[0].data = historyTemps;
	c.data.datasets[1].data = historyUmids;
	c.update();

	const now = new Date();
	lastUpdatedEl.textContent = 'última leitura: ' + now.toLocaleTimeString('pt-BR');
}

function setStatus(online, label){
	statusIndicator.classList.toggle('offline', !online);
	statusText.textContent = label;
}

function startDemoMode(){
	setStatus(false, 'modo demonstração (sem Firebase)');
	document.getElementById('demoBadge').hidden = false;

	const controls = document.getElementById('demoControls');
	controls.hidden = false;
	let forceLowHumidity = false;

	document.getElementById('btnSimAlert').addEventListener('click', () => {
		forceLowHumidity = true;
	});
	document.getElementById('btnResetSim').addEventListener('click', () => {
		forceLowHumidity = false;
	});

	const labels = [];
	const temps = [];
	const umids = [];
	let t = 31, u = 34;

	function tick(){
		t += (Math.random() - 0.5) * 1.4;
		u += forceLowHumidity ? -(3 + Math.random() * 2) : (Math.random() - 0.5) * 3;
		t = Math.max(20, Math.min(40, t));
		u = Math.max(15, Math.min(70, u));
		if (forceLowHumidity) u = Math.min(u, 25);

		const hora = new Date().toLocaleTimeString('pt-BR');
		labels.push(hora); temps.push(t); umids.push(u);
		if (labels.length > 10){ labels.shift(); temps.shift(); umids.shift(); }

		updateUI({ temperatura: t, umidade: u }, [...labels], [...temps], [...umids]);
	}

	tick();
	setInterval(tick, 4000);
}

async function startFirebaseMode(){
	setStatus(false, 'conectando ao Firebase…');
	try{
		const { initializeApp } = await import("https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js");
		const { getFirestore, collection, query, orderBy, limit, onSnapshot } =
			await import("https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js");

		const app = initializeApp(firebaseConfig);
		const db = getFirestore(app);
		const q = query(collection(db, "leituras"), orderBy("timestamp", "desc"), limit(10));

		onSnapshot(q, (snapshot) => {
			if (snapshot.empty) return;

			setStatus(true, 'conectado');

			const docs = snapshot.docs.map(d => d.data()).reverse();
			const labels = docs.map(d => new Date(d.timestamp * 1000).toLocaleTimeString('pt-BR'));
			const temps = docs.map(d => d.temperatura);
			const umids = docs.map(d => d.umidade);
			const latest = docs[docs.length - 1];

			updateUI(latest, labels, temps, umids);
		}, (error) => {
			console.error("❌ Erro ao ler o Firestore:", error);
			setStatus(false, 'erro de conexão');
		});

	} catch(error){
		console.error("❌ Falha ao inicializar o Firebase:", error);
		setStatus(false, 'erro de conexão');
	}
}

initTheme();
startCountdown();
loadSavedPortalData();
initializeChallenge();
tempReading.classList.add('is-loading');
umidReading.classList.add('is-loading');

if (isConfigured){
	startFirebaseMode();
} else {
	startDemoMode();
}
