const themeToggle = document.getElementById('themeToggle');
const savedTheme = localStorage.getItem('theme') || 'dark';
const adminPassword = 'Nonato2026';
const adminLogin = document.getElementById('adminLogin');
const adminContent = document.getElementById('adminContent');
const loginForm = document.getElementById('loginForm');
const logoutButton = document.getElementById('logoutButton');

function setAdminAccess(isAuthenticated){
	adminLogin.hidden = isAuthenticated;
	adminContent.hidden = !isAuthenticated;
	logoutButton.hidden = !isAuthenticated;
}

setAdminAccess(sessionStorage.getItem('adminAuthenticated') === 'true');

loginForm.addEventListener('submit', (event) => {
	event.preventDefault();
	const passwordInput = document.getElementById('adminPassword');
	if (passwordInput.value === adminPassword){
		sessionStorage.setItem('adminAuthenticated', 'true');
		document.getElementById('loginFeedback').textContent = '';
		passwordInput.value = '';
		setAdminAccess(true);
		return;
	}
	document.getElementById('loginFeedback').textContent = 'Senha incorreta.';
	adminLogin.classList.remove('login-error');
	passwordInput.classList.remove('login-error-input');
	void adminLogin.offsetWidth;
	adminLogin.classList.add('login-error');
	passwordInput.classList.add('login-error-input');
	setTimeout(() => {
		adminLogin.classList.remove('login-error');
		passwordInput.classList.remove('login-error-input');
	}, 1500);
	passwordInput.select();
});

logoutButton.addEventListener('click', () => {
	sessionStorage.removeItem('adminAuthenticated');
	setAdminAccess(false);
	document.getElementById('adminPassword').focus();
});

function applyTheme(theme){
	const isLight = theme === 'light';
	document.documentElement.toggleAttribute('data-theme', isLight);
	themeToggle.textContent = isLight ? '☀️' : '🌙';
	themeToggle.setAttribute('aria-pressed', String(isLight));
	localStorage.setItem('theme', isLight ? 'light' : 'dark');
}

applyTheme(savedTheme);
themeToggle.addEventListener('click', () => {
	applyTheme((localStorage.getItem('theme') || 'dark') === 'dark' ? 'light' : 'dark');
});

const humidityLimit = Number(localStorage.getItem('humidityAlertLimit')) || 30;
const monitorPoint = localStorage.getItem('monitorPoint') || 'Pátio central';
document.getElementById('humidityLimit').value = humidityLimit;
document.getElementById('monitorPoint').value = monitorPoint;
document.getElementById('pointLabel').textContent = monitorPoint;

function feedback(id, message){
	document.getElementById(id).textContent = message;
}

function renderAdminEvents(){
	const list = document.getElementById('adminEventList');
	const events = JSON.parse(localStorage.getItem('events') || '[]');
	list.replaceChildren();
	if (!events.length){
		list.textContent = 'Nenhum aviso publicado.';
		return;
	}
	events.forEach((event, index) => {
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
		removeButton.addEventListener('click', () => {
			const currentEvents = JSON.parse(localStorage.getItem('events') || '[]');
			currentEvents.splice(index, 1);
			localStorage.setItem('events', JSON.stringify(currentEvents));
			renderAdminEvents();
		});
		item.append(content, removeButton);
		list.append(item);
	});
}

document.getElementById('settingsForm').addEventListener('submit', (event) => {
	event.preventDefault();
	localStorage.setItem('humidityAlertLimit', document.getElementById('humidityLimit').value);
	localStorage.setItem('monitorPoint', document.getElementById('monitorPoint').value.trim() || 'Pátio central');
	document.getElementById('pointLabel').textContent = localStorage.getItem('monitorPoint');
	feedback('settingsFeedback', 'Configurações salvas.');
});

const menuDay = document.getElementById('menuDay');
const savedWeeklyMenu = JSON.parse(localStorage.getItem('weeklyMenu') || 'null') || {};
const legacyMenu = JSON.parse(localStorage.getItem('menu') || 'null');
if (!savedWeeklyMenu[1] && legacyMenu) savedWeeklyMenu[1] = legacyMenu;

function loadMenuDay(day){
	const menu = savedWeeklyMenu[day] || { main: '', side: '', time: '11:30–13:00' };
	document.getElementById('menuMain').value = menu.main || '';
	document.getElementById('menuSide').value = menu.side || '';
	document.getElementById('menuTime').value = menu.time || '';
}

loadMenuDay(menuDay.value);
menuDay.addEventListener('change', () => loadMenuDay(menuDay.value));

document.getElementById('menuForm').addEventListener('submit', (event) => {
	event.preventDefault();
	savedWeeklyMenu[menuDay.value] = {
		main: document.getElementById('menuMain').value.trim(),
		side: document.getElementById('menuSide').value.trim(),
		time: document.getElementById('menuTime').value.trim(),
	};
	localStorage.setItem('weeklyMenu', JSON.stringify(savedWeeklyMenu));
	localStorage.setItem('menu', JSON.stringify(savedWeeklyMenu[menuDay.value]));
	feedback('menuFeedback', 'Cardápio do dia publicado no portal.');
});

document.getElementById('classForm').addEventListener('submit', (event) => {
	event.preventDefault();
	const classes = JSON.parse(localStorage.getItem('classes') || '[]');
	classes.push({
		name: document.getElementById('className').value.trim(),
		teacher: document.getElementById('classTeacher').value.trim(),
		students: document.getElementById('classStudents').value,
	});
	localStorage.setItem('classes', JSON.stringify(classes));
	event.target.reset();
	feedback('classFeedback', 'Turma cadastrada no portal.');
});

document.getElementById('eventForm').addEventListener('submit', (event) => {
	event.preventDefault();
	const events = JSON.parse(localStorage.getItem('events') || '[]');
	events.unshift({
		title: document.getElementById('eventTitle').value.trim(),
		date: document.getElementById('eventDate').value.trim(),
		details: document.getElementById('eventDetails').value.trim(),
	});
	localStorage.setItem('events', JSON.stringify(events));
	event.target.reset();
	feedback('eventFeedback', 'Aviso publicado no portal.');
	renderAdminEvents();
});

renderAdminEvents();

['whatsappPermission', 'coordPermission'].forEach((id) => {
	const control = document.getElementById(id);
	const saved = localStorage.getItem(id);
	if (saved !== null) control.checked = saved === 'true';
	control.addEventListener('change', () => localStorage.setItem(id, String(control.checked)));
});