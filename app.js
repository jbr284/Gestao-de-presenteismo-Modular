import { auth, db } from './firebase-config.js';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
// ATENÇÃO: Adicionei 'where' nas importações abaixo
import { collection, addDoc, query, orderBy, onSnapshot, deleteDoc, doc, where } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- ELEMENTOS ---
const loginScreen = document.getElementById('login-screen');
const appScreen = document.getElementById('app-screen');
const formLogin = document.getElementById('form-login');
const msgErro = document.getElementById('mensagem-erro');
const btnLogout = document.getElementById('btn-logout');

// --- 1. LOGIN & AUTENTICAÇÃO ---
if (formLogin) {
    formLogin.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const senha = document.getElementById('senha').value;
        const btnEntrar = document.getElementById('btn-entrar');
        
        btnEntrar.textContent = "Entrando...";
        btnEntrar.disabled = true;

        try {
            await signInWithEmailAndPassword(auth, email, senha);
        } catch (error) {
            console.error("Erro Login:", error);
            msgErro.textContent = "Erro: Usuário ou senha inválidos.";
            msgErro.classList.remove('hidden');
            btnEntrar.textContent = "Entrar";
            btnEntrar.disabled = false;
        }
    });
}

onAuthStateChanged(auth, (user) => {
    if (user) {
        console.log("Logado:", user.email);
        loginScreen.classList.add('hidden');
        appScreen.classList.remove('hidden');
        
        document.getElementById('user-display-email').textContent = user.email.split('@')[0];
        document.getElementById('data-chamada').valueAsDate = new Date();
        
        // Inicia carregando a lista do RH e a Chamada da Linha 1 por padrão
        carregarColaboradoresRH();
        carregarListaChamada('linha_1'); 
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

if (btnLogout) {
    btnLogout.addEventListener('click', () => {
        signOut(auth);
    });
}

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

// --- 3. LÓGICA DA CHAMADA (NOVO!) ---
const lineBtns = document.querySelectorAll('.line-btn');
const listaChamadaContainer = document.querySelector('.lista-chamada');

// Troca de Linha (Botões)
lineBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        // Visual
        lineBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        // Lógica: Identifica qual linha foi clicada
        let linhaSelecionada = 'linha_1';
        if(btn.textContent.includes('Linha 2')) linhaSelecionada = 'linha_2';
        if(btn.textContent.includes('Acabamento')) linhaSelecionada = 'acabamento';
        
        // Carrega os dados
        carregarListaChamada(linhaSelecionada);
    });
});

// Função que busca no banco e desenha a lista
function carregarListaChamada(linhaAlvo) {
    listaChamadaContainer.innerHTML = '<p style="text-align:center; margin-top:20px;">Carregando equipe...</p>';

    // Consulta: Pega colaboradores da linha X que estão ATIVOS
    const q = query(
        collection(db, "colaboradores"), 
        where("linha", "==", linhaAlvo),
        where("ativo", "==", true),
        orderBy("nome")
    );

    onSnapshot(q, (snapshot) => {
        listaChamadaContainer.innerHTML = "";

        if (snapshot.empty) {
            listaChamadaContainer.innerHTML = '<p style="text-align:center; color:#666; margin-top:20px;">Nenhum colaborador nesta linha.</p>';
            return;
        }

        snapshot.forEach((doc) => {
            const colab = doc.data();
            const id = doc.id;

            // Cria o Card do Funcionário
            const card = document.createElement('div');
            card.className = 'chamada-card'; // Status padrão neutro
            card.id = `card-${id}`;

            card.innerHTML = `
                <div class="colab-info">
                    <strong>${colab.nome}</strong>
                    <small>${colab.funcao} | Mat: ${colab.matricula}</small>
                </div>
                
                <div class="chamada-actions">
                    <button class="btn-check btn-p" onclick="marcarPresenca('${id}', 'presente')">
                        <span class="material-icons" style="font-size:16px;">check_circle</span> Presente
                    </button>
                    <button class="btn-check btn-f" onclick="marcarPresenca('${id}', 'falta')">
                        <span class="material-icons" style="font-size:16px;">cancel</span> Falta
                    </button>
                </div>

                <div class="motivo-box hidden" id="motivo-box-${id}">
                    <select class="motivo-select" id="motivo-${id}">
                        <option value="">Selecione o Motivo...</option>
                        <option value="Injustificada">Falta Injustificada</option>
                        <option value="Atestado">Atestado Médico</option>
                        <option value="Justificada">Justificada (Gestor)</option>
                        <option value="Suspensao">Suspensão</option>
                    </select>
                </div>
            `;
            listaChamadaContainer.appendChild(card);
        });
    });
}

