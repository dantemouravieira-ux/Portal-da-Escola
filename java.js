const firebaseConfig = {
	apiKey: "AIzaSyDOv1n1TTC4OLb0zChkgwLMmDOaualD0i4",
	authDomain: "climate-guard-a1b6e.firebaseapp.com",
	databaseURL: "https://climate-guard-a1b6e-default-rtdb.firebaseio.com",
	projectId: "climate-guard-a1b6e",
	storageBucket: "climate-guard-a1b6e.firebasestorage.app",
	messagingSenderId: "496904319832",
	appId: "1:496904319832:web:be2be5a93535c20b012b2d",
};

const isConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId);

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
const windValueEl = document.getElementById('windValue');
const windSubEl = document.getElementById('windSub');
const windReading = document.getElementById('windReading');
const windIconEl = document.querySelector('.wind-icon');

const RING_CIRCUMFERENCE = 314;
const TEMP_MIN = 0, TEMP_MAX = 45;
const UMID_MIN = 0, UMID_MAX = 100;
const SENSOR_OFFLINE_AFTER_MS = 2 * 60 * 1000;
let lastSensorReadingDate = null;

const UMID_ALERT_THRESHOLD = 30;
let humidityAlertLimit = Number(localStorage.getItem('humidityAlertLimit')) || UMID_ALERT_THRESHOLD;
let externalWindSpeed = null;
let externalWindDirection = null;

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

function loadSavedPortalData(){
	const weeklyMenu = JSON.parse(localStorage.getItem('weeklyMenu') || 'null');
	const legacyMenu = JSON.parse(localStorage.getItem('menu') || 'null');
	const today = new Date().getDay();
	const savedMenu = (weeklyMenu && weeklyMenu[today]) || legacyMenu;
	if (savedMenu){
		document.getElementById('menuDisplayMain').textContent = savedMenu.main;
		document.getElementById('menuDisplayDetails').textContent = `${savedMenu.side} · ${savedMenu.time}`;
	}

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

	const noticeList = document.getElementById('noticeList');
	const savedEvents = JSON.parse(localStorage.getItem('events') || '[]');
	const noticesSection = document.getElementById('avisos');
	if (savedEvents.length) noticesSection.hidden = false;
	savedEvents.forEach((event) => {
		const notice = document.createElement('article');
		notice.className = 'notice';
		notice.innerHTML = '<span class="notice-mark">i</span><div><strong></strong><p></p></div><span class="notice-date">Publicado</span>';
		notice.querySelector('strong').textContent = event.title;
		notice.querySelector('p').textContent = `${event.date} · ${event.details}`;
		noticeList.append(notice);
	});
}

