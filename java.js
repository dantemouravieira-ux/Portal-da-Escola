import { db, subscribePortalData } from './firebase-data.js';

const isDemoMode = new URLSearchParams(window.location.search).get('demo') === '1';

// ---- Referências de UI ----
const tempValueEl = document.getElementById('tempValue');
const umidValueEl = document.getElementById('umidValue');
const tempSubEl = document.getElementById('tempSub');
const umidSubEl = document.getElementById('umidSub');
const ringTemp = document.getElementById('ringTemp');
const ringUmid = document.getElementById('ringUmid');
const alertBar = document.getElementById('alertaUmidade');
const temperatureAlertBar = document.getElementById('alertaTemperatura');
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

function hidePageLoader(){
	const loader = document.getElementById('pageLoader');
	if (!loader) return;
	loader.classList.add('is-hidden');
	setTimeout(() => loader.remove(), 450);
}

window.addEventListener('load', () => setTimeout(hidePageLoader, 1200), { once: true });
setTimeout(hidePageLoader, 5000);

const RING_CIRCUMFERENCE = 314;
const TEMP_MIN = 0, TEMP_MAX = 45;
const UMID_MIN = 0, UMID_MAX = 100;
const SENSOR_OFFLINE_AFTER_MS = 2 * 60 * 1000;
let lastSensorReadingDate = null;

const UMID_ALERT_THRESHOLD = 30;
let humidityAlertLimit = UMID_ALERT_THRESHOLD;
let temperatureAlertLimit = 35;
let externalWindSpeed = null;
let externalWindDirection = null;

function updateMenuDisplay(weeklyMenu = {}){
	const menuMain = document.getElementById('menuDisplayMain');
	const menuDetails = document.getElementById('menuDisplayDetails');
	if (!menuMain || !menuDetails) return;
	const savedMenu = weeklyMenu[new Date().getDay()];
	if (!savedMenu || !savedMenu.main){
		menuMain.textContent = 'Cardápio ainda não publicado';
		menuDetails.textContent = 'Consulte a administração para saber o almoço de hoje';
		renderSchoolTodaySummary();
		return;
	}
	menuMain.textContent = savedMenu.main;
	menuDetails.textContent = `${savedMenu.side} · ${savedMenu.time}`;
	renderSchoolTodaySummary();
}

function updateGreeting(){
	const heading = document.getElementById('welcomeGreeting');
	if (!heading) return;
	const hour = new Date().getHours();
	let greeting = 'Bom dia, comunidade';
	if (hour >= 18 || hour < 5) {
		greeting = 'Boa noite, comunidade';
	} else if (hour >= 12) {
		greeting = 'Boa tarde, comunidade';
	}
	heading.textContent = greeting;
}

function renderPortalClasses(savedClasses = []){
	const classGrid = document.getElementById('classGrid');
	if (!classGrid) return;
	classGrid.querySelectorAll('[data-firestore-class]').forEach((card) => card.remove());
	savedClasses.forEach((savedClass) => {
		const card = document.createElement('article');
		card.className = 'class-card';
		const year = document.createElement('span');
		year.className = 'class-year';
		year.textContent = savedClass.year || 'nova turma';
		const name = document.createElement('h3');
		name.textContent = savedClass.name;
		const details = document.createElement('p');
		const contact = savedClass.contact ? ` · ${savedClass.contact}` : '';
		details.textContent = `${savedClass.teacher || 'Professor não informado'}${contact}${savedClass.students ? ` · ${savedClass.students} alunos` : ''}`;
		const profileList = document.createElement('ul');
		profileList.className = 'class-profile-list';
		const profileItems = [
			savedClass.teacher ? `Professor responsável: ${savedClass.teacher}` : null,
			savedClass.contact ? `Contato: ${savedClass.contact}` : null,
			savedClass.materials ? `Materiais: ${savedClass.materials}` : null,
			savedClass.tasks ? `Tarefas: ${savedClass.tasks}` : null,
			savedClass.observations ? `Observações: ${savedClass.observations}` : null,
		].filter(Boolean);
		profileItems.forEach((item) => {
			const listItem = document.createElement('li');
			listItem.textContent = item;
			profileList.append(listItem);
		});
		const link = document.createElement('a');
		link.href = '#turmas';
		link.textContent = 'Ver perfil →';
		card.dataset.firestoreClass = savedClass.id;
		card.append(year, name, details, profileList, link);
		classGrid.append(card);
	});
	renderSchoolTodaySummary();
}

