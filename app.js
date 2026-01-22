import { auth, db } from './firebase-config.js';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { collection, addDoc, query, orderBy, onSnapshot, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- ELEMENTOS ---
const loginScreen = document.getElementById('login-screen');
const appScreen = document.getElementById('app-screen');
const formLogin = document.getElementById('form-login');
const msgErro = document.getElementById('mensagem-erro');
const btnLogout = document.getElementById('btn-logout');

// --- 1. LOGIN & AUTENTICAÇÃO ---
formLogin.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const senha = document.getElementById('senha').value;

    // Feedback visual
    const btnEntrar = document.getElementById('btn-entrar');
    btnEntrar.textContent = "Entrando...";
    btnEntrar.disabled = true;

    try {
        await signInWithEmailAndPassword(auth, email, senha);
        // O onAuthStateChanged vai cuidar do resto
    } catch (error) {
        msgErro.textContent = "Erro: Usuário ou senha inválidos.";
        msgErro.classList.remove('hidden');
        btnEntrar.textContent = "Entrar";
        btnEntrar.disabled = false;
    }
});

onAuthStateChanged(auth, (user) => {
    if (user) {
        console.log("Logado:", user.email);
        loginScreen.classList.add('hidden');
        appScreen.classList.remove('hidden');
        
        document.getElementById('user-display-email').textContent = user.email.split('@')[0];
        document.getElementById('data-chamada').valueAsDate = new Date();
        
        // Inicia o monitoramento dos dados do RH
        carregarColaboradoresRH();
    } else {
        loginScreen.classList.remove('hidden');
        appScreen.classList.add('hidden');
        const btnEntrar = document.getElementById('btn-entrar');
        if(btnEntrar) {
            btnEntrar.textContent = "Entrar";
            btnEntrar.disabled = false;
        }
    }
});

btnLogout.addEventListener('click', () => {
    signOut(auth);
});

// --- 2. NAVEGAÇÃO ENTRE ABAS ---
const navBtns = document.querySelectorAll('.nav-btn');
const tabContents = document.querySelectorAll('.tab-content');

navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        navBtns.forEach(b => b.classList.remove('active'));
        tabContents.forEach(t => t.classList.add('hidden'));

        btn.classList.add('active');
        const tabId = btn.getAttribute('data-tab');
        document.getElementById(`tab-${tabId}`).classList.remove('hidden');
    });
});

// --- 3. NAVEGAÇÃO DE LINHAS (VISUAL POR ENQUANTO) ---
const lineBtns = document.querySelectorAll('.line-btn');
lineBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        lineBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    });
});

// --- 4. GESTÃO RH (CADASTRO E LISTAGEM) ---
const formRH = document.getElementById('form-rh');
const listaRHBody = document.getElementById('lista-rh-body');

// Salvar Novo Colaborador
formRH.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const nome = document.getElementById('rh-nome').value;
    const matricula = document.getElementById('rh-matricula').value;
    const funcao = document.getElementById('rh-funcao').value;
    const linha = document.getElementById('rh-linha').value;

    if(!linha) {
        alert("Selecione uma linha!");
        return;
    }

    const btnSalvar = formRH.querySelector('button');
    const textoOriginal = btnSalvar.textContent;
    btnSalvar.textContent = "Salvando...";
    btnSalvar.disabled = true;

    try {
        await addDoc(collection(db, "colaboradores"), {
            nome: nome.toUpperCase(),
            matricula: matricula,
            funcao: funcao,
            linha: linha,
            ativo: true,
            criadoEm: new Date()
        });
        
        alert("Colaborador cadastrado com sucesso!");
        formRH.reset();
    } catch (error) {
        console.error("Erro ao salvar:", error);
        alert("Erro ao conectar com o banco de dados. Tente novamente.");
    } finally {
        btnSalvar.textContent = textoOriginal;
        btnSalvar.disabled = false;
    }
});

// Listar Colaboradores em Tempo Real
function carregarColaboradoresRH() {
    // Consulta: Coleção 'colaboradores', ordenada por Nome
    const q = query(collection(db, "colaboradores"), orderBy("nome"));

    // Listener (Ouve as mudanças no banco)
    onSnapshot(q, (snapshot) => {
        listaRHBody.innerHTML = ""; // Limpa a tabela antes de redesenhar

        if (snapshot.empty) {
            listaRHBody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:20px; color:#666;">Nenhum colaborador cadastrado.</td></tr>`;
            return;
        }

        snapshot.forEach((doc) => {
            const colab = doc.data();
            const tr = document.createElement('tr');
            
            // Tratamento visual da linha
            let nomeLinha = "Desconhecida";
            if (colab.linha === 'linha_1') nomeLinha = "Linha 1";
            if (colab.linha === 'linha_2') nomeLinha = "Linha 2";
            if (colab.linha === 'acabamento') nomeLinha = "Acabamento";

            tr.innerHTML = `
                <td>${colab.matricula}</td>
                <td>
                    <strong>${colab.nome}</strong><br>
                    <small style="color:#666;">${colab.funcao}</small>
                </td>
                <td><span class="badge" style="background:#e3f2fd; color:#0d47a1;">${nomeLinha}</span></td>
                <td style="text-align: right;">
                    <button class="btn-excluir" data-id="${doc.id}">Excluir</button>
                </td>
            `;
            listaRHBody.appendChild(tr);
        });

        // Reativa os botões de excluir
        document.querySelectorAll('.btn-excluir').forEach(btn => {
            btn.addEventListener('click', deletarColaborador);
        });
    });
}

// Deletar Colaborador
async function deletarColaborador(e) {
    if(confirm("Tem certeza que deseja remover este colaborador do sistema?")) {
        const id = e.target.getAttribute('data-id');
        try {
            await deleteDoc(doc(db, "colaboradores", id));
        } catch (error) {
            console.error("Erro ao deletar:", error);
            alert("Erro ao excluir.");
        }
    }
}