function startCountdown(){
	const countdown = document.getElementById('countdown');
	const currentPeriod = document.getElementById('currentPeriod');
	const currentPeriodDetail = document.getElementById('currentPeriodDetail');
	const nextPeriod = document.getElementById('nextPeriod');
	const timelineDate = document.getElementById('timelineDate');
	const timelineItems = [...document.querySelectorAll('.timeline-item[data-start]')];
	const periods = [
		{ start: '06:50', end: '07:50', label: 'Aula 1', detail: 'Período da manhã' },
		{ start: '07:50', end: '08:50', label: 'Aula 2', detail: 'Período da manhã' },
		{ start: '08:50', end: '09:10', label: 'Intervalo', detail: 'Pausa' },
		{ start: '09:10', end: '10:10', label: 'Aula 3', detail: 'Período da manhã' },
		{ start: '10:10', end: '11:10', label: 'Aula 4', detail: 'Período da manhã' },
		{ start: '11:10', end: '12:10', label: 'Aula 5', detail: 'Período da manhã' },
		{ start: '12:10', end: '12:50', label: 'Almoço', detail: 'Refeitório' },
		{ start: '12:50', end: '13:50', label: 'Aula 6', detail: 'Período da tarde' },
		{ start: '13:50', end: '14:50', label: 'Aula 7', detail: 'Período da tarde' },
		{ start: '14:50', end: '15:10', label: 'Intervalo', detail: 'Pausa' },
		{ start: '15:10', end: '16:10', label: 'Aula 8', detail: 'Período da tarde' },
	];
	const toMinutes = (value) => { const [hours, minutes] = value.split(':').map(Number); return hours * 60 + minutes; };
	const formatDate = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });

	function updateTimeline(now, nowMinutes){
		if (timelineDate) timelineDate.textContent = formatDate.format(now).replace(/^./, (letter) => letter.toUpperCase());
		timelineItems.forEach((item) => {
			const start = toMinutes(item.dataset.start);
			const end = toMinutes(item.dataset.end);
			const status = item.querySelector('small');
			item.classList.toggle('current', nowMinutes >= start && nowMinutes < end);
			item.classList.toggle('done', nowMinutes >= end);
			if (!status) return;
			if (nowMinutes >= end) status.textContent = 'Encerrado';
			else if (nowMinutes >= start) status.textContent = 'Em andamento';
			else status.textContent = item.querySelector('strong').textContent === 'Intervalo' ? 'Pausa' : 'Próximo';
		});
	}

	function updateCountdown(){
		const now = new Date();
		const nowMinutes = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
		updateTimeline(now, nowMinutes);
		const period = periods.find((item) => nowMinutes >= toMinutes(item.start) && nowMinutes < toMinutes(item.end));
		const next = periods.find((item) => toMinutes(item.start) > nowMinutes);
		if (!period){
			currentPeriod.textContent = nowMinutes < toMinutes(periods[0].start) ? 'Aulas começam em breve' : 'Atividades encerradas';
			currentPeriodDetail.textContent = nowMinutes < toMinutes(periods[0].start) ? 'A programação começa às 06:50' : 'Até o próximo dia letivo';
			countdown.textContent = '--:--:--';
			nextPeriod.textContent = next ? `Próxima aula: ${next.start}` : 'Próxima aula: amanhã, 06:50';
			return;
		}
		const end = new Date(now);
		const [endHours, endMinutes] = period.end.split(':').map(Number);
		end.setHours(endHours, endMinutes, 0, 0);
		const totalSeconds = Math.max(0, Math.floor((end - now) / 1000));
		const hours = Math.floor(totalSeconds / 3600);
		const minutes = Math.floor((totalSeconds % 3600) / 60);
		const seconds = totalSeconds % 60;
		currentPeriod.textContent = `${period.label} em andamento`;
		currentPeriodDetail.textContent = period.detail;
		countdown.textContent = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
		nextPeriod.textContent = `Próxima aula: ${period.end}`;
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

function classifyWind(speed){
	if (speed < 5) return 'calmo';
	if (speed < 15) return 'brisa leve';
	if (speed < 30) return 'vento moderado';
	return 'vento forte';
}

function updateWindDisplay(speed, direction, source){
	windValueEl.textContent = speed === null ? '--' : speed.toFixed(0);
	windSubEl.textContent = speed === null ? 'sem leitura do clima' : `${classifyWind(speed)} · ${source}`;
	if (direction !== null) windIconEl.style.transform = `rotate(${direction}deg)`;
}

async function fetchExternalWind(){
	try{
		const response = await fetch('https://api.open-meteo.com/v1/forecast?latitude=-8.11&longitude=-42.94&current=wind_speed_10m,wind_direction_10m&wind_speed_unit=kmh&timezone=America%2FFortaleza');
		if (!response.ok) throw new Error(`clima HTTP ${response.status}`);
		const weather = await response.json();
		externalWindSpeed = getReadingNumber(weather.current?.wind_speed_10m);
		externalWindDirection = getReadingNumber(weather.current?.wind_direction_10m);
		updateWindDisplay(externalWindSpeed, externalWindDirection, 'Canto do Buriti');
	}catch(error){
		console.warn('Não foi possível obter o vento externo:', error);
	}
}

function formatChartTime(date){
	return date.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function getReadingNumber(value){
	const number = Number(value);
	return Number.isFinite(number) ? number : null;
}

function getReadingDate(timestamp){
	if (timestamp && typeof timestamp.toDate === 'function') return timestamp.toDate();
	const milliseconds = Number(timestamp) * (Number(timestamp) < 100000000000 ? 1000 : 1);
	const date = new Date(milliseconds);
	return Number.isNaN(date.getTime()) ? null : date;
}

function updateSensorStatus(latest){
	const readingDate = getReadingDate(latest?.timestamp);
	lastSensorReadingDate = readingDate;
	const isOnline = readingDate !== null && Date.now() - readingDate.getTime() <= SENSOR_OFFLINE_AFTER_MS;
	setStatus(isOnline, isOnline ? 'Online' : 'Offline');
}

let chart;
const ctx = document.getElementById('meuGrafico').getContext('2d');

function drawFallbackChart(labels, temps, umids){
	const canvas = document.getElementById('meuGrafico');
	const width = canvas.clientWidth || 700;
	const height = canvas.clientHeight || 240;
	const scale = window.devicePixelRatio || 1;
	canvas.width = width * scale;
	canvas.height = height * scale;
	const context = canvas.getContext('2d');
	context.scale(scale, scale);
	context.clearRect(0, 0, width, height);
	const values = [...temps, ...umids];
	const min = Math.min(0, ...values);
	const max = Math.max(100, ...values);
	const x = (index) => 30 + (index * (width - 45)) / Math.max(1, labels.length - 1);
	const y = (value) => height - 24 - ((value - min) * (height - 45)) / (max - min);

	context.strokeStyle = '#3b5049';
	context.lineWidth = 1;
	[0, 25, 50, 75, 100].forEach((value) => {
		context.beginPath(); context.moveTo(30, y(value)); context.lineTo(width, y(value)); context.stroke();
		context.fillStyle = '#a9bdcc'; context.font = '11px IBM Plex Mono'; context.fillText(value, 3, y(value) + 4);
	});
	[[temps, '#f5223d'], [umids, '#1677ff']].forEach(([series, color]) => {
		context.beginPath();
		series.forEach((value, index) => index === 0 ? context.moveTo(x(index), y(value)) : context.lineTo(x(index), y(value)));
		context.lineTo(x(series.length - 1), height - 24); context.lineTo(x(0), height - 24); context.closePath();
		context.fillStyle = color === '#f5223d' ? 'rgba(245,34,61,.16)' : 'rgba(22,119,255,.16)'; context.fill();
		context.beginPath(); context.strokeStyle = color; context.lineWidth = 3;
		series.forEach((value, index) => index === 0 ? context.moveTo(x(index), y(value)) : context.lineTo(x(index), y(value)));
		context.stroke();
		series.forEach((value, index) => { context.beginPath(); context.fillStyle = color; context.arc(x(index), y(value), 4.5, 0, Math.PI * 2); context.fill(); });
	});
	context.fillStyle = '#a9bdcc'; context.font = '11px IBM Plex Mono';
	labels.forEach((label, index) => { if (index === 0 || index === labels.length - 1 || index % 2 === 0) context.fillText(label, x(index) - 20, height - 5); });
	canvas.onmousemove = (event) => {
		const index = Math.max(0, Math.min(labels.length - 1, Math.round(((event.offsetX - 30) * (labels.length - 1)) / Math.max(1, width - 45))));
		const tooltip = document.getElementById('chartTooltip');
		tooltip.textContent = `${labels[index]} · Temperatura: ${Number(temps[index]).toFixed(1)} °C`;
		tooltip.style.display = 'block';
		tooltip.style.left = `${Math.min(event.offsetX + 12, width - tooltip.offsetWidth - 8)}px`;
		tooltip.style.top = `${Math.max(8, event.offsetY - 38)}px`;
	};
	canvas.onmouseleave = () => { document.getElementById('chartTooltip').style.display = 'none'; };
}

function ensureChart(){
	if (chart) return chart;
	if (typeof Chart === 'undefined') return null;
	document.querySelector('.chart-legend').style.display = 'none';
	chart = new Chart(ctx, {
		type: 'line',
		data: {
			labels: [],
			datasets: [
				{
					label: 'Temperatura °C',
					data: [],
					yAxisID: 'temperature',
					borderColor: '#f5223d',
					backgroundColor: 'rgba(245,34,61,0.18)',
					fill: true,
					tension: 0.3,
					pointRadius: 5,
					pointHoverRadius: 7,
					pointBackgroundColor: '#f5223d',
					pointBorderColor: '#ff9aa8',
					borderWidth: 3,
				},
				{
					label: 'Umidade %',
					data: [],
					yAxisID: 'humidity',
					borderColor: '#1677ff',
					backgroundColor: 'rgba(22,119,255,0.18)',
					fill: true,
					tension: 0.3,
					pointRadius: 5,
					pointHoverRadius: 7,
					pointBackgroundColor: '#1677ff',
					pointBorderColor: '#8ab8ff',
					borderWidth: 3,
				}
			]
		},
		options: {
			responsive: true,
			maintainAspectRatio: false,
			interaction: { mode: 'index', intersect: false },
			plugins: {
				tooltip: {
					callbacks: {
						title: (items) => items[0]?.label || '',
						label: (context) => {
							const value = Number(context.raw);
							return context.dataset.label.startsWith('Temperatura') ? `Temperatura: ${value.toFixed(1)} °C` : `Umidade: ${value.toFixed(0)}%`;
						},
					}
				},
				legend: {
					display: false,
					position: 'top',
					align: 'start',
					labels: { color: '#dce8f2', padding: 18, usePointStyle: true, pointStyle: 'circle', font: { family: 'Inter', size: 13, weight: '600' } }
				}
			},
				scales: {
					x: { ticks: { color: '#a9bdcc', maxRotation: 0, autoSkip: true, maxTicksLimit: 6 }, grid: { color: 'rgba(132,166,190,.16)' } },
					temperature: { type: 'linear', position: 'left', min: 0, max: 45, ticks: { color: '#ff9ca2', precision: 0, callback: (value) => `${value}°` }, grid: { color: 'rgba(132,166,190,.16)' } },
					humidity: { type: 'linear', position: 'right', min: 0, max: 100, ticks: { color: '#8bcfff', precision: 0, callback: (value) => `${value}%` }, grid: { drawOnChartArea: false } }
				}
		}
	});
	return chart;
}

function updateUI(latest, historyLabels, historyTemps, historyUmids){
	const t = getReadingNumber(latest.temperatura);
	const u = getReadingNumber(latest.umidade);
	const sensorWind = getReadingNumber(latest.vento ?? latest.velocidadeVento ?? latest.ventoKmh);
	const wind = sensorWind ?? externalWindSpeed;

	if (typeof t !== 'number' || Number.isNaN(t) || typeof u !== 'number' || Number.isNaN(u)){
		tempSubEl.textContent = 'leitura inválida do sensor';
		umidSubEl.textContent = 'leitura inválida do sensor';
		return;
	}

	tempReading.classList.remove('is-loading');
	umidReading.classList.remove('is-loading');
	windReading.classList.remove('is-loading');

	tempValueEl.textContent = t.toFixed(1);
	umidValueEl.textContent = u.toFixed(0);
	tempSubEl.textContent = classifyTemp(t);
	umidSubEl.textContent = classifyUmid(u);
	updateWindDisplay(wind, sensorWind === null ? externalWindDirection : null, sensorWind === null ? 'Canto do Buriti' : 'sensor');

	setRing(ringTemp, t, TEMP_MIN, TEMP_MAX);
	setRing(ringUmid, u, UMID_MIN, UMID_MAX);

	// ✨ ATUALIZA COR DO ANEL (GRADIENTE SUAVE)
	updateTemperatureRingColor(t);

	alertBar.classList.toggle('visivel', u < humidityAlertLimit);

	const c = ensureChart();
	if (c){
		c.data.labels = historyLabels;
		c.data.datasets[0].data = historyTemps;
		c.data.datasets[1].data = historyUmids;
		c.update();
	} else {
		drawFallbackChart(historyLabels, historyTemps, historyUmids);
	}

	const readingDate = getReadingDate(latest.timestamp);
	lastUpdatedEl.textContent = readingDate
		? 'última leitura: ' + readingDate.toLocaleTimeString('pt-BR')
		: 'última leitura: horário indisponível';
}

function setStatus(online, label){
	statusIndicator.classList.toggle('offline', !online);
	statusText.textContent = label;
}

function startDemoMode(){
	setStatus(false, 'Offline');

	const labels = [];
	const temps = [];
	const umids = [];
	let t = 31, u = 34;

	function tick(){
		t += (Math.random() - 0.5) * 1.4;
		u += (Math.random() - 0.5) * 3;
		t = Math.max(20, Math.min(40, t));
		u = Math.max(15, Math.min(70, u));

		const hora = formatChartTime(new Date());
		labels.push(hora); temps.push(t); umids.push(u);
		if (labels.length > 10){ labels.shift(); temps.shift(); umids.shift(); }

		updateUI({ temperatura: t, umidade: u, vento: 13 }, [...labels], [...temps], [...umids]);
	}

	tick();
	setInterval(tick, 4000);
}

async function startFirebaseMode(){
	setStatus(false, 'Offline');
	try{
		const { initializeApp } = await import("https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js");
		const { getFirestore, collection, query, orderBy, limit, onSnapshot } =
			await import("https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js");

		const app = initializeApp(firebaseConfig);
		const db = getFirestore(app);
		const q = query(collection(db, "leituras"), orderBy("timestamp", "desc"), limit(10));

		onSnapshot(q, (snapshot) => {
			if (snapshot.empty) return;

			const docs = snapshot.docs.map(d => d.data()).reverse();
			const labels = docs.map(d => formatChartTime(getReadingDate(d.timestamp)));
			const temps = docs.map(d => getReadingNumber(d.temperatura));
			const umids = docs.map(d => getReadingNumber(d.umidade));
			const latest = docs[docs.length - 1];

			updateSensorStatus(latest);
			updateUI(latest, labels, temps, umids);
		}, (error) => {
			console.error("❌ Erro ao ler o Firestore:", error);
			setStatus(false, 'Offline');
		});

	} catch(error){
		console.error("❌ Falha ao inicializar o Firebase:", error);
		setStatus(false, 'Offline');
	}
}

initTheme();
startCountdown();
loadSavedPortalData();
fetchExternalWind();
setInterval(fetchExternalWind, 10 * 60 * 1000);
tempReading.classList.add('is-loading');
umidReading.classList.add('is-loading');
windReading.classList.add('is-loading');

if (isConfigured){
	startFirebaseMode();
	setInterval(() => {
		if (lastSensorReadingDate && Date.now() - lastSensorReadingDate.getTime() > SENSOR_OFFLINE_AFTER_MS){
			setStatus(false, 'Offline');
		}
	}, 15000);
} else {
	startDemoMode();
}
