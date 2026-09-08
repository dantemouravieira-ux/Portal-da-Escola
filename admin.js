import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js';
import { addClass, addEvent, auth, removeEvent, saveMenu, saveSettings, subscribePortalData } from './firebase-data.js';

const themeToggle = document.getElementById('themeToggle');
const adminLogin = document.getElementById('adminLogin');
const adminContent = document.getElementById('adminContent');
const loginForm = document.getElementById('loginForm');
const logoutButton = document.getElementById('logoutButton');
const connectionStatus = document.getElementById('connectionStatus');
const ADMIN_EMAIL = 'dantemouravieira@gmail.com';
let unsubscribePortalData = null;
let portalData = { menu: {} };

function hidePageLoader(){
	const loader = document.getElementById('pageLoader');
	if (!loader) return;
	loader.classList.add('is-hidden');
	setTimeout(() => loader.remove(), 450);
}

window.addEventListener('load', () => setTimeout(hidePageLoader, 1200), { once: true });
setTimeout(hidePageLoader, 5000);

function setAdminAccess(isAuthenticated) {
	adminLogin.hidden = isAuthenticated;
	adminContent.hidden = !isAuthenticated;
	logoutButton.hidden = !isAuthenticated;
	connectionStatus.textContent = isAuthenticated ? 'gestor conectado' : 'acesso restrito';
}

function feedback(id, message) { document.getElementById(id).textContent = message; }

function showLoginError(message) {
	feedback('loginFeedback', message);
	adminLogin.classList.remove('login-error');
	document.getElementById('adminPassword').classList.remove('login-error-input');
	void adminLogin.offsetWidth;
	adminLogin.classList.add('login-error');
	document.getElementById('adminPassword').classList.add('login-error-input');
}

function applyTheme(theme) {
	const isLight = theme === 'light';
	document.documentElement.toggleAttribute('data-theme', isLight);
	themeToggle.textContent = isLight ? '☀️' : '🌙';
	themeToggle.setAttribute('aria-pressed', String(isLight));
	localStorage.setItem('theme', isLight ? 'light' : 'dark');
}

function renderAdminEvents(events = []) {
	const list = document.getElementById('adminEventList');
	list.replaceChildren();
	if (!events.length) { list.textContent = 'Nenhum aviso publicado.'; return; }
	events.forEach((event) => {
		const item = document.createElement('div');
		item.className = 'admin-event-item';
		const content = document.createElement('div');
		const title = document.createElement('strong');
		title.textContent = event.title;
		const details = document.createElement('small');
		details.textContent = `${event.date} · ${event.details}`;
		content.append(title, details);
		const removeButton = document.createElement('button');
		removeButton.className = 'remove-event';
		removeButton.type = 'button';
		removeButton.textContent = 'Excluir';
		removeButton.addEventListener('click', async () => {
			const confirmed = window.confirm(`Excluir o aviso "${event.title}"?`);
			if (!confirmed) return;
			try { await removeEvent(event.id); } catch (error) { feedback('eventFeedback', 'Não foi possível excluir o aviso.'); console.error(error); }
		});
		item.append(content, removeButton);
		list.append(item);
	});
}

function renderMenu(menu) {
	portalData.menu = menu;
	loadMenuDay(document.getElementById('menuDay').value);
}

function loadMenuDay(day) {
	const menu = portalData.menu?.[day] || { main: '', side: '', time: '11:30–13:00' };
	document.getElementById('menuMain').value = menu.main || '';
	document.getElementById('menuSide').value = menu.side || '';
	document.getElementById('menuTime').value = menu.time || '';
}

function renderSettings(settings) {
	document.getElementById('humidityLimit').value = settings.humidityAlertLimit ?? 30;
	document.getElementById('temperatureLimit').value = settings.temperatureLimit ?? 35;
	document.getElementById('monitorPoint').value = settings.monitorPoint || 'Pátio central';
	document.getElementById('pointLabel').textContent = settings.monitorPoint || 'Pátio central';
}

themeToggle.addEventListener('click', () => applyTheme((localStorage.getItem('theme') || 'light') === 'dark' ? 'light' : 'dark'));
applyTheme(localStorage.getItem('theme') || 'light');

loginForm.addEventListener('submit', async (event) => {
	event.preventDefault();
	try {
		await signInWithEmailAndPassword(auth, ADMIN_EMAIL, document.getElementById('adminPassword').value);
		feedback('loginFeedback', '');
		loginForm.reset();
	} catch (error) {
		showLoginError('Senha incorreta.');
		console.error(error);
	}
});

logoutButton.addEventListener('click', () => signOut(auth));

document.getElementById('settingsForm').addEventListener('submit', async (event) => {
	event.preventDefault();
	try {
		await saveSettings({ humidityAlertLimit: Number(document.getElementById('humidityLimit').value), temperatureLimit: Number(document.getElementById('temperatureLimit').value), monitorPoint: document.getElementById('monitorPoint').value.trim() || 'Pátio central' });
		feedback('settingsFeedback', 'Configurações salvas no portal.');
	} catch (error) { feedback('settingsFeedback', 'Não foi possível salvar as configurações.'); console.error(error); }
});

const menuDay = document.getElementById('menuDay');
loadMenuDay(menuDay.value);
menuDay.addEventListener('change', () => loadMenuDay(menuDay.value));

document.getElementById('menuForm').addEventListener('submit', async (event) => {
	event.preventDefault();
	try {
		await saveMenu({ [menuDay.value]: { main: document.getElementById('menuMain').value.trim(), side: document.getElementById('menuSide').value.trim(), time: document.getElementById('menuTime').value.trim() } });
		feedback('menuFeedback', 'Cardápio publicado no portal.');
	} catch (error) { feedback('menuFeedback', 'Não foi possível publicar o cardápio.'); console.error(error); }
});

document.getElementById('classForm').addEventListener('submit', async (event) => {
	event.preventDefault();
	try {
		await addClass({
			name: document.getElementById('className').value.trim(),
			teacher: document.getElementById('classTeacher').value.trim(),
			contact: document.getElementById('classContact').value.trim(),
			students: Number(document.getElementById('classStudents').value),
			materials: document.getElementById('classMaterials').value.trim(),
			tasks: document.getElementById('classTasks').value.trim(),
			observations: document.getElementById('classObservations').value.trim(),
			year: document.getElementById('classYear').value,
		});
		event.target.reset();
		feedback('classFeedback', 'Turma cadastrada no portal.');
	} catch (error) { feedback('classFeedback', 'Não foi possível cadastrar a turma.'); console.error(error); }
});

document.getElementById('eventForm').addEventListener('submit', async (event) => {
	event.preventDefault();
	try {
		await addEvent({ title: document.getElementById('eventTitle').value.trim(), date: document.getElementById('eventDate').value.trim(), details: document.getElementById('eventDetails').value.trim(), createdAt: Date.now() });
		event.target.reset();
		feedback('eventFeedback', 'Aviso publicado no portal.');
	} catch (error) { feedback('eventFeedback', 'Não foi possível publicar o aviso.'); console.error(error); }
});

onAuthStateChanged(auth, (user) => {
	setAdminAccess(Boolean(user));
	if (unsubscribePortalData) unsubscribePortalData();
	if (user) unsubscribePortalData = subscribePortalData({ onMenu: renderMenu, onSettings: renderSettings, onEvents: renderAdminEvents });
});