// Função Global para lidar com os cliques (Presente/Falta)
window.marcarPresenca = function(id, status) {
    const card = document.getElementById(`card-${id}`);
    const btnP = card.querySelector('.btn-p');
    const btnF = card.querySelector('.btn-f');
    const motivoBox = document.getElementById(`motivo-box-${id}`);

    // Limpa estados anteriores
    card.classList.remove('presente', 'falta');
    btnP.classList.remove('selected');
    btnF.classList.remove('selected');
    motivoBox.classList.add('hidden');

    if (status === 'presente') {
        card.classList.add('presente');
        btnP.classList.add('selected');
        // Check verde
    } else {
        card.classList.add('falta');
        btnF.classList.add('selected');
        motivoBox.classList.remove('hidden'); // Abre o select
    }
    
    // AQUI ENTRARÁ O CÓDIGO DE SALVAR NO BANCO FUTURAMENTE
    console.log(`Colaborador ${id} está ${status}`);
};


// --- 4. GESTÃO RH ---
const formRH = document.getElementById('form-rh');
const listaRHBody = document.getElementById('lista-rh-body');

if (formRH) {
    formRH.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const nome = document.getElementById('rh-nome').value;
        const matricula = document.getElementById('rh-matricula').value;
        const funcao = document.getElementById('rh-funcao').value;
        const linha = document.getElementById('rh-linha').value;

        if(!linha) { alert("Selecione uma linha!"); return; }

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
            alert("Colaborador cadastrado!");
            formRH.reset();
        } catch (error) {
            console.error(error);
            alert("Erro ao salvar.");
        } finally {
            btnSalvar.textContent = textoOriginal;
            btnSalvar.disabled = false;
        }
    });
}

function carregarColaboradoresRH() {
    const q = query(collection(db, "colaboradores"), orderBy("nome"));
    onSnapshot(q, (snapshot) => {
        listaRHBody.innerHTML = "";
        if (snapshot.empty) {
            listaRHBody.innerHTML = `<tr><td colspan="4" style="text-align:center;">Vazio.</td></tr>`;
            return;
        }
        snapshot.forEach((doc) => {
            const colab = doc.data();
            let nomeLinha = colab.linha === 'linha_1' ? "Linha 1" : (colab.linha === 'linha_2' ? "Linha 2" : "Acabamento");
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${colab.matricula}</td>
                <td><strong>${colab.nome}</strong><br><small>${colab.funcao}</small></td>
                <td><span class="badge" style="background:#e3f2fd; color:#0d47a1;">${nomeLinha}</span></td>
                <td style="text-align: right;"><button class="btn-excluir" data-id="${doc.id}">Excluir</button></td>
            `;
            listaRHBody.appendChild(tr);
        });

        document.querySelectorAll('.btn-excluir').forEach(btn => {
            btn.addEventListener('click', deletarColaborador);
        });
    });
}

async function deletarColaborador(e) {
    if(confirm("Excluir colaborador?")) {
        const id = e.target.getAttribute('data-id');
        await deleteDoc(doc(db, "colaboradores", id));
    }
}