function getSchoolTodaySnapshot() {
	const schoolToday = {
		schedule: '06:50 · 16:10',
		scheduleDetail: 'A programação do dia',
		currentClass: 'Aula 1',
		currentClassDetail: 'Período da manhã',
		urgent: 'Nenhum aviso urgente',
		urgentMeta: 'Central de avisos',
	};

	const urgentEvents = document.querySelectorAll('#noticeList .notice.urgent, #noticeList .notice');
	const firstUrgent = urgentEvents.length ? urgentEvents[0] : null;
	if (firstUrgent) {
		schoolToday.urgent = firstUrgent.querySelector('strong')?.textContent || 'Aviso importante';
		schoolToday.urgentMeta = firstUrgent.querySelector('p')?.textContent || 'Central de avisos';
	}

	const currentPeriod = document.getElementById('currentPeriod');
	const currentPeriodDetail = document.getElementById('currentPeriodDetail');
	if (currentPeriod && currentPeriodDetail) {
		schoolToday.currentClass = currentPeriod.textContent.trim() || 'Aula 1';
		schoolToday.currentClassDetail = currentPeriodDetail.textContent.trim() || 'Período da manhã';
	}

	const todayDate = document.getElementById('timelineDate');
	if (todayDate) {
		schoolToday.scheduleDetail = todayDate.textContent.trim();
	}
	return schoolToday;
}

function renderSchoolTodaySummary() {
	const summary = getSchoolTodaySnapshot();
	const dateLabel = document.getElementById('todayDateLabel');
	const todaySchedule = document.getElementById('todaySchedule');
	const todayScheduleDetail = document.getElementById('todayScheduleDetail');
	const todayCurrentClass = document.getElementById('todayCurrentClass');
	const todayCurrentClassDetail = document.getElementById('todayCurrentClassDetail');
	const todayUrgentNotice = document.getElementById('todayUrgentNotice');
	const todayUrgentMeta = document.getElementById('todayUrgentMeta');
	if (!dateLabel || !todaySchedule || !todayScheduleDetail || !todayCurrentClass || !todayCurrentClassDetail || !todayUrgentNotice || !todayUrgentMeta) return;
	dateLabel.textContent = summary.scheduleDetail || 'Hoje';
	todaySchedule.textContent = summary.schedule;
	todayScheduleDetail.textContent = summary.scheduleDetail;
	todayCurrentClass.textContent = summary.currentClass;
	todayCurrentClassDetail.textContent = summary.currentClassDetail;
	todayUrgentNotice.textContent = summary.urgent;
	todayUrgentMeta.textContent = summary.urgentMeta;
}

function renderPortalEvents(savedEvents = []){
	const noticeList = document.getElementById('noticeList');
	const noticesSection = document.getElementById('avisos');
	const noticeCount = document.getElementById('noticeCount');
	if (!noticeList || !noticesSection) return;
	noticeList.replaceChildren();
	noticesSection.hidden = savedEvents.length === 0;
	if (noticeCount) {
		noticeCount.textContent = savedEvents.length;
		noticeCount.hidden = savedEvents.length === 0;
	}
	savedEvents.forEach((event) => {
		const notice = document.createElement('article');
		notice.className = 'notice';
		const title = String(event.title || '');
		const details = String(event.details || '');
		if (title.toLowerCase().includes('urgente') || details.toLowerCase().includes('urgente')) notice.classList.add('urgent');
		notice.innerHTML = '<span class="notice-mark">i</span><div><strong></strong><p></p></div><span class="notice-date">Publicado</span>';
		notice.querySelector('strong').textContent = title || 'Aviso';
		notice.querySelector('p').textContent = `${event.date || 'Sem data'} · ${details || 'Sem detalhes'}`;
		noticeList.append(notice);
	});
	renderSchoolTodaySummary();
}

