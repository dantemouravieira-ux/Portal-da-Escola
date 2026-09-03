const schedules = {
	ds1a: {
		name: '1ª DS A · integral',
		area: 'Desenvolvimento de Sistemas',
		teacher: 'Silas',
		rows: [
			['06:50–07:50', 'Biologia', 'Língua Portuguesa / recomposição da aprendizagem', 'Leitura, interpretação e produção textual', 'Arquitetura de computadores e infraestrutura de TI II', 'História', 'Esporte educacional'],
			['07:50–08:50', 'Geografia', 'Matemática', 'Projeto de vida / empreendedorismo', 'Biologia', 'Arquitetura de computadores e infraestrutura de TI', 'Esporte educacional'],
			['09:10–10:10', 'Matemática / recomposição da aprendizagem', 'Geografia', 'Educação Física', 'Física', 'Língua Inglesa', 'Esporte educacional'],
			['10:10–11:10', 'Matemática', 'Matemática', 'Pensamento Computacional I', 'Física', 'Sociologia', 'Esporte educacional'],
			['11:10–12:10', 'Língua Inglesa', 'Mentorias TEC I', 'Inteligência Artificial', 'História', 'Língua Espanhola', 'Esporte educacional'],
			['12:50–13:50', 'Lógica e programação estruturada', 'Língua Portuguesa', 'Métodos Ágeis de Desenvolvimento', 'Modelagem de banco de dados', 'Leitura e produção textual / conhecimentos robótica', 'Esporte educacional'],
			['13:50–14:50', 'Lógica e programação estruturada', 'Química', 'Química', 'Modelagem de banco de dados', 'Língua Portuguesa', ''],
			['15:10–16:10', 'Filosofia', 'Métodos Ágeis de Desenvolvimento', 'Educação Financeira', 'Arte', 'Esporte / cultura / clube de leitura', ''],
		]
	},
	ds1b: {
		name: '1ª DS B · integral',
		area: 'Desenvolvimento de Sistemas',
		teacher: 'Silvana',
		rows: [
			['06:50–07:50', 'Língua Inglesa', 'Mentorias TEC I', 'Matemática / recomposição da aprendizagem', 'Matemática', 'Matemática', ''],
			['07:50–08:50', 'Biologia', 'Língua Portuguesa / recomposição da aprendizagem', 'Leitura, interpretação e produção textual', 'Matemática', 'Biologia', ''],
			['09:10–10:10', 'Geografia', 'Projeto de vida / empreendedorismo', 'Inteligência Artificial', 'Língua Portuguesa', 'Língua Espanhola', ''],
			['10:10–11:10', 'Arquitetura de computadores e infraestrutura de TI', 'Educação Física', 'História', 'Métodos Ágeis de Desenvolvimento', 'Língua Inglesa', ''],
			['11:10–12:10', 'Arquitetura de computadores e infraestrutura de TI', 'Geografia', 'História', 'Métodos Ágeis de Desenvolvimento', 'Sociologia', ''],
			['12:50–13:50', 'Lógica e programação estruturada', 'Química', 'Física', 'Arte', 'Filosofia', ''],
			['13:50–14:50', 'Lógica e programação estruturada', 'Pensamento Computacional I', 'Língua Portuguesa', 'Modelagem de banco de dados', 'Educação Financeira', ''],
			['15:10–16:10', 'Esporte / cultura / clube de leitura', 'Química', 'Física', 'Modelagem de banco de dados', 'Esporte / cultura / clube de leitura', ''],
		]
	},
	marketing2: {
		name: '2ª Marketing · integral',
		area: 'Marketing',
		teacher: 'Valdeir',
		rows: [
			['06:50–07:50', 'Percursos de aprofundamento e integração de estudos · Matemática / recomposição', 'Geografia', 'Biologia', 'Percursos de aprofundamento e integração de estudos · Língua Portuguesa / recomposição', 'Física', ''],
			['07:50–08:50', 'Matemática', 'Educação Física', 'Arte', 'Leitura e produção textual', 'Física', ''],
			['09:10–10:10', 'Biologia', 'Percursos de aprofundamento · Educação financeira', 'Língua Portuguesa', 'Sociologia', 'Matemática', ''],
			['10:10–11:10', 'História', 'SEO · otimização para mecanismo de busca', 'Inteligência Artificial', 'SEO · otimização para mecanismo de busca', 'Matemática', ''],
			['11:10–12:10', 'Percursos de aprofundamento · Estudos de Língua Espanhola', 'SEO · otimização para mecanismo de busca', 'SEO · otimização para mecanismo de busca', 'SEO · otimização para mecanismo de busca', 'Percursos de aprofundamento · História / monitoria', ''],
			['12:50–13:50', 'SEO · otimização para mecanismo de busca', 'Percursos de aprofundamento · Esporte / cultura / clube', 'Química', 'Percursos de aprofundamento · Projeto de', 'Língua Portuguesa', ''],
			['13:50–14:50', 'SEO · otimização para mecanismo de busca', 'BE de leitura ou robótica', 'Química', 'Língua Estrangeira · Inglês', 'Filosofia', ''],
			['15:10–16:10', 'SEO · otimização para mecanismo de busca', 'SEO · otimização para mecanismo de busca', 'SEO · otimização para mecanismo de busca', 'Percursos de aprofundamento · Língua Inglesa', 'Língua Portuguesa', ''],
		]
	},
	'3manha': {
		name: '3ª série · manhã',
		area: 'Ensino Médio',
		rows: [
			['06:50–07:50', 'Química', 'Língua Portuguesa / recomposição', 'Projeto de vida / empreendedorismo', 'Horário de estudo', 'Horário de estudo', 'Biologia'],
			['07:50–08:50', 'Química', 'Língua Portuguesa', 'Inteligência Artificial', 'Horário de estudo', 'Horário de estudo', 'Química'],
			['09:10–10:10', 'Horário de estudo', 'Educação Física', 'Língua Portuguesa', 'Leitura e produção textual', 'História', 'Física'],
			['10:10–11:10', 'Língua Inglesa', 'Geografia', 'Língua Portuguesa', 'Biologia', 'Matemática / recomposição', 'História'],
			['11:10–12:10', 'Matemática', 'Matemática', 'Língua Espanhola', 'Física', 'Língua Inglesa', 'Geografia'],
			['12:10–13:10', 'Matemática', 'Matemática', 'Arte', 'Filosofia', 'Sociologia', ''],
		]
	},
	'3tarde': {
		name: '3ª série · tarde',
		area: 'Ensino Médio',
		rows: [
			['12:50–13:50', 'Matemática / recomposição', 'Inteligência Artificial', 'Matemática', 'Língua Inglesa', 'Matemática', 'Biologia'],
			['13:50–14:50', 'Língua Inglesa', 'Língua Portuguesa / recomposição', 'Matemática', 'Física', 'Matemática', 'Química'],
			['15:10–16:10', 'Horário de estudo', 'Leitura e produção textual', 'Biologia', 'Geografia', 'História', 'Física'],
			['16:10–17:10', 'Química', 'Filosofia', 'Língua Portuguesa', 'Projeto de vida / empreendedorismo', 'Língua Portuguesa', 'História'],
			['17:10–18:10', 'Química', 'Sociologia', 'Língua Portuguesa', 'Arte', 'Horário de estudo', 'Geografia'],
			['18:10–19:10', 'Língua Espanhola', 'Horário de estudo', 'Horário de estudo', 'Educação Física', 'Horário de estudo', ''],
		]
	},
	'9manha': {
		name: '9º ano · manhã',
		area: 'Ensino Fundamental',
		rows: [
			['06:50–07:50', 'Geografia', 'Geografia', 'Língua Portuguesa / recomposição', 'Língua Portuguesa / recomposição', 'Química', ''],
			['07:50–08:50', 'Língua Inglesa', 'Arte', 'Leitura, interpretação e produção textual', 'Língua Portuguesa', 'História', ''],
			['09:10–10:10', 'Língua Inglesa', 'Língua Portuguesa', 'Matemática / recomposição', 'Biologia', 'Física', ''],
			['10:10–11:10', 'Matemática', 'Língua Portuguesa', 'Matemática / recomposição', 'História', 'Inteligência Artificial', ''],
			['11:10–12:10', 'Matemática', 'Ensino Religioso', 'Educação Física', 'Educação Física', 'Matemática', ''],
			['12:10–13:10', '', '', '', '', 'Matemática', ''],
		]
	},
	'9tardea': {
		name: '9º ano A · tarde',
		area: 'Ensino Fundamental',
		rows: [
			['12:50–13:50', 'Inteligência Artificial', 'Língua Portuguesa / recomposição', 'Matemática / recomposição', 'Matemática', 'Química', ''],
			['13:50–14:50', 'Biologia', 'Leitura, interpretação e produção textual', 'Matemática / recomposição', 'Matemática', 'Física', ''],
			['15:10–16:10', 'Língua Inglesa', 'Geografia', 'Arte', 'Língua Portuguesa', 'Língua Inglesa', ''],
			['16:10–17:10', 'História', 'Geografia', 'Língua Portuguesa', 'Ensino Religioso', 'Matemática', ''],
			['17:10–18:10', 'História', 'Educação Física', 'Língua Portuguesa', 'Língua Portuguesa', 'Matemática', ''],
			['18:10–19:10', '', 'Educação Física', '', '', '', ''],
		]
	},
	'9tardeb': {
		name: '9º ano B · tarde',
		area: 'Ensino Fundamental',
		rows: [
			['12:50–13:50', 'Biologia', 'História', 'Geografia', 'Língua Portuguesa / recomposição', 'Matemática / recomposição', ''],
			['13:50–14:50', 'Inteligência Artificial', 'História', 'Geografia', 'Ensino Religioso', 'Educação Física', ''],
			['15:10–16:10', 'Educação Física', 'Língua Portuguesa', 'Leitura, interpretação e produção textual', 'Matemática', 'Matemática / recomposição', ''],
			['16:10–17:10', 'Língua Inglesa', 'Língua Portuguesa', 'Matemática', 'Língua Portuguesa', 'Química', ''],
			['17:10–18:10', 'Língua Inglesa', 'Arte', 'Matemática', 'Matemática', 'Física', ''],
			['18:10–19:10', '', '', 'Língua Portuguesa', '', '', ''],
		]
	},
	ds2: {
		name: '2ª DS · integral',
		area: 'Desenvolvimento de Sistemas',
		teacher: 'Vandson',
		rows: [
			['06:50–07:50', 'Percursos de aprofundamento · Matemática / recomposição', 'Educação Física', 'Inteligência Artificial', 'Biologia', 'Língua Inglesa', ''],
			['07:50–08:50', 'Matemática', 'Geografia', 'Biologia', 'Programação estruturada', 'Língua Inglesa', ''],
			['09:10–10:10', 'Programação estruturada', 'Percursos de aprofundamento · Língua Portuguesa', 'Programação estruturada', 'Programação estruturada', 'Matemática', ''],
			['10:10–11:10', 'Programação estruturada', 'Percursos de aprofundamento · Língua Portuguesa', 'Programação estruturada', 'Língua Portuguesa', 'Percursos de aprofundamento · Língua Espanhola', ''],
			['11:10–12:10', 'História', 'Programação estruturada', 'Arte', 'Língua Portuguesa', 'Matemática', ''],
			['12:50–13:50', 'Filosofia', 'Percursos de aprofundamento · Esporte / cultura', 'Percursos de aprofundamento · Esporte / cultura', 'Percursos de aprofundamento · Educação financeira', 'Física', ''],
			['13:50–14:50', 'Sociologia', 'Pensamento Computacional II', 'Percursos de aprofundamento · Esporte / cultura', 'Percursos de aprofundamento · Vida / empreendedorismo', 'Física', ''],
			['15:10–16:10', 'Química', 'Percursos de aprofundamento · Monitoria', 'Língua Portuguesa', 'Mentorias TEC II', 'Química', ''],
		]
	}
};

const defaultSchedule = schedules.ds2;
const selectedKey = new URLSearchParams(location.search).get('turma');
const schedule = schedules[selectedKey] || defaultSchedule;
const body = document.getElementById('scheduleBody');
document.title = `Horário · ${schedule.name}`;
document.getElementById('scheduleClassType').textContent = schedule.name;
document.getElementById('scheduleSchool').textContent = schedule.area;
document.getElementById('scheduleTitle').textContent = 'Grade semanal';
document.getElementById('scheduleTeacher').textContent = schedule.teacher ? `Professor responsável: ${schedule.teacher}` : '';
document.getElementById('scheduleCaption').textContent = `Grade semanal da turma ${schedule.name}`;

schedule.rows.forEach((row) => {
	const tr = document.createElement('tr');
	const time = document.createElement('th');
	time.scope = 'row';
	time.textContent = row[0];
	tr.append(time);
	row.slice(1).forEach((subject) => {
		const td = document.createElement('td');
		td.textContent = subject;
		tr.append(td);
	});
	body.append(tr);
});
