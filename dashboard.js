import { db, subscribePortalData } from './firebase-data.js';
import { collection, limit, onSnapshot, query } from 'https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js';

const readingQuery = query(collection(db, 'leituras'), limit(500));
const state = { readings: [], humidityLimit: 30, temperatureLimit: 35, chart: null, analysisChart: null, selectedDate: localDateKey(new Date()), menu: {}, events: [], classes: [], externalWind: null };
const $ = (id) => document.getElementById(id);
const hotCities = [
  ['Teresina', -5.0892, -42.8016],
  ['Canto do Buriti', -8.11, -42.94],
  ['Cuiabá', -15.6014, -56.0979],
  ['Palmas', -10.184, -48.3336],
  ['Fortaleza', -3.7319, -38.5267],
];

function readingNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function firstReadingValue(data, keys) {
  const key = keys.find((candidate) => data[candidate] !== undefined && data[candidate] !== null);
  return key ? data[key] : null;
}

function normalizeReading(data, id) {
  return {
    id,
    ...data,
    temperatura: firstReadingValue(data, ['temperatura', 'temperature', 'temp']),
    umidade: firstReadingValue(data, ['umidade', 'humidity', 'hum']),
    vento: firstReadingValue(data, ['vento', 'velocidadeVento', 'ventoKmh', 'windSpeed', 'wind_speed']),
    timestamp: firstReadingValue(data, ['timestamp', 'createdAt', 'dataHora', 'date']),
  };
}

async function loadExternalWind() {
  try {
    const response = await fetch('https://api.open-meteo.com/v1/forecast?latitude=-8.11&longitude=-42.94&current=wind_speed_10m&wind_speed_unit=kmh&timezone=America%2FFortaleza');
    if (!response.ok) throw new Error(`vento HTTP ${response.status}`);
    const payload = await response.json();
    state.externalWind = readingNumber(payload.current?.wind_speed_10m);
    renderHome();
  } catch (error) {
    console.warn('Não foi possível carregar o vento externo:', error);
  }
}

