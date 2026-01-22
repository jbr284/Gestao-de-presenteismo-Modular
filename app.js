import { auth } from './firebase-config.js';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// --- ELEMENTOS ---
const loginScreen = document.getElementById('login-screen');
const appScreen = document.getElementById('app-screen');
const formLogin = document.getElementById('form-login');
const msgErro = document.getElementById('mensagem-erro');
const btnLogout = document.getElementById('btn-logout');

// --- 1. LOGIN ---
formLogin.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const senha = document.getElementById('senha').value;

    try {
        await signInWithEmailAndPassword(auth, email, senha);
        // O onAuthStateChanged vai cuidar da transição de tela
    } catch (error) {
        msgErro.textContent = "Erro: Usuário ou senha inválidos.";
        msgErro.classList.remove('hidden');
    }
});

// --- 2. CONTROLE DE ESTADO (LOGIN/LOGOUT) ---
// Essa função roda sozinha sempre que o status do usuário muda
onAuthStateChanged(auth, (user) => {
    if (user) {
        // Usuário Logado: Mostra o App
        console.log("Usuário logado:", user.email);
        loginScreen.classList.add('hidden');
        appScreen.classList.remove('hidden');
        
        // Preenche dados no cabeçalho
        document.getElementById('user-display-email').textContent = user.email.split('@')[0];
        
        // Configura a data de hoje no input
        document.getElementById('data-chamada').valueAsDate = new Date();

    } else {
        // Usuário Saiu: Mostra Login
        console.log("Nenhum usuário logado");
        loginScreen.classList.remove('hidden');
        appScreen.classList.add('hidden');
    }
});

// --- 3. LOGOUT ---
btnLogout.addEventListener('click', () => {
    signOut(auth);
});

// --- 4. NAVEGAÇÃO ENTRE ABAS ---
const navBtns = document.querySelectorAll('.nav-btn');
const tabContents = document.querySelectorAll('.tab-content');

navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        // Remove active de todos
        navBtns.forEach(b => b.classList.remove('active'));
        tabContents.forEach(t => t.classList.add('hidden'));

        // Ativa o clicado
        btn.classList.add('active');
        const tabId = btn.getAttribute('data-tab');
        document.getElementById(`tab-${tabId}`).classList.remove('hidden');
    });
});

// --- 5. NAVEGAÇÃO ENTRE LINHAS ---
const lineBtns = document.querySelectorAll('.line-btn');
lineBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        lineBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        // Futuramente aqui carregaremos a lista da linha selecionada
        console.log("Trocou para linha:", btn.textContent);
    });
});
