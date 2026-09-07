import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js';
import {
	addDoc,
	collection,
	deleteDoc,
	doc,
	getFirestore,
	onSnapshot,
	orderBy,
	query,
	setDoc,
} from 'https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js';

const firebaseConfig = {
	apiKey: 'AIzaSyDOv1n1TTC4OLb0zChkgwLMmDOaualD0i4',
	authDomain: 'climate-guard-a1b6e.firebaseapp.com',
	projectId: 'climate-guard-a1b6e',
	storageBucket: 'climate-guard-a1b6e.firebasestorage.app',
	messagingSenderId: '496904319832',
	appId: '1:496904319832:web:be2be5a93535c20b012b2d',
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

export function subscribePortalData({ onMenu, onClasses, onEvents, onSettings } = {}) {
	const unsubscribers = [];
	if (onMenu) unsubscribers.push(onSnapshot(doc(db, 'cardapio', 'semanal'), (snapshot) => onMenu(snapshot.exists() ? snapshot.data() : {})));
	if (onClasses) unsubscribers.push(onSnapshot(collection(db, 'turmas'), (snapshot) => onClasses(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })))))
	if (onEvents) {
		const eventsQuery = query(collection(db, 'avisos'), orderBy('createdAt', 'desc'));
		unsubscribers.push(onSnapshot(eventsQuery, (snapshot) => onEvents(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })))));
	}
	if (onSettings) unsubscribers.push(onSnapshot(doc(db, 'configuracoes', 'portal'), (snapshot) => onSettings(snapshot.exists() ? snapshot.data() : {})));
	return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
}

export function saveMenu(menu) {
	return setDoc(doc(db, 'cardapio', 'semanal'), menu, { merge: true });
}

export function saveSettings(settings) {
	return setDoc(doc(db, 'configuracoes', 'portal'), settings, { merge: true });
}

export function addClass(classData) {
	return addDoc(collection(db, 'turmas'), classData);
}

export function addEvent(eventData) {
	return addDoc(collection(db, 'avisos'), eventData);
}

export function removeEvent(eventId) {
	return deleteDoc(doc(db, 'avisos', eventId));
}

