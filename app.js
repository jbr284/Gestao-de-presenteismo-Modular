import { auth, db } from './firebase-config.js';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { collection, addDoc, query, orderBy, onSnapshot, deleteDoc, doc, where, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- VARIÁVEIS GLOBAIS ---
let linhaAtual = 'linha_1'; 
let unsubscribeColaboradores = null; 
let unsubscribeChamadaDia = null;

// --- ELEMENTOS ---
const loginScreen = document.getElementById('login-screen');
const appScreen = document.getElementById('app-screen');
const formLogin = document.getElementById('form-login');
const msgErro = document.getElementById('mensagem-erro');
const btnLogout = document.getElementById('btn-logout');

// ==================================================================
// 🚨 FUNÇÕES PÚBLICAS (WINDOW) COM FEEDBACK IMEDIATO 🚨
// ==================================================================

window.marcarPresenca = async function(id, status, nome) {
    const dataIso = document.getElementById('data-chamada').value;
    if (!dataIso) { alert("Selecione uma data!"); return; }

    // --- 1. FEEDBACK VISUAL INSTANTÂNEO (Antes do Banco) ---
    const card = document.getElementById(`card-${id}`);
    const btnP = card.querySelector('.btn-p');
    const btnF = card.querySelector('.btn-f');
    const motivoBox = document.getElementById(`motivo-box-${id}`);

    // Limpa estilos anteriores
    card.classList.remove('presente', 'falta');
    btnP.classList.remove('selected');
    btnF.classList.remove('selected');

    if (status === 'presente') {
        // Lógica: Clicou Presente -> Fica Verde, Esconde Motivo
        card.classList.add('presente');
        btnP.classList.add('selected');
        motivoBox.classList.add('hidden'); 
    } else {
        // Lógica: Clicou Falta -> Fica Vermelho, MOSTRA Motivo
        card.classList.add('falta');
        btnF.classList.add('selected');
        motivoBox.classList.remove('hidden'); // <--- AQUI ESTÁ A LÓGICA QUE FALTAVA
    }

    // --- 2. SALVAR NO BANCO DE DADOS ---
    const updateData = {};
    const campo = `${linhaAtual}.${id}`;

    updateData[campo] = {
        status: status,
        nome: nome,
        atualizadoEm: new Date().toISOString()
    };

    if (status === 'presente') {
        updateData[campo].motivo = ""; // Limpa motivo
    } else {
        // Se já tiver um motivo selecionado visualmente, salva ele
        const motivoAtual = document.getElementById(`motivo-${id}`).value;
        if(motivoAtual) updateData[campo].motivo = motivoAtual;
    }

    try {
        await setDoc(doc(db, "chamadas", dataIso), updateData, { merge: true });
    } catch (error) {
        console.error("Erro ao salvar:", error);
        // Se der erro, desfaz o visual (opcional, mas boa prática)
        alert("Erro de conexão ao salvar.");
    }
};

window.salvarMotivo = async function(id, nome) {
    const dataIso = document.getElementById('data-chamada').value;
    const novoMotivo = document.getElementById(`motivo-${id}`).value;

    const updateData = {};
    const campo = `${linhaAtual}.${id}`;

    updateData[campo] = {
        status: 'falta',
        nome: nome,
        motivo: novoMotivo,
        atualizadoEm: new Date().toISOString()
    };

    try {
        await setDoc(doc(db, "chamadas", dataIso), updateData, { merge: true });
    } catch (error) {
        console.error("Erro ao salvar motivo:", error);
    }
};

// ==================================================================
// RESTANTE DO CÓDIGO (LOGIN, ABAS, LISTAGEM)
// ==================================================================

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
            msgErro.textContent = "Erro: Usuário ou senha inválidos.";
            msgErro.classList.remove('hidden');
            btnEntrar.textContent = "Entrar";
            btnEntrar.disabled = false;
        }
    });
}

onAuthStateChanged(auth, (user) => {
    if (user) {
        loginScreen.classList.add('hidden');
        appScreen.classList.remove('hidden');
        document.getElementById('user-display-email').textContent = user.email.split('@')[0];
        
        const dateInput = document.getElementById('data-chamada');
        if(!dateInput.value) dateInput.valueAsDate = new Date();
        
        carregarColaboradoresRH();
        carregarListaChamada(); 
        
        dateInput.addEventListener('change', () => carregarListaChamada());
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

if (btnLogout) btnLogout.addEventListener('click', () => signOut(auth));

// Abas e Linhas
const navBtns = document.querySelectorAll('.nav-btn');
const tabContents = document.querySelectorAll('.tab-content');
navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        navBtns.forEach(b => b.classList.remove('active'));
        tabContents.forEach(t => t.classList.add('hidden'));
        btn.classList.add('active');
        document.getElementById(`tab-${btn.getAttribute('data-tab')}`).classList.remove('hidden');
    });
});

const lineBtns = document.querySelectorAll('.line-btn');
lineBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        lineBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        if(btn.textContent.includes('Linha 1')) linhaAtual = 'linha_1';
        else if(btn.textContent.includes('Linha 2')) linhaAtual = 'linha_2';
        else if(btn.textContent.includes('Acabamento')) linhaAtual = 'acabamento';
        carregarListaChamada();
    });
});

// Listagem de Chamada
const listaChamadaContainer = document.querySelector('.lista-chamada');
function carregarListaChamada() {
    listaChamadaContainer.innerHTML = '<p style="text-align:center; margin-top:20px;">Carregando equipe...</p>';
    if (unsubscribeColaboradores) unsubscribeColaboradores();

    const q = query(
        collection(db, "colaboradores"), 
        where("linha", "==", linhaAtual),
        where("ativo", "==", true),
        orderBy("nome")
    );

    unsubscribeColaboradores = onSnapshot(q, (snapshot) => {
        listaChamadaContainer.innerHTML = "";
        if (snapshot.empty) {
            listaChamadaContainer.innerHTML = '<p style="text-align:center; color:#666; margin-top:20px;">Nenhum colaborador nesta linha.</p>';
            return;
        }

        let html = "";
        snapshot.forEach((docSnap) => {
            const colab = docSnap.data();
            const id = docSnap.id;

            html += `
                <div class="chamada-card" id="card-${id}">
                    <div class="colab-info">
                        <strong>${colab.nome}</strong>
                        <small>${colab.funcao}</small>
                    </div>
                    
                    <div class="chamada-actions">
                        <button class="btn-check btn-p" onclick="window.marcarPresenca('${id}', 'presente', '${colab.nome}')">
                            <span class="material-icons" style="font-size:16px;">check_circle</span>
                        </button>
                        <button class="btn-check btn-f" onclick="window.marcarPresenca('${id}', 'falta', '${colab.nome}')">
                            <span class="material-icons" style="font-size:16px;">cancel</span> Falta
                        </button>
                    </div>

                    <div class="motivo-box hidden" id="motivo-box-${id}">
                        <label style="display:block; font-size:0.8rem; color:#d32f2f; margin-bottom:3px;">Motivo da Falta:</label>
                        <select class="motivo-select" id="motivo-${id}" onchange="window.salvarMotivo('${id}', '${colab.nome}')">
                            <option value="">Selecione...</option>
                            <option value="Injustificada">Falta Injustificada</option>
                            <option value="Atestado">Atestado Médico</option>
                            <option value="Justificada">Justificada (Gestor)</option>
                            <option value="Suspensao">Suspensão</option>
                            <option value="Folga">Folga / Compensação</option>
                        </select>
                    </div>
                </div>
            `;
        });
        listaChamadaContainer.innerHTML = html;
        sincronizarStatusChamada();
    });
}

// Sincronizar (Ler Banco)
function sincronizarStatusChamada() {
    const dataIso = document.getElementById('data-chamada').value;
    if(!dataIso) return;
    if (unsubscribeChamadaDia) unsubscribeChamadaDia();

    unsubscribeChamadaDia = onSnapshot(doc(db, "chamadas", dataIso), (docSnap) => {
        if (docSnap.exists()) {
            const dadosDia = docSnap.data();
            const dadosLinha = dadosDia[linhaAtual] || {};

            document.querySelectorAll('.chamada-card').forEach(card => {
                const id = card.id.replace('card-', '');
                const info = dadosLinha[id];

                // NÃO resetamos tudo aqui para evitar piscar se o usuário acabou de clicar
                // Apenas aplicamos o estado do banco se ele existir
                if (info) {
                    const btnP = card.querySelector('.btn-p');
                    const btnF = card.querySelector('.btn-f');
                    const motivoBox = document.getElementById(`motivo-box-${id}`);
                    const selectMotivo = document.getElementById(`motivo-${id}`);

                    if (info.status === 'presente') {
                        card.classList.add('presente');
                        card.classList.remove('falta');
                        btnP.classList.add('selected');
                        btnF.classList.remove('selected');
                        motivoBox.classList.add('hidden');
                    } else if (info.status === 'falta') {
                        card.classList.add('falta');
                        card.classList.remove('presente');
                        btnF.classList.add('selected');
                        btnP.classList.remove('selected');
                        motivoBox.classList.remove('hidden');
                        if (info.motivo) selectMotivo.value = info.motivo;
                    }
                }
            });
        }
    });
}

// RH e Cadastros
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
        btnSalvar.textContent = "Salvando...";
        
        try {
            await addDoc(collection(db, "colaboradores"), {
                nome: nome.toUpperCase(),
                matricula: matricula,
                funcao: funcao,
                linha: linha,
                ativo: true,
                criadoEm: new Date()
            });
            alert("Cadastrado!");
            formRH.reset();
        } catch(e) { console.error(e); alert("Erro."); }
        finally { btnSalvar.textContent = "Salvar Colaborador"; }
    });
}

function carregarColaboradoresRH() {
    onSnapshot(query(collection(db, "colaboradores"), orderBy("nome")), (snapshot) => {
        listaRHBody.innerHTML = "";
        snapshot.forEach((doc) => {
            const colab = doc.data();
            let nomeLinha = colab.linha === 'linha_1' ? "Linha 1" : (colab.linha === 'linha_2' ? "Linha 2" : "Acabamento");
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${colab.matricula}</td><td><strong>${colab.nome}</strong><br><small>${colab.funcao}</small></td><td><span class="badge">${nomeLinha}</span></td><td style="text-align:right"><button class="btn-excluir" onclick="window.deletarColaborador('${doc.id}')">Excluir</button></td>`;
            listaRHBody.appendChild(tr);
        });
    });
}

window.deletarColaborador = async function(id) {
    if(confirm("Excluir?")) await deleteDoc(doc(db, "colaboradores", id));
}