function loadSavedPortalData(){
	subscribePortalData({
		onMenu: updateMenuDisplay,
		onClasses: renderPortalClasses,
		onEvents: renderPortalEvents,
		onSettings: (settings) => {
			const savedLimit = Number(settings.humidityAlertLimit);
			humidityAlertLimit = Number.isFinite(savedLimit) ? savedLimit : UMID_ALERT_THRESHOLD;
			const savedTemperatureLimit = Number(settings.temperatureLimit);
			temperatureAlertLimit = Number.isFinite(savedTemperatureLimit) ? savedTemperatureLimit : 35;
			const pointLabel = document.getElementById('pointLabel');
			if (pointLabel) pointLabel.textContent = settings.monitorPoint || 'Pátio central';
		},
	});
}

function addDays(date, days) {
	const next = new Date(date);
	next.setDate(next.getDate() + days);
	return next;
}

function getEasterSunday(year) {
	const a = year % 19;
	const b = Math.floor(year / 100);
	const c = year % 100;
	const d = Math.floor(b / 4);
	const e = b % 4;
	const f = Math.floor((b + 8) / 25);
	const g = Math.floor((b - f + 1) / 3);
	const h = (19 * a + b - d - g + 15) % 30;
	const i = Math.floor(c / 4);
	const k = c % 4;
	const l = (32 + 2 * e + 2 * i - h - k) % 7;
	const m = Math.floor((a + 11 * h + 22 * l) / 451);
	const month = Math.floor((h + l - 7 * m + 114) / 31);
	const day = ((h + l - 7 * m + 114) % 31) + 1;
	return new Date(year, month - 1, day);
}

const HOLIDAY_DEFINITIONS = [
	{ month: 1, day: 1, name: 'Ano Novo' },
	{ month: 4, day: 21, name: 'Feriado de Tiradentes' },
	{ month: 5, day: 1, name: 'Dia do Trabalhador' },
	{ month: 9, day: 7, name: 'Feriado da Independência' },
	{ month: 10, day: 12, name: 'Nossa Senhora Aparecida' },
	{ month: 11, day: 2, name: 'Finados' },
	{ month: 11, day: 15, name: 'Proclamação da República' },
	{ month: 11, day: 20, name: 'Consc. Negra' },
	{ month: 12, day: 25, name: 'Natal' },
];