async function loadHotCities() {
  const list = $('hotCitiesList');
  const updated = $('hotCitiesUpdated');
  if (!list || !updated) return;
  try {
    const temperatures = await Promise.all(hotCities.map(async ([name, latitude, longitude]) => {
      const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m&temperature_unit=celsius&timezone=America%2FFortaleza`);
      if (!response.ok) throw new Error(`temperatura HTTP ${response.status}`);
      const payload = await response.json();
      const temperature = readingNumber(payload.current?.temperature_2m);
      return temperature === null ? null : { name, temperature };
    }));
    const ranking = temperatures.filter(Boolean).sort((first, second) => second.temperature - first.temperature).slice(0, 3);
    list.replaceChildren();
    if (!ranking.length) throw new Error('nenhuma temperatura disponível');
    ranking.forEach(({ name, temperature }, index) => {
      const item = document.createElement('li');
      item.className = 'hot-city';
      item.innerHTML = `<span class="hot-city-position">${index + 1}</span><span class="hot-city-name"></span><strong></strong>`;
      item.querySelector('.hot-city-name').textContent = name;
      item.querySelector('strong').textContent = `${temperature.toFixed(1)}°C`;
      list.append(item);
    });
    updated.textContent = `Atualizado às ${formatTime(new Date())}`;
  } catch (error) {
    list.replaceChildren();
    const item = document.createElement('li');
    item.className = 'hot-city-loading';
    item.textContent = 'Não foi possível consultar as cidades agora.';
    list.append(item);
    updated.textContent = 'Indisponível';
    console.warn('Não foi possível carregar o ranking de cidades:', error);
  }
}

function readingDate(timestamp) {
  if (timestamp && typeof timestamp.toDate === 'function') return timestamp.toDate();
  if (typeof timestamp === 'string' && Number.isNaN(Number(timestamp))) {
    const parsed = new Date(timestamp);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  const value = Number(timestamp);
  const date = new Date(value < 100000000000 ? value * 1000 : value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatTime(date) {
  return date ? date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--';
}

function formatDateTime(date) {
  return date ? date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'medium' }) : 'Sem horário';
}

function formatChartLabel(date) {
  return date ? date.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '--';
}

function localDateKey(date) {
  if (!date) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function setStatus(online, label) {
  const indicator = $('statusIndicator');
  if (indicator) {
    indicator.classList.toggle('offline', !online);
    $('statusText').textContent = label;
  }
}

function setView(viewName) {
  document.querySelectorAll('.view').forEach((view) => view.classList.toggle('active', view.id === `view-${viewName}`));
  document.querySelectorAll('.nav-link').forEach((link) => link.classList.toggle('active', link.dataset.view === viewName));
  history.replaceState(null, '', `#${viewName}`);
  if (viewName === 'analysis') renderAnalysis();
  if (viewName === 'data') renderDataTable();
}

document.querySelectorAll('.nav-link[data-view]').forEach((link) => link.addEventListener('click', (event) => {
  event.preventDefault();
  setView(link.dataset.view);
}));
document.querySelectorAll('[data-open-view]').forEach((link) => link.addEventListener('click', (event) => {
  event.preventDefault();
  setView(link.dataset.openView);
}));

function compactReadings(readings, maxPoints = 28) {
  const ordered = readings.slice().reverse();
  if (ordered.length <= maxPoints) return ordered;
  const bucketSize = Math.ceil(ordered.length / maxPoints);
  return Array.from({ length: Math.ceil(ordered.length / bucketSize) }, (_, index) => {
    const bucket = ordered.slice(index * bucketSize, (index + 1) * bucketSize);
    const temperatures = bucket.map((item) => readingNumber(item.temperatura)).filter((value) => value !== null);
    const humidity = bucket.map((item) => readingNumber(item.umidade)).filter((value) => value !== null);
    return {
      timestamp: bucket[bucket.length - 1]?.timestamp,
      temperatura: temperatures.length ? temperatures.reduce((sum, value) => sum + value, 0) / temperatures.length : null,
      umidade: humidity.length ? humidity.reduce((sum, value) => sum + value, 0) / humidity.length : null,
    };

  });
}

function setupClimateCards() {
  const grid = document.querySelector('#view-home .card-grid');
  if (!grid || grid.dataset.climateReady) return;
  grid.dataset.climateReady = 'true';
  grid.classList.add('climate-grid');
  grid.innerHTML = `
    <article class="climate-card"><span class="climate-label">Temperatura</span><div class="gauge-circle temperature-gauge"><div class="gauge-center"><strong id="tempValue">--</strong><small>°C</small></div></div><span class="gauge-caption" id="tempCaption">Aguardando leitura</span></article>
    <article class="climate-card"><span class="climate-label">Umidade relativa</span><div class="gauge-circle humidity-gauge"><div class="gauge-center"><strong id="humidityValue">--</strong><small>%</small></div></div><span class="gauge-caption" id="humidityCaption">Aguardando leitura</span></article>
    <article class="climate-card wind-climate-card"><span class="climate-label">Vento</span><div class="wind-symbol">↗</div><div class="wind-value" id="windValue">--<small>km/h</small></div><span class="gauge-caption" id="windCaption">Sem leitura do vento</span></article>
    <article class="climate-card station-climate-card"><div class="metric-head"><span class="metric-icon purple">▣</span>Estação</div><div class="station-value" id="stationValue">Offline</div><span class="metric-caption" id="stationCaption">DHT11 · ESP32 · Firebase</span></article>`;
}

function setupSchoolViews() {
  const nav = document.querySelector('.nav');
  const main = document.querySelector('main');
  if (!nav || !main || document.getElementById('view-school')) return;
  [['home', '◌', 'Clima'], ['schedules', '▤', 'Horários'], ['credits', '✦', 'Créditos']].forEach(([view, icon, label]) => {
    const link = document.createElement('a');
    link.className = 'nav-link'; link.dataset.view = view; link.href = `#${view}`; link.innerHTML = `<span class="nav-icon">${icon}</span>${label}`;
    link.addEventListener('click', (event) => { event.preventDefault(); setView(view); });
    nav.append(link);
  });
  const school = document.createElement('section');
  school.className = 'view'; school.id = 'view-school';
  school.innerHTML = `<div class="view-heading"><div><span class="kicker">Organização escolar</span><h2>Rotina do dia.</h2><p>Aulas, cardápio, avisos e turmas em um só lugar.</p></div><span class="updated" id="schoolDateLabel"></span></div><div class="school-layout"><section class="panel"><div class="panel-header"><div><span class="kicker">Agora</span><h3 id="schoolCurrentTitle">A programação de hoje</h3></div><span class="updated" id="schoolCountdown"></span></div><div class="school-timeline" id="schoolTimeline"></div></section><section class="panel school-menu"><div class="panel-header"><div><span class="kicker">Almoço</span><h3>Cardápio de hoje</h3></div><span class="status-pill">publicado</span></div><strong id="schoolMenuMain">Cardápio ainda não publicado</strong><p id="schoolMenuDetails">Consulte a administração para saber o almoço de hoje.</p></section></div><div class="school-layout"><section class="panel"><div class="panel-header"><div><span class="kicker">Avisos</span><h3>Central de avisos</h3></div><span class="updated" id="schoolEventCount">0 publicados</span></div><div class="school-notices" id="schoolNotices"></div></section><section class="panel"><div class="panel-header"><div><span class="kicker">Turmas</span><h3>Horários e perfis</h3></div><span class="updated" id="schoolClassCount">0 cadastradas</span></div><div class="school-classes" id="schoolClasses"></div></section></div>`;
  school.innerHTML = `<nav class="school-tabs" aria-label="Seções escolares"><a class="active" href="#school">Agora</a><a href="#schoolTimeline">Aulas</a><a href="#schoolMenuMain">Almoço</a><a href="#schoolNotices">Avisos</a><a href="#schoolClasses">Turmas</a><a href="#home" data-open-view="home">Clima</a><a href="admin.html">Administração</a></nav><div class="view-heading"><div><span class="kicker">Organização escolar</span><h2>Rotina do dia.</h2><p>Aulas, cardápio, avisos e turmas em um só lugar.</p></div><span class="updated" id="schoolDateLabel"></span></div><div class="school-layout"><section class="panel"><div class="panel-header"><div><span class="kicker">Agora</span><h3 id="schoolCurrentTitle">A programação de hoje</h3></div><span class="updated" id="schoolCountdown"></span></div><div class="school-timeline" id="schoolTimeline"></div></section><section class="panel school-menu" id="schoolMenuPanel"><div class="panel-header"><div><span class="kicker">Almoço</span><h3>Cardápio de hoje</h3></div><span class="status-pill">publicado</span></div><strong id="schoolMenuMain">Cardápio ainda não publicado</strong><p id="schoolMenuDetails">Consulte a administração para saber o almoço de hoje.</p></section></div><div class="school-layout"><section class="panel"><div class="panel-header"><div><span class="kicker">Avisos</span><h3>Central de avisos</h3></div><span class="updated" id="schoolEventCount">0 publicados</span></div><div class="school-notices" id="schoolNotices"></div></section><section class="panel"><div class="panel-header"><div><span class="kicker">Turmas</span><h3>Horários e perfis</h3></div><span class="updated" id="schoolClassCount">0 cadastradas</span></div><div class="school-classes" id="schoolClasses"></div></section></div>`;
  school.innerHTML = `<nav class="school-tabs" aria-label="Seções escolares"><a class="active" href="#school">Agora</a><a href="#schoolTimeline">Aulas</a><a href="#schoolMenuMain">Almoço</a><a href="#schoolNotices">Avisos</a><a href="#schoolClasses">Turmas</a><a href="#home" data-open-view="home">Clima</a><a href="admin.html">Administração</a></nav><div class="school-hero"><section class="school-now"><span class="kicker">O que está acontecendo agora?</span><h2 id="schoolCurrentTitle">Atividades encerradas</h2><p id="schoolCurrentDetail">Até o próximo dia letivo</p><div class="school-dash" aria-hidden="true">—　—　•　—　—　•　—</div><small id="schoolNext">Próxima aula: amanhã, 06:50</small></section><section class="panel school-menu" id="schoolMenuPanel"><div class="panel-header"><div><span class="kicker">Almoço</span><h3>Cardápio de hoje</h3></div><span class="status-pill">servido hoje</span></div><strong id="schoolMenuMain">Cardápio ainda não publicado</strong><p id="schoolMenuDetails">Consulte a administração para saber o almoço de hoje.</p></section></div><section class="panel school-timeline-panel"><div class="panel-header"><div><span class="kicker">Aulas</span><h3>Linha do tempo do dia</h3></div><span class="updated" id="schoolDateLabel"></span></div><div class="school-timeline" id="schoolTimeline"></div></section><section class="panel school-summary"><div class="panel-header"><div><span class="kicker">Resumo do dia</span><h3>Na escola hoje</h3></div><span class="updated" id="schoolSummaryDate"></span></div><div class="school-summary-grid"><article><span>Horário</span><strong>06:50 · 16:10</strong><small id="schoolSummarySchedule">A programação do dia</small></article><article><span>Aula em andamento</span><strong id="schoolSummaryClass">Atividades encerradas</strong><small id="schoolSummaryDetail">Até o próximo dia letivo</small></article><article class="urgent"><span>Avisos urgentes</span><strong id="schoolSummaryNotice">Nenhum aviso urgente</strong><small>Central de avisos</small></article></div></section><div class="school-layout school-lower"><section class="panel"><div class="panel-header"><div><span class="kicker">Avisos</span><h3>Central de avisos</h3></div><span class="updated" id="schoolEventCount">0 publicados</span></div><div class="school-notices" id="schoolNotices"></div></section><section class="panel"><div class="panel-header"><div><span class="kicker">Turmas</span><h3>Horários e perfis</h3></div><span class="updated" id="schoolClassCount">0 cadastradas</span></div><div class="school-classes" id="schoolClasses"></div></section></div>`;
  school.querySelector('.school-tabs')?.remove();
  main.append(school);
  school.querySelector('.school-dash')?.remove();
  const schoolClock = document.createElement('time');
  schoolClock.className = 'school-clock';
  schoolClock.id = 'schoolClock';
  schoolClock.setAttribute('aria-label', 'Tempo até a próxima aula');
  school.querySelector('.school-now p').after(schoolClock);
  const schedules = document.createElement('section');
  schedules.className = 'view'; schedules.id = 'view-schedules';
  schedules.innerHTML = `<div class="view-heading"><div><span class="kicker">Horários escolares</span><h2>Grades e perfis.</h2><p>Escolha uma turma para consultar a grade semanal.</p></div></div><section class="schedule-cards" id="scheduleCards"></section>`;
  main.append(schedules);
  renderSchedules();
  renderSchoolClasses([]);
  renderSchoolEvents([]);
  const credits = document.createElement('section');
  credits.className = 'view'; credits.id = 'view-credits';
  credits.innerHTML = `<div class="view-heading"><div><span class="kicker">Desenvolvimento</span><h2>Equipe do projeto.</h2><p>Contribuições reunidas em uma experiência de monitoramento ambiental.</p></div></div><section class="panel credits-grid-new" id="creditsGrid"></section>`;
  main.append(credits);
  renderCredits();
  subscribePortalData({ onMenu: renderSchoolMenu, onEvents: renderSchoolEvents, onClasses: renderSchoolClasses });
  updateSchoolSchedule();
  updateSchoolClock();
  setInterval(updateSchoolClock, 1000);
  setInterval(() => { if (!document.hidden) updateSchoolSchedule(); }, 30000);
}

const schoolPeriods = [['06:50', 'Aula 1'], ['07:50', 'Aula 2'], ['08:50', 'Intervalo'], ['09:10', 'Aula 3'], ['10:10', 'Aula 4'], ['11:10', 'Aula 5'], ['12:10', 'Almoço'], ['12:50', 'Aula 6'], ['13:50', 'Aula 7'], ['14:50', 'Intervalo'], ['15:10', 'Aula 8']];
function updateSchoolClock() {
  const clock = $('schoolClock');
  if (!clock) return;
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const parseMinutes = (time) => {
    const [hour, minute] = time.split(':').map(Number);
    return hour * 60 + minute;
  };
  const currentIndex = schoolPeriods.findIndex(([start], index) => {
    const end = schoolPeriods[index + 1]?.[0] || '16:10';
    return currentMinutes >= parseMinutes(start) && currentMinutes < parseMinutes(end);
  });
  let target = new Date(now);
  let nextStart;
  if (currentIndex >= 0) {
    nextStart = schoolPeriods[currentIndex + 1]?.[0] || '16:10';
  } else {
    nextStart = schoolPeriods.find(([start]) => parseMinutes(start) > currentMinutes)?.[0] || '06:50';
    if (currentMinutes >= parseMinutes(nextStart)) target.setDate(target.getDate() + 1);
  }
  const [nextHour, nextMinute] = nextStart.split(':').map(Number);
  target.setHours(nextHour, nextMinute, 0, 0);
  const remaining = Math.max(0, target.getTime() - now.getTime());
  const totalSeconds = Math.floor(remaining / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  clock.textContent = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function updateSchoolSchedule() {
  const timeline = $('schoolTimeline'); if (!timeline) return;
  const now = new Date(); const minutes = now.getHours() * 60 + now.getMinutes();
  $('schoolDateLabel').textContent = now.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
  timeline.replaceChildren();
  schoolPeriods.forEach(([start, label], index) => {
    const [hour, minute] = start.split(':').map(Number); const startMinutes = hour * 60 + minute; const next = schoolPeriods[index + 1]?.[0] || '16:10'; const [nextHour, nextMinute] = next.split(':').map(Number); const endMinutes = nextHour * 60 + nextMinute;
    const item = document.createElement('div'); item.className = `school-period${minutes >= startMinutes && minutes < endMinutes ? ' current' : ''}${minutes >= endMinutes ? ' done' : ''}`; item.innerHTML = `<span>${start}</span><strong>${label}</strong><small>${minutes >= endMinutes ? 'Encerrado' : minutes >= startMinutes ? 'Em andamento' : 'Próximo'}</small>`; timeline.append(item);
  });
  const current = schoolPeriods.find(([start], index) => { const [hour, minute] = start.split(':').map(Number); const [nextHour, nextMinute] = (schoolPeriods[index + 1]?.[0] || '16:10').split(':').map(Number); return minutes >= hour * 60 + minute && minutes < nextHour * 60 + nextMinute; });
  $('schoolCurrentTitle').textContent = current ? `${current[1]} em andamento` : minutes < 410 ? 'Aulas começam em breve' : 'Atividades encerradas';
  const schoolCountdown = $('schoolCountdown');
  if (schoolCountdown) schoolCountdown.textContent = current ? `Próxima mudança às ${schoolPeriods[schoolPeriods.indexOf(current) + 1]?.[0] || '16:10'}` : 'Próximo dia letivo às 06:50';
  $('schoolCurrentDetail').textContent = current ? 'Período letivo em andamento' : 'Até o próximo dia letivo';
  $('schoolNext').textContent = current ? `Próxima aula: ${schoolPeriods[schoolPeriods.indexOf(current) + 1]?.[0] || '16:10'}` : 'Próxima aula: amanhã, 06:50';
  $('schoolSummaryDate').textContent = $('schoolDateLabel').textContent;
  $('schoolSummaryClass').textContent = current ? `${current[1]} em andamento` : 'Atividades encerradas';
  $('schoolSummaryDetail').textContent = current ? 'Período letivo em andamento' : 'Até o próximo dia letivo';
}

function renderSchoolMenu(menu) {
  state.menu = menu || {}; const today = state.menu[String(new Date().getDay())];
  $('schoolMenuMain').textContent = today?.main || 'Cardápio ainda não publicado';
  $('schoolMenuDetails').textContent = today ? `${today.side || 'Acompanhamento não informado'} · ${today.time || 'Horário não informado'}` : 'Consulte a administração para saber o almoço de hoje.';
}

function renderSchoolEvents(events = []) {
  state.events = events; $('schoolEventCount').textContent = `${events.length} publicados`; const list = $('schoolNotices'); list.replaceChildren();
  if (!events.length) { list.innerHTML = '<div class="empty">Nenhum aviso publicado.</div>'; return; }
  events.slice(0, 6).forEach((event) => { const item = document.createElement('article'); item.className = 'school-notice'; item.innerHTML = `<strong></strong><p></p>`; item.querySelector('strong').textContent = event.title || 'Aviso'; item.querySelector('p').textContent = `${event.date || 'Sem data'} · ${event.details || 'Sem detalhes'}`; list.append(item); });
}

function renderSchoolClasses(classes = []) {
  const fallbackClasses = [
    { name: '1ª DS A', year: '1ª série', teacher: 'Silas', key: 'ds1a' },
    { name: '1ª DS B', year: '1ª série', teacher: 'Silvana', key: 'ds1b' },
    { name: '2ª DS', year: '2ª série', teacher: 'Vandson', key: 'ds2' },
    { name: '2ª marketing', year: '2ª série', teacher: 'Valdeir', key: 'marketing2' },
    { name: '3ª manhã', year: '3ª série', teacher: 'Período da manhã', key: '3manha' },
    { name: '3ª tarde', year: '3ª série', teacher: 'Período da tarde', key: '3tarde' },
  ];
  const visibleClasses = classes.length ? classes : fallbackClasses;
  const list = $('schoolClasses');
  state.classes = classes;
  $('schoolClassCount').textContent = classes.length ? `${classes.length} cadastradas` : 'turmas oficiais';
  list.replaceChildren();
  visibleClasses.forEach((item) => {
    const card = document.createElement('article');
    card.className = 'school-class';
    const year = document.createElement('span');
    year.textContent = item.year || 'Turma';
    const name = document.createElement('strong');
    name.textContent = item.name || 'Turma sem nome';
    const details = document.createElement('small');
    details.textContent = `${item.teacher || 'Professor não informado'}${item.students ? ` · ${item.students} alunos` : ''}`;
    card.append(year, name, details);
    if (item.key) {
      const link = document.createElement('a');
      link.href = `horario-ds.html?turma=${encodeURIComponent(String(item.key))}`;
      link.textContent = 'Ver horário →';
      card.append(link);
    }
    list.append(card);
  });
}

function renderCredits() {
  const people = [['🗄️', 'Kawan Eminem', 'Banco de Dados'], ['💻', 'Dante Emanuel', 'Front End e Back End'], ['🎨', 'Maria Clara Alves', 'Design'], ['🔎', 'Maria Clara Souza', 'Análise de Dados'], ['🌿', 'Lunna Maria', 'Observação do Ambiente'], ['🗣️', 'Erick', 'Informantes'], ['📣', 'Everton', 'Informante'], ['📍', 'Ronald', 'Análise de Localização'], ['☀️', 'Isabela', 'Exposição Solar'], ['🛡️', 'Gabriel', 'Segurança do Equipamento'], ['📶', 'Pedro', 'Conectividade Wi-Fi'], ['🌡️', 'Hellen', 'Conforto Térmico'], ['📈', 'Lorrany', 'Histórico de Dados'], ['💡', 'Monaliza', 'Decisões e Aplicações'], ['📊', 'Daniel', 'Desenvolvimento dos Gráficos'], ['🔗', 'Ruan', 'Acesso ao Sistema']];
  $('creditsGrid').innerHTML = people.map(([emoji, name, role]) => `<article class="credit-card-new"><span class="credit-emoji-new" aria-hidden="true">${emoji}</span><strong>${name}</strong><small>${role}</small></article>`).join('');
}

function renderSchedules() {
  const schedules = [['1ª DS A', '1ª série', 'Desenvolvimento de Sistemas', 'ds1a'], ['1ª DS B', '1ª série', 'Desenvolvimento de Sistemas', 'ds1b'], ['2ª DS', '2ª série', 'Desenvolvimento de Sistemas', 'ds2'], ['2ª Marketing', '2ª série', 'Turma integrada', 'marketing2'], ['3ª manhã', '3ª série', 'Período da manhã', '3manha'], ['3ª tarde', '3ª série', 'Período da tarde', '3tarde'], ['9º manhã', '9º ano', 'Período da manhã', '9manha'], ['9º tarde A', '9º ano', 'Período da tarde', '9tardea'], ['9º tarde B', '9º ano', 'Período da tarde', '9tardeb']];
  $('scheduleCards').innerHTML = schedules.map(([name, year, detail, key]) => `<article class="schedule-card"><span>${year}</span><h3>${name}</h3><p>${detail}</p><a href="horario-ds.html?turma=${key}">Ver horário →</a></article>`).join('');
}

function hideHomeExtras() {
  document.querySelector('#view-home .insight')?.classList.add('home-extra-hidden');
  document.querySelector('#view-home .recommendation')?.closest('.panel')?.classList.add('home-extra-hidden');
}

function setupNoticeView() {
  const view = $('view-alerts');
  if (!view) return;
  const title = view.querySelector('h2');
  const description = view.querySelector('.view-heading p');
  const sectionTitle = view.querySelector('.panel-header h3');
  const kicker = view.querySelector('.view-heading .kicker');
  if (kicker) kicker.textContent = 'Comunicação escolar';
  if (title) title.textContent = 'Central de avisos.';
  if (description) description.textContent = 'Informações da administração e ocorrências identificadas pela estação.';
  if (sectionTitle) sectionTitle.textContent = 'Comunicados do portal';
}

function renderChart() {
  const chartReadings = compactReadings(state.readings);
  const labels = chartReadings.map((item) => formatChartLabel(readingDate(item.timestamp)));
  const temperatures = chartReadings.map((item) => readingNumber(item.temperatura));
  const humidity = chartReadings.map((item) => readingNumber(item.umidade));
  const canvas = $('readingChart');
  if (!canvas || typeof Chart === 'undefined') return;
  if (state.chart) state.chart.destroy();
  state.chart = new Chart(canvas, {
    type: 'line',
    data: { labels, datasets: [
      { label: 'Temperatura °C', data: temperatures, borderColor: '#ff3b3b', backgroundColor: 'rgba(255,59,59,.12)', borderWidth: 2.5, pointRadius: 1.8, pointHoverRadius: 5, pointBackgroundColor: '#ff3b3b', tension: .35, cubicInterpolationMode: 'monotone', spanGaps: true, fill: false, yAxisID: 'temperature' },
      { label: 'Umidade %', data: humidity, borderColor: '#3f82c4', backgroundColor: 'rgba(63,130,196,.1)', borderWidth: 2.5, pointRadius: 1.8, pointHoverRadius: 5, pointBackgroundColor: '#9ed2ff', tension: .35, cubicInterpolationMode: 'monotone', spanGaps: true, fill: false, yAxisID: 'humidity' },
    ] },
    options: { responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false }, plugins: {
      legend: { position: 'top', align: 'center', labels: { color: '#d8def2', font: { family: 'DM Sans', size: 10, weight: '600' }, usePointStyle: true, pointStyle: 'circle', padding: 18 } },
      tooltip: { backgroundColor: '#0a1228', borderColor: '#416083', borderWidth: 1, padding: 10, titleColor: '#f3f6ff', bodyColor: '#d8def2', titleFont: { family: 'IBM Plex Mono', size: 10 }, bodyFont: { family: 'DM Sans', size: 11 } },
    }, scales: {
      x: { grid: { color: 'rgba(111,143,190,.14)' }, ticks: { color: '#a9b8d5', maxTicksLimit: 8, maxRotation: 0, font: { family: 'IBM Plex Mono', size: 9 } }, border: { display: false } },
      temperature: { position: 'left', grace: '5%', grid: { color: 'rgba(111,143,190,.14)' }, ticks: { color: '#ff4d4d', callback: (value) => `${value}°`, font: { family: 'IBM Plex Mono', size: 9 } }, border: { display: false } },
      humidity: { position: 'right', min: 0, max: 100, grid: { drawOnChartArea: false }, ticks: { color: '#8fc5ed', callback: (value) => `${value}%`, font: { family: 'IBM Plex Mono', size: 9 } }, border: { display: false } },
    } },
  });
}

function comfortScore(temperature, humidity) {
  if (temperature === null || humidity === null) return '--';
  const score = Math.max(0, Math.min(100, 100 - Math.abs(temperature - 25) * 6 - Math.abs(humidity - 55) * .7));
  return Math.round(score);
}

function renderHome() {
  const latest = state.readings[0];
  if (!latest) {
    $('emptyHome').hidden = false;
    const wind = state.externalWind;
    $('windValue').innerHTML = wind === null ? '--<small>km/h</small>' : `${wind.toFixed(0)}<small>km/h</small>`;
    $('windCaption').textContent = wind === null ? 'Sem leitura do vento' : 'Vento externo · Canto do Buriti';
    return;
  }
  $('emptyHome').hidden = true;
  const temperature = readingNumber(latest.temperatura);
  const humidity = readingNumber(latest.umidade);
  const date = readingDate(latest.timestamp);
  $('tempValue').innerHTML = temperature === null ? '--' : `${temperature.toFixed(1)}<small>°C</small>`;
  $('humidityValue').innerHTML = humidity === null ? '--' : `${humidity.toFixed(0)}<small>%</small>`;
  document.querySelector('.temperature-gauge')?.style.setProperty('--gauge-progress', `${Math.max(0, Math.min(100, (temperature / 45) * 100))}%`);
  document.querySelector('.humidity-gauge')?.style.setProperty('--gauge-progress', `${Math.max(0, Math.min(100, humidity || 0))}%`);
  $('tempCaption').textContent = temperature >= state.temperatureLimit ? 'Acima do limite' : temperature >= 27 ? 'Calor' : 'Dentro do limite';
  $('humidityCaption').textContent = humidity < state.humidityLimit ? 'Baixa umidade' : 'Dentro do limite';
  const wind = readingNumber(latest.vento ?? latest.velocidadeVento ?? latest.ventoKmh ?? latest.windSpeed ?? latest.wind_speed) ?? state.externalWind;
  $('windValue').innerHTML = wind === null ? '--<small>km/h</small>' : `${wind.toFixed(0)}<small>km/h</small>`;
  $('windCaption').textContent = wind === null ? 'Sem leitura do sensor' : wind < 5 ? 'Vento calmo' : wind < 15 ? 'Brisa leve' : 'Vento moderado';
  $('stationValue').textContent = date && Date.now() - date.getTime() <= 120000 ? 'Online' : 'Offline';
  $('stationCaption').textContent = `DHT11 · ESP32 · ${formatTime(date)}`;
  $('lastUpdated').textContent = date ? `Atualizado às ${formatTime(date)}` : 'Sem atualização';
  $('dataUpdated').textContent = date ? formatTime(date) : '--';
  $('staleBanner').hidden = Boolean(date && Date.now() - date.getTime() <= 120000);
  setStatus(Boolean(date && Date.now() - date.getTime() <= 120000), date ? `Atualizado às ${formatTime(date)}` : 'Offline');

  const alertCount = state.readings.filter((item) => readingNumber(item.umidade) < state.humidityLimit || readingNumber(item.temperatura) >= state.temperatureLimit).length;
  $('alertCount').textContent = alertCount;
  $('alertCount').hidden = alertCount === 0;
  $('insightTitle').textContent = humidity < state.humidityLimit ? 'Atenção à umidade' : temperature >= state.temperatureLimit ? 'Temperatura elevada' : 'Últimas condições registradas';
  $('insightText').textContent = humidity < state.humidityLimit ? 'A umidade está abaixo do limite configurado para o ambiente.' : 'Os dados mais recentes estão dentro dos limites configurados.';
  $('variationTemperature').textContent = variation('temperatura', '°C');
  $('variationHumidity').textContent = variation('umidade', ' p.p.');
  $('rangeTemperature').textContent = range('temperatura', '°C');
  $('validPercent').textContent = `${Math.round((state.readings.filter((item) => readingNumber(item.temperatura) !== null && readingNumber(item.umidade) !== null).length / Math.max(1, state.readings.length)) * 100)}%`;
  renderChart();
  renderAlerts();
}

function variation(field, suffix) {
  const values = state.readings.map((item) => readingNumber(item[field])).filter((value) => value !== null);
  if (values.length < 2) return '--';
  const difference = values[0] - values[values.length - 1];
  return `${difference >= 0 ? '↑' : '↓'} ${Math.abs(difference).toFixed(field === 'umidade' ? 0 : 1)}${suffix}`;
}

function range(field, suffix) {
  const values = state.readings.map((item) => readingNumber(item[field])).filter((value) => value !== null);
  if (!values.length) return '--';
  return `${Math.min(...values).toFixed(1)}${suffix} → ${Math.max(...values).toFixed(1)}${suffix}`;
}

function renderAlerts() {
  const alerts = state.readings.filter((item) => readingNumber(item.umidade) < state.humidityLimit || readingNumber(item.temperatura) >= state.temperatureLimit).slice(0, 8);
  ['alertsList', 'homeAlerts'].forEach((listId) => {
    const list = $(listId);
    list.replaceChildren();
    if (!alerts.length) { list.innerHTML = '<div class="empty">Nenhum alerta recente.</div>'; return; }
    alerts.slice(0, listId === 'homeAlerts' ? 3 : alerts.length).forEach((item) => {
      const temperature = readingNumber(item.temperatura);
      const humidity = readingNumber(item.umidade);
      const alert = document.createElement('article');
      alert.className = `alert-item ${temperature >= state.temperatureLimit ? 'critical' : ''}`;
      alert.innerHTML = `<span class="alert-symbol">!</span><div><strong>${temperature >= state.temperatureLimit ? 'Temperatura acima do limite' : 'Umidade baixa'}</strong><p>${temperature?.toFixed(1) || '--'} °C · ${humidity?.toFixed(0) || '--'}% de umidade</p></div><time>${formatTime(readingDate(item.timestamp))}</time>`;
      list.append(alert);
    });
  });
}

function renderWeekStrip() {
  const strip = document.querySelector('#view-data .week-strip');
  if (!strip) return;
  const selected = new Date(`${state.selectedDate}T12:00:00`);
  const monday = new Date(selected);
  monday.setDate(selected.getDate() - ((selected.getDay() + 6) % 7));
  const labels = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM'];
  strip.replaceChildren();
  labels.forEach((label, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    const key = localDateKey(date);
    const count = state.readings.filter((item) => localDateKey(readingDate(item.timestamp)) === key).length;
    const day = document.createElement('button');
    day.type = 'button';
    day.className = `day${key === state.selectedDate ? ' active' : ''}`;
    day.innerHTML = `<span>${label}</span><strong>${String(date.getDate()).padStart(2, '0')}</strong><small>${count ? `${count} leituras` : 'sem dados'}</small>`;
    day.addEventListener('click', () => {
      state.selectedDate = key;
      $('selectedDate').value = key;
      renderDataTable();
    });
    strip.append(day);
  });
}

function renderDataTable() {
  const body = $('readingTableBody');
  body.replaceChildren();
  renderWeekStrip();
  const values = state.readings.filter((item) => localDateKey(readingDate(item.timestamp)) === state.selectedDate);
  $('readingCount').textContent = `${values.length} leituras em ${new Date(`${state.selectedDate}T12:00:00`).toLocaleDateString('pt-BR')}`;
  const selectedDayLabel = $('selectedDayLabel');
  if (selectedDayLabel) selectedDayLabel.textContent = new Date(`${state.selectedDate}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
  if (!values.length) { body.innerHTML = '<tr><td colspan="5" class="empty">Nenhuma leitura encontrada.</td></tr>'; return; }
  const temperatures = values.map((item) => readingNumber(item.temperatura)).filter((item) => item !== null);
  const humidity = values.map((item) => readingNumber(item.umidade)).filter((item) => item !== null);
  $('avgTemperature').textContent = temperatures.length ? `${(temperatures.reduce((a, b) => a + b, 0) / temperatures.length).toFixed(1)} °C` : '--';
  $('avgHumidity').textContent = humidity.length ? `${(humidity.reduce((a, b) => a + b, 0) / humidity.length).toFixed(1)}%` : '--';
  $('minMax').textContent = temperatures.length ? `${Math.min(...temperatures).toFixed(1)}° / ${Math.max(...temperatures).toFixed(1)}°` : '--';
  const filter = $('tableFilter')?.value.trim().toLowerCase() || '';
  values.filter((item) => !filter || formatDateTime(readingDate(item.timestamp)).toLowerCase().includes(filter)).slice(0, 50).forEach((item) => {
    const row = document.createElement('tr');
    const temperature = readingNumber(item.temperatura);
    const humidityValue = readingNumber(item.umidade);
    row.innerHTML = `<td>${formatDateTime(readingDate(item.timestamp))}</td><td>${temperature?.toFixed(1) || '--'}°C</td><td>${humidityValue?.toFixed(1) || '--'}%</td><td>${comfortScore(temperature, humidityValue)}/100</td><td>${temperature >= state.temperatureLimit || humidityValue < state.humidityLimit ? 'Atenção' : 'Moderado'}</td>`;
    body.append(row);
  });
}

function renderAnalysis() {
  $('analysisReadingCount').textContent = state.readings.length;
  const temperatures = state.readings.map((item) => readingNumber(item.temperatura)).filter((item) => item !== null);
  const humidity = state.readings.map((item) => readingNumber(item.umidade)).filter((item) => item !== null);
  $('analysisTemperature').textContent = temperatures.length ? `${(temperatures.reduce((a, b) => a + b, 0) / temperatures.length).toFixed(1)}°C` : '--';
  $('analysisHumidity').textContent = humidity.length ? `${(humidity.reduce((a, b) => a + b, 0) / humidity.length).toFixed(1)}%` : '--';
  $('analysisPeak').textContent = temperatures.length ? `${Math.max(...temperatures).toFixed(1)}°C` : '--';
  if (state.analysisChart) state.analysisChart.destroy();
  const canvas = $('analysisChart');
  if (!canvas || typeof Chart === 'undefined') return;
  state.analysisChart = new Chart(canvas, { type: 'line', data: { labels: state.readings.slice().reverse().map((item) => formatTime(readingDate(item.timestamp))), datasets: [{ label: 'Variação térmica', data: state.readings.slice().reverse().map((item) => readingNumber(item.temperatura)), borderColor: '#55c7ff', borderWidth: 2, pointRadius: 2, tension: .3 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#8d98bb', font: { size: 9 } } } }, scales: { x: { ticks: { color: '#7180a8' }, grid: { color: 'rgba(93,112,160,.1)' } }, y: { ticks: { color: '#55c7ff' }, grid: { color: 'rgba(93,112,160,.1)' } } } } });
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem('theme', theme);
  $('themeToggle').textContent = theme === 'dark' ? '☀' : '◐';
}

function updateGreeting() {
  const greeting = $('greeting');
  if (!greeting) return;
  const hour = new Date().getHours();
  greeting.textContent = hour < 12 ? 'Bom dia!' : hour < 18 ? 'Boa tarde!' : 'Boa noite!';
}

function setupDateFilter() {
  const viewHeading = document.querySelector('#view-data .view-heading');
  if (!viewHeading || $('selectedDate')) return;
  const title = viewHeading.querySelector('h2');
  if (title) title.textContent = 'Uma semana, dia por dia.';
  const description = viewHeading.querySelector('p');
  if (description) description.textContent = 'Escolha um dia para ver suas medições.';
  const controls = document.createElement('div');
  controls.innerHTML = '<input class="ghost-button" id="selectedDate" type="date" aria-label="Selecionar dia"><span class="updated" id="selectedDayLabel"></span>';
  viewHeading.append(controls);
}

setupDateFilter();
setupClimateCards();
hideHomeExtras();
setupNoticeView();
setupSchoolViews();
updateGreeting();
setInterval(updateGreeting, 60 * 1000);
$('themeToggle').addEventListener('click', () => applyTheme(localStorage.getItem('theme') === 'dark' ? 'light' : 'dark'));
applyTheme(localStorage.getItem('theme') || 'dark');
function requestLocation(button) {
  if (!navigator.geolocation) return;
  navigator.geolocation.getCurrentPosition(() => { $('locationButton').textContent = '⌖ Localização atualizada'; }, () => { $('locationButton').textContent = '⌖ Permissão negada'; }, { timeout: 8000, maximumAge: 300000 });
  button.textContent = '⌖ Localização solicitada';
}
$('locationButton').addEventListener('click', () => requestLocation($('locationButton')));
$('headerLocationButton').addEventListener('click', () => requestLocation($('headerLocationButton')));
$('tableFilter').addEventListener('input', renderDataTable);
$('selectedDate').addEventListener('change', (event) => {
  state.selectedDate = event.target.value;
  renderDataTable();
});
$('selectedDate').value = state.selectedDate;

onSnapshot(readingQuery, (snapshot) => {
  state.readings = snapshot.docs
    .map((item) => normalizeReading(item.data(), item.id))
    .sort((first, second) => (readingDate(second.timestamp)?.getTime() || 0) - (readingDate(first.timestamp)?.getTime() || 0));
  if (snapshot.empty) setStatus(false, 'Sem leituras');
  renderHome();
  if (document.getElementById('view-data').classList.contains('active')) renderDataTable();
  if (document.getElementById('view-analysis').classList.contains('active')) renderAnalysis();
}, (error) => {
  console.error('Falha ao carregar leituras:', error);
  setStatus(false, 'Erro de conexão');
  $('emptyHome').hidden = false;
  $('emptyHome').textContent = 'Não foi possível carregar as leituras.';
});

loadExternalWind();
setInterval(() => { if (!document.hidden) loadExternalWind(); }, 10 * 60 * 1000);
loadHotCities();
setInterval(() => { if (!document.hidden) loadHotCities(); }, 10 * 60 * 1000);

const initialView = location.hash.replace('#', '') || 'school';
setView(['home', 'data', 'alerts', 'school', 'schedules', 'credits'].includes(initialView) ? initialView : 'school');