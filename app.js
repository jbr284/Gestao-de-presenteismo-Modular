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

// --- 1. LOGIN ---
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

if (btnLogout) {
    btnLogout.addEventListener('click', () => signOut(auth));
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

// --- 3. LÓGICA DA CHAMADA (CORRIGIDA) ---
const lineBtns = document.querySelectorAll('.line-btn');
const listaChamadaContainer = document.querySelector('.lista-chamada');

// Troca de Linha
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

        snapshot.forEach((docSnap) => {
            const colab = docSnap.data();
            const id = docSnap.id;

            // Criação dos Elementos via DOM (Evita erros de onclick)
            const card = document.createElement('div');
            card.className = 'chamada-card';
            card.id = `card-${id}`;
            card.dataset.nome = colab.nome;

            // Conteúdo HTML Interno
            card.innerHTML = `
                <div class="colab-info">
                    <strong>${colab.nome}</strong>
                    <small>${colab.funcao} | Mat: ${colab.matricula}</small>
                </div>
                <div class="chamada-actions">
                    <button class="btn-check btn-p" id="btn-p-${id}">
                        <span class="material-icons" style="font-size:16px;">check_circle</span> Presente
                    </button>
                    <button class="btn-check btn-f" id="btn-f-${id}">
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
                        <option value="Folga">Folga / Compensação</option>
                    </select>
                </div>
            `;

            // ADICIONA OS LISTENERS DE CLIQUE AQUI (SEGURO)
            const btnP = card.querySelector(`#btn-p-${id}`);
            const btnF = card.querySelector(`#btn-f-${id}`);
            const selectMotivo = card.querySelector(`#motivo-${id}`);

            btnP.addEventListener('click', () => salvarPresenca(id, 'presente', colab.nome));
            btnF.addEventListener('click', () => salvarPresenca(id, 'falta', colab.nome));
            
            // Listener do Select de Motivo
            selectMotivo.addEventListener('change', () => {
                salvarMotivo(id, colab.nome, selectMotivo.value);
            });

            listaChamadaContainer.appendChild(card);
        });

        sincronizarStatusChamada();
    });
}

// --- FUNÇÃO DE SALVAR (AGORA INTERNA) ---
async function salvarPresenca(id, status, nome) {
    const dataIso = document.getElementById('data-chamada').value;
    if (!dataIso) { alert("Selecione uma data!"); return; }

    const updateData = {};
    const campo = `${linhaAtual}.${id}`;

    updateData[campo] = {
        status: status,
        nome: nome,
        atualizadoEm: new Date().toISOString()
    };

    // Se for presente, limpa o motivo
    if (status === 'presente') {
        updateData[campo].motivo = "";
    } else {
        // Se for falta, tenta manter o motivo que já estava na tela, se houver
        const motivoAtual = document.getElementById(`motivo-${id}`).value;
        if(motivoAtual) updateData[campo].motivo = motivoAtual;
    }

    try {
        await setDoc(doc(db, "chamadas", dataIso), updateData, { merge: true });
    } catch (error) {
        console.error("Erro ao salvar:", error);
    }
}

async function salvarMotivo(id, nome, novoMotivo) {
    const dataIso = document.getElementById('data-chamada').value;
    const updateData = {};
    const campo = `${linhaAtual}.${id}`;

    updateData[campo] = {
        status: 'falta', // Confirma que é falta
        nome: nome,
        motivo: novoMotivo,
        atualizadoEm: new Date().toISOString()
    };

    try {
        await setDoc(doc(db, "chamadas", dataIso), updateData, { merge: true });
    } catch (error) {
        console.error("Erro ao salvar motivo:", error);
    }
}

// --- SINCRONIZAÇÃO VISUAL (LER BANCO) ---
function sincronizarStatusChamada() {
    const dataIso = document.getElementById('data-chamada').value;
    if(!dataIso) return;

    if (unsubscribeChamadaDia) unsubscribeChamadaDia();

    const docRef = doc(db, "chamadas", dataIso);

    unsubscribeChamadaDia = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
            const dadosDia = docSnap.data();
            const dadosLinha = dadosDia[linhaAtual] || {};

            document.querySelectorAll('.chamada-card').forEach(card => {
                const id = card.id.replace('card-', '');
                const info = dadosLinha[id];

                const btnP = card.querySelector('.btn-p');
                const btnF = card.querySelector('.btn-f');
                const motivoBox = document.getElementById(`motivo-box-${id}`);
                const selectMotivo = document.getElementById(`motivo-${id}`);

                // Reset
                card.classList.remove('presente', 'falta');
                btnP.classList.remove('selected');
                btnF.classList.remove('selected');
                motivoBox.classList.add('hidden');

                if (info) {
                    if (info.status === 'presente') {
                        card.classList.add('presente');
                        btnP.classList.add('selected');
                    } else if (info.status === 'falta') {
                        card.classList.add('falta');
                        btnF.classList.add('selected');
                        motivoBox.classList.remove('hidden');
                        if (info.motivo) selectMotivo.value = info.motivo;
                    }
                }
            });
        } else {
            // Dia limpo
            document.querySelectorAll('.chamada-card').forEach(card => {
                card.classList.remove('presente', 'falta');
                card.querySelector('.btn-p').classList.remove('selected');
                card.querySelector('.btn-f').classList.remove('selected');
                card.querySelector('.motivo-box').classList.add('hidden');
                card.querySelector('select').value = "";
            });
        }
    });
}


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