function toISODateKey(date) {
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function getHolidayName(date) {
	const year = date.getFullYear();
	const normalized = new Date(date.getFullYear(), date.getMonth(), date.getDate());
	const localKey = toISODateKey(normalized);

	const fixedHoliday = HOLIDAY_DEFINITIONS.find((holiday) => {
		return holiday.month === normalized.getMonth() + 1 && holiday.day === normalized.getDate();
	});
	if (fixedHoliday) return fixedHoliday.name;

	const easter = getEasterSunday(year);
	const movableHolidays = new Map([
		[addDays(easter, -48).toISOString().slice(0, 10), 'Carnaval'],
		[addDays(easter, -47).toISOString().slice(0, 10), 'Carnaval'],
		[addDays(easter, -46).toISOString().slice(0, 10), 'Quarta-feira de Cinzas'],
		[addDays(easter, -2).toISOString().slice(0, 10), 'Sexta-feira Santa'],
		[addDays(easter, 39).toISOString().slice(0, 10), 'Ascensão'],
		[addDays(easter, 60).toISOString().slice(0, 10), 'Corpus Christi'],
		[new Date(year, 11, 24).toISOString().slice(0, 10), 'Véspera de Natal'],
	]);
	const isoKey = normalized.toISOString().slice(0, 10);
	if (movableHolidays.has(isoKey)) return movableHolidays.get(isoKey);
	if (localKey === toISODateKey(new Date(year, 11, 24))) return 'Véspera de Natal';
	return 'Feriado nacional';
}

function getBrazilianHolidays(year) {
	const holidays = new Set();

	HOLIDAY_DEFINITIONS.forEach(({ month, day }) => {
		holidays.add(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
	});

	const easter = getEasterSunday(year);
	const movableDates = [
		addDays(easter, -48),
		addDays(easter, -47),
		addDays(easter, -46),
		addDays(easter, -2),
		addDays(easter, 39),
		addDays(easter, 60),
		new Date(year, 11, 24),
	];
	movableDates.forEach((date) => holidays.add(toISODateKey(date)));
	return holidays;
}

function isHoliday(date) {
	const normalized = new Date(date.getFullYear(), date.getMonth(), date.getDate());
	const localKey = toISODateKey(normalized);
	const utcKey = normalized.toISOString().slice(0, 10);
	return getBrazilianHolidays(date.getFullYear()).has(localKey) || getBrazilianHolidays(date.getFullYear()).has(utcKey);
}

function getNextSchoolDay(date) {
	const next = new Date(date);
	for (let i = 0; i < 365; i += 1) {
		next.setDate(date.getDate() + i + 1);
		const day = next.getDay();
		if (day !== 0 && day !== 6 && !isHoliday(next)) return next;
	}
	return null;
}

function startCountdown(){
	const countdown = document.getElementById('countdown');
	const currentPeriod = document.getElementById('currentPeriod');
	const currentPeriodDetail = document.getElementById('currentPeriodDetail');
	const nextPeriod = document.getElementById('nextPeriod');
	const timelineDate = document.getElementById('timelineDate');
	const timeline = document.getElementById('timeline');
	const timelineNext = document.getElementById('timelineNext');
	if (!countdown || !currentPeriod || !currentPeriodDetail || !nextPeriod || !timelineDate || !timeline) return;
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
	periods.forEach((period) => {
		const item = document.createElement('div');
		item.className = 'timeline-item';
		item.dataset.start = period.start;
		item.dataset.end = period.end;
		item.innerHTML = `<span class="time">${period.start}</span><div><strong>${period.label}</strong><small></small></div>`;
		timeline?.append(item);
	});
	const timelineItems = [...document.querySelectorAll('.timeline-item[data-start]')];
	let lastCurrentIndex = -1;
	timelineNext?.addEventListener('click', () => {
		const nextItem = timelineItems.find((item) => !item.classList.contains('done')) || timelineItems[0];
		nextItem?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
	});
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
		const currentIndex = timelineItems.findIndex((item) => item.classList.contains('current'));
		if (currentIndex >= 0 && currentIndex !== lastCurrentIndex){
			timelineItems[currentIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
			lastCurrentIndex = currentIndex;
		}
	}

	function updateCountdown(){
		const now = new Date();
		const nowMinutes = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
		const isWeekend = now.getDay() === 0 || now.getDay() === 6;
		const isOffDay = isWeekend || isHoliday(now);
		if (isOffDay){
			updateTimeline(now, nowMinutes);
			const nextSchoolDay = getNextSchoolDay(now);
			const holidayLabel = isHoliday(now)
				? getHolidayName(now)
				: 'Final de semana';
			currentPeriod.textContent = `Sem aulas · ${holidayLabel}`;
			currentPeriodDetail.textContent = '';
			countdown.textContent = '--:--:--';
			if (nextSchoolDay) {
				const formatted = new Intl.DateTimeFormat('pt-BR', {
					weekday: 'long',
					day: '2-digit',
					month: 'long',
				}).format(nextSchoolDay);
				nextPeriod.textContent = `Próxima aula: ${formatted}, 06:50`;
			} else {
				nextPeriod.textContent = 'Próxima aula: próxima semana';
			}
			return;
		}
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
	setInterval(() => {
		if (!document.hidden) updateCountdown();
	}, 1000);
}

// ========== TEMA CLARO/ESCURO ==========
function initTheme(){
	if (!themeToggle) return;
	const saved = localStorage.getItem('theme') || 'dark';
	applyTheme(saved);
}

function applyTheme(theme){
	if (!themeToggle) return;
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

if (themeToggle) {
	themeToggle.addEventListener('click', () => {
		const current = localStorage.getItem('theme') || 'light';
		applyTheme(current === 'dark' ? 'light' : 'dark');
	});
}

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
	if (!el) return;
	const pct = Math.min(1, Math.max(0, (value - min) / (max - min)));
	const offset = RING_CIRCUMFERENCE * (1 - pct);
	el.style.strokeDashoffset = offset;
}

function updateTemperatureRingColor(temp){
	if (!ringTemp) return;
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

async function initializeTemperatureMap(){
	const cities = [
		{ name: 'Canto do Buriti', latitude: -8.11, longitude: -42.94, school: true },
		{ name: 'Teresina', latitude: -5.09, longitude: -42.80 },
		{ name: 'Floriano', latitude: -6.77, longitude: -43.02 },
		{ name: 'Picos', latitude: -7.08, longitude: -41.47 },
		{ name: 'São Raimundo Nonato', latitude: -9.01, longitude: -42.70 },
		{ name: 'Bom Jesus', latitude: -9.07, longitude: -44.36 },
		{ name: 'Corrente', latitude: -10.44, longitude: -45.16 },
		{ name: 'Parnaíba', latitude: -2.91, longitude: -41.78 },
	];
	const status = document.getElementById('mapStatus');
	const list = document.getElementById('hotCitiesList');
	try{
		const query = cities.map((city) => `${city.latitude},${city.longitude}`).join(';');
		const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${query.split(';').map((value) => value.split(',')[0]).join(',')}&longitude=${query.split(';').map((value) => value.split(',')[1]).join(',')}&current=temperature_2m&timezone=America%2FFortaleza`);
		if (!response.ok) throw new Error(`temperatura HTTP ${response.status}`);
		const payload = await response.json();
		const results = Array.isArray(payload) ? payload : [payload];
		const measuredCities = cities.map((city, index) => ({ ...city, temperature: Number(results[index]?.current?.temperature_2m) })).filter((city) => Number.isFinite(city.temperature));
		measuredCities.sort((first, second) => second.temperature - first.temperature);
		list.replaceChildren(...measuredCities.slice(0, 3).map((city, index) => {
			const item = document.createElement('li');
			item.className = 'hot-city-item';
			const badge = index === 0 ? '1º' : index === 1 ? '2º' : '3º';
			const rank = document.createElement('span');
			rank.className = 'city-rank';
			rank.textContent = badge;
			const main = document.createElement('div');
			main.className = 'hot-city-main';
			const name = document.createElement('span');
			name.className = 'hot-city-name';
			name.textContent = city.name;
			const temperature = document.createElement('span');
			temperature.className = 'hot-city-temp';
			temperature.textContent = `${city.temperature.toFixed(1)} °C`;
			main.append(name, temperature);
			item.append(rank, main);
			return item;
		}));
		status.textContent = `Atualizado às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
	}catch(error){
		console.warn('Não foi possível carregar as cidades mais quentes:', error);
		status.textContent = 'Temperaturas indisponíveis no momento.';
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

function setChartEmptyState(visible, message = 'Aguardando leituras do sensor...'){
	const emptyState = document.getElementById('chartEmptyState');
	if (!emptyState) return;
	emptyState.textContent = message;
	emptyState.hidden = !visible;
}

let chart;
let lastChartSignature = '';
const ctx = document.getElementById('meuGrafico').getContext('2d');

function drawFallbackChart(labels, temps, umids){
	const canvas = document.getElementById('meuGrafico');
	const width = canvas.clientWidth || 700;
	const height = canvas.clientHeight || 240;
	const scale = window.devicePixelRatio || 1;
	canvas.width = width * scale;
	canvas.height = height * scale;
	const context = canvas.getContext('2d');
	context.setTransform(1, 0, 0, 1, 0, 0);
	context.scale(scale, scale);
	context.clearRect(0, 0, width, height);
	const values = [...temps, ...umids];
	const min = Math.min(0, ...values);
	const max = Math.max(100, ...values);
	const x = (index) => 30 + (index * (width - 45)) / Math.max(1, labels.length - 1);
	const y = (value) => height - 24 - ((value - min) * (height - 45)) / (max - min);
	const tempColor = getComputedStyle(document.documentElement).getPropertyValue('--chart-temp').trim() || '#d9473f';
	const humidityColor = getComputedStyle(document.documentElement).getPropertyValue('--accent-humid').trim() || '#378f83';
	const baseGrid = getComputedStyle(document.documentElement).getPropertyValue('--border').trim() || '#3b5049';
	const labelColor = getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim() || '#a8b8b1';

	context.strokeStyle = baseGrid;
	context.lineWidth = 1;
	[0, 25, 50, 75, 100].forEach((value) => {
		context.beginPath(); context.moveTo(30, y(value)); context.lineTo(width, y(value)); context.stroke();
		context.fillStyle = labelColor; context.font = '11px IBM Plex Mono'; context.fillText(value, 3, y(value) + 4);
	});
	[[temps, tempColor], [umids, humidityColor]].forEach(([series, color]) => {
		context.beginPath();
		series.forEach((value, index) => index === 0 ? context.moveTo(x(index), y(value)) : context.lineTo(x(index), y(value)));
		context.lineTo(x(series.length - 1), height - 24); context.lineTo(x(0), height - 24); context.closePath();
		context.fillStyle = color === tempColor ? 'rgba(217,71,63,.14)' : 'rgba(63,118,191,.14)'; context.fill();
		context.beginPath(); context.strokeStyle = color; context.lineWidth = 3;
		series.forEach((value, index) => index === 0 ? context.moveTo(x(index), y(value)) : context.lineTo(x(index), y(value)));
		context.stroke();
		series.forEach((value, index) => { context.beginPath(); context.fillStyle = color; context.arc(x(index), y(value), 4.5, 0, Math.PI * 2); context.fill(); });
	});
	context.fillStyle = labelColor; context.font = '11px IBM Plex Mono';
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

	const tempColor = getComputedStyle(document.documentElement).getPropertyValue('--chart-temp').trim() || '#d9473f';
	const humidityColor = getComputedStyle(document.documentElement).getPropertyValue('--accent-humid').trim() || '#378f83';
	const isLightTheme = document.documentElement.getAttribute('data-theme') === 'light';
	const chartTextColor = isLightTheme ? '#666666' : '#a9bfd6';
	const chartGridColor = isLightTheme ? 'rgba(80, 100, 120, 0.14)' : 'rgba(138, 171, 196, 0.12)';

	chart = new Chart(ctx, {
		type: 'line',
		data: {
			labels: [],
			datasets: [
				{
					label: 'Temperatura °C',
					data: [],
					yAxisID: 'temperature',
					borderColor: tempColor,
					backgroundColor: 'rgba(217,71,63,0.15)',
					fill: false,
					tension: 0.18,
					cubicInterpolationMode: 'monotone',
					borderWidth: 3,
					pointRadius: 3,
					pointHoverRadius: 5,
					pointBackgroundColor: '#f4d4b1',
					pointBorderColor: tempColor,
					pointBorderWidth: 2,
					relation: 'temperature'
				},
				{
					label: 'Umidade %',
					data: [],
					yAxisID: 'humidity',
					borderColor: humidityColor,
					backgroundColor: 'rgba(55,143,131,0.12)',
					fill: false,
					tension: 0.18,
					cubicInterpolationMode: 'monotone',
					borderWidth: 3,
					pointRadius: 3,
					pointHoverRadius: 5,
					pointBackgroundColor: '#d7efe7',
					pointBorderColor: humidityColor,
					pointBorderWidth: 2,
					relation: 'humidity'
				}
			]
		},
		options: {
			responsive: true,
			maintainAspectRatio: false,
			animation: { duration: 450, easing: 'easeOutCubic' },
			interaction: { mode: 'index', intersect: false },
			plugins: {
				legend: { display: false },
				tooltip: {
					backgroundColor: isLightTheme ? 'rgba(255, 255, 255, 0.96)' : 'rgba(10, 20, 32, 0.96)',
					borderColor: 'rgba(217,71,63,0.8)',
					borderWidth: 1,
					padding: 10,
					titleColor: isLightTheme ? '#1a1a1a' : '#f6f3eb',
					bodyColor: isLightTheme ? '#1a1a1a' : '#f6f3eb',
					titleFont: { family: 'IBM Plex Mono', size: 11 },
					bodyFont: { family: 'Inter', size: 12, weight: '600' },
					displayColors: true,
					callbacks: {
						title: (items) => items[0]?.label || '',
						label: (context) => {
							const value = Number(context.raw);
							return context.dataset.label.startsWith('Temperatura') ? `Temperatura: ${value.toFixed(1)} °C` : `Umidade: ${value.toFixed(0)}%`;
						}
					}
				}
			},
			scales: {
				x: {
					grid: {
						color: chartGridColor,
						tickLength: 0,
						drawBorder: false
					},
					border: { display: false },
					ticks: {
						color: chartTextColor,
						maxRotation: 0,
						autoSkip: true,
						maxTicksLimit: 6,
						font: { family: 'IBM Plex Mono', size: 11 }
					}
				},
				temperature: {
					type: 'linear',
					position: 'left',
					grace: '5%',
					grid: {
						color: chartGridColor,
						drawBorder: false,
						tickLength: 0
					},
					border: { display: false },
					ticks: {
						color: '#d9473f',
						precision: 0,
						maxTicksLimit: 6,
						callback: (value) => `${value.toFixed(0)}°`
					},
					niceMin: true,
					niceMax: true
				},
				humidity: {
					type: 'linear',
					position: 'right',
					min: 0,
					max: 100,
					grid: { drawOnChartArea: false },
					border: { display: false },
					ticks: {
						color: '#9bd8c8',
						precision: 0,
						maxTicksLimit: 6,
						callback: (value) => `${value.toFixed(0)}%`
					}
				}
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

	if (t === null || u === null || t < -20 || t > 60 || u < 0 || u > 100){
		setChartEmptyState(true, 'Leitura inválida do sensor.');
		tempReading.classList.remove('is-loading');
		umidReading.classList.remove('is-loading');
		windReading.classList.remove('is-loading');
		tempSubEl.textContent = 'leitura inválida do sensor';
		umidSubEl.textContent = 'leitura inválida do sensor';
		return;
	}
	setChartEmptyState(false);

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
	temperatureAlertBar?.classList.toggle('visivel', t >= temperatureAlertLimit);

	const c = ensureChart();
	if (c){
		const chartSignature = `${historyLabels.join('|')}::${historyTemps.join('|')}::${historyUmids.join('|')}`;
		if (chartSignature !== lastChartSignature){
			lastChartSignature = chartSignature;
			c.data.labels = historyLabels;
			c.data.datasets[0].data = historyTemps;
			c.data.datasets[1].data = historyUmids;
			c.update('none');
		}
	} else {
		drawFallbackChart(historyLabels, historyTemps, historyUmids);
	}

	const readingDate = getReadingDate(latest.timestamp);
	lastUpdatedEl.textContent = readingDate
		? 'última leitura: ' + readingDate.toLocaleTimeString('pt-BR')
		: 'última leitura: horário indisponível';
	const dashboardUpdated = document.getElementById('dashboardUpdated');
	const sidebarUpdated = document.getElementById('sidebarUpdated');
	const staleReading = document.getElementById('staleReading');
	const formattedTime = readingDate ? readingDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : 'horário indisponível';
	if (dashboardUpdated) dashboardUpdated.textContent = `Atualizado às ${formattedTime}`;
	if (sidebarUpdated) sidebarUpdated.textContent = `Última atualização: ${formattedTime}`;
	if (staleReading) staleReading.hidden = !readingDate || Date.now() - readingDate.getTime() <= SENSOR_OFFLINE_AFTER_MS;
}

function setStatus(online, label){
	statusIndicator.classList.toggle('offline', !online);
	statusText.textContent = label;
	const sidebarStatus = document.getElementById('sidebarStatus');
	if (sidebarStatus) sidebarStatus.textContent = online ? 'Estação online' : 'Estação offline';
}

document.getElementById('sidebarLocationButton')?.addEventListener('click', () => {
	if (!navigator.geolocation) return;
	navigator.geolocation.getCurrentPosition(
		() => { document.getElementById('sidebarLocationButton').textContent = '⌖ Localização atualizada'; },
		() => { document.getElementById('sidebarLocationButton').textContent = '⌖ Permissão negada'; },
		{ timeout: 8000, maximumAge: 300000 }
	);
});

function startDemoMode(){
	setStatus(false, 'modo demonstração');

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
	setInterval(() => {
		if (!document.hidden) tick();
	}, 4000);
}

async function startFirebaseMode(){
	setStatus(false, 'Offline');
	try{
		const { collection, query, orderBy, limit, onSnapshot } =
			await import("https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js");

		const q = query(collection(db, "leituras"), orderBy("timestamp", "desc"), limit(10));

		onSnapshot(q, (snapshot) => {
			if (snapshot.empty){
				setChartEmptyState(true);
				setStatus(false, 'Offline');
				return;
			}

			const docs = snapshot.docs.map(d => d.data()).reverse();
			const labels = docs.map(d => formatChartTime(getReadingDate(d.timestamp)));
			const temps = docs.map(d => getReadingNumber(d.temperatura));
			const umids = docs.map(d => getReadingNumber(d.umidade));
			const latest = docs[docs.length - 1];

			updateSensorStatus(latest);
			updateUI(latest, labels, temps, umids);
		}, (error) => {
			console.error("❌ Erro ao ler o Firestore:", error);
			setChartEmptyState(true, 'Não foi possível carregar as leituras.');
			setStatus(false, 'Offline');
		});

	} catch(error){
		console.error("❌ Falha ao inicializar o Firebase:", error);
		setChartEmptyState(true, 'Não foi possível carregar as leituras.');
		setStatus(false, 'Offline');
	}
}

initTheme();
updateGreeting();
setInterval(updateGreeting, 60 * 1000);
startCountdown();
loadSavedPortalData();
fetchExternalWind();
setInterval(() => {
	if (!document.hidden) fetchExternalWind();
}, 10 * 60 * 1000);
initializeTemperatureMap();
setInterval(() => {
	if (!document.hidden) initializeTemperatureMap();
}, 10 * 60 * 1000);
tempReading.classList.add('is-loading');
umidReading.classList.add('is-loading');
windReading.classList.add('is-loading');

if (!isDemoMode){
	startFirebaseMode();
	setInterval(() => {
		if (!document.hidden && lastSensorReadingDate && Date.now() - lastSensorReadingDate.getTime() > SENSOR_OFFLINE_AFTER_MS){
			setStatus(false, 'Offline');
		}
	}, 15000);
} else {
	startDemoMode();
}
