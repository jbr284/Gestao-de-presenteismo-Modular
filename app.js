import { auth, db } from './firebase-config.js';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { collection, addDoc, query, orderBy, onSnapshot, deleteDoc, doc, where, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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
// 🚨 FUNÇÕES PÚBLICAS (WINDOW) - CORRIGIDAS 🚨
// ==================================================================

// 1. Marcar Presença/Falta
window.marcarPresenca = async function(id, status, nome) {
    const dataIso = document.getElementById('data-chamada').value;
    if (!dataIso) { alert("ERRO: Selecione uma data!"); return; }

    console.log(`Tentando salvar: ${nome} -> ${status} em ${dataIso}`);

    // --- FEEDBACK VISUAL IMEDIATO ---
    const card = document.getElementById(`card-${id}`);
    const btnP = document.getElementById(`btn-p-${id}`);
    const btnF = document.getElementById(`btn-f-${id}`);
    const divObs = document.getElementById(`div-obs-${id}`);

    // Limpa
    card.classList.remove('presente', 'falta');
    btnP.classList.remove('selected-p');
    btnF.classList.remove('selected-f');
    divObs.classList.add('hidden');

    // Aplica novo estado
    if (status === 'presente') {
        card.classList.add('presente');
        btnP.classList.add('selected-p');
    } else {
        card.classList.add('falta');
        btnF.classList.add('selected-f');
        divObs.classList.remove('hidden'); // Mostra select
    }

    // --- SALVAR NO FIREBASE ---
    const updateData = {};
    const campo = `${linhaAtual}.${id}`; // Ex: linha_1.ID_DO_DOC

    updateData[campo] = {
        status: status,
        nome: nome,
        atualizadoEm: new Date().toISOString()
    };

    if (status === 'presente') {
        updateData[campo].motivo = ""; 
    } else {
        const select = document.getElementById(`motivo-${id}`);
        if(select && select.value) updateData[campo].motivo = select.value;
    }

    try {
        await setDoc(doc(db, "chamadas", dataIso), updateData, { merge: true });
        console.log("Salvo com sucesso no Firebase!");
    } catch (error) {
        console.error("ERRO CRÍTICO AO SALVAR:", error);
        alert(`Erro ao salvar: ${error.message}`);
    }
};

// 2. Salvar Motivo (Quando muda o Select)
window.salvarMotivo = async function(id, nome) {
    const dataIso = document.getElementById('data-chamada').value;
    const novoMotivo = document.getElementById(`motivo-${id}`).value;
    
    console.log(`Salvando motivo: ${novoMotivo}`);

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
// LÓGICA DO APP
// ==================================================================

if (formLogin) {
    formLogin.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            await signInWithEmailAndPassword(auth, 
                document.getElementById('email').value, 
                document.getElementById('senha').value
            );
        } catch (error) {
            msgErro.classList.remove('hidden');
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
    }
});

if(btnLogout) btnLogout.addEventListener('click', () => signOut(auth));

// Navegação
document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(t => t.classList.add('hidden'));
        btn.classList.add('active');
        document.getElementById(`tab-${btn.getAttribute('data-tab')}`).classList.remove('hidden');
    });
});

// Linhas
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

// --- LISTAGEM DE CHAMADA (CARD ROBUSTO) ---
const listaChamadaContainer = document.querySelector('.lista-chamada');

function carregarListaChamada() {
    listaChamadaContainer.innerHTML = '<p style="text-align:center; padding:20px;">Carregando...</p>';
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
            listaChamadaContainer.innerHTML = '<p style="text-align:center; padding:20px; color:#666;">Nenhum colaborador nesta linha.</p>';
            return;
        }

        let html = "";
        snapshot.forEach((docSnap) => {
            const colab = docSnap.data();
            const id = docSnap.id;

            html += `
                <div class="chamada-card" id="card-${id}">
                    
                    <div class="col-mat">#${colab.matricula}</div>
                    
                    <div class="col-nome">${colab.nome}</div>
                    
                    <div class="col-func">${colab.funcao}</div>
                    
                    <div class="btn-group">
                        <button id="btn-p-${id}" class="btn-check" onclick="window.marcarPresenca('${id}', 'presente', '${colab.nome}')">
                            <span class="material-icons" style="font-size:18px;">check_circle</span> Presente
                        </button>
                        <button id="btn-f-${id}" class="btn-check" onclick="window.marcarPresenca('${id}', 'falta', '${colab.nome}')">
                            <span class="material-icons" style="font-size:18px;">cancel</span> Faltou
                        </button>
                    </div>

                    <div class="col-obs">
                        <div id="div-obs-${id}" class="motivo-box hidden">
                            <select id="motivo-${id}" class="motivo-select" onchange="window.salvarMotivo('${id}', '${colab.nome}')">
                                <option value="">Selecione o motivo...</option>
                                <option value="Injustificada">Falta Injustificada</option>
                                <option value="Atestado">Atestado Médico</option>
                                <option value="Justificada">Justificada (Gestor)</option>
                                <option value="Suspensao">Suspensão</option>
                                <option value="Folga">Folga / Banco</option>
                            </select>
                        </div>
                    </div>

                </div>
            `;
        });
        listaChamadaContainer.innerHTML = html;
        sincronizarStatusChamada();
    });
}

// SINCRONIZAÇÃO (LER DO BANCO)
function sincronizarStatusChamada() {
    const dataIso = document.getElementById('data-chamada').value;
    if(!dataIso) return;
    if (unsubscribeChamadaDia) unsubscribeChamadaDia();

    unsubscribeChamadaDia = onSnapshot(doc(db, "chamadas", dataIso), (docSnap) => {
        if (docSnap.exists()) {
            const dadosDia = docSnap.data();
            const dadosLinha = dadosDia[linhaAtual] || {};

            Object.keys(dadosLinha).forEach(id => {
                const info = dadosLinha[id];
                const card = document.getElementById(`card-${id}`);

                if (card) {
                    const btnP = document.getElementById(`btn-p-${id}`);
                    const btnF = document.getElementById(`btn-f-${id}`);
                    const divObs = document.getElementById(`div-obs-${id}`);
                    const select = document.getElementById(`motivo-${id}`);

                    // Reset
                    card.classList.remove('presente', 'falta');
                    btnP.classList.remove('selected-p');
                    btnF.classList.remove('selected-f');
                    divObs.classList.add('hidden');

                    if (info.status === 'presente') {
                        card.classList.add('presente');
                        btnP.classList.add('selected-p');
                    } else if (info.status === 'falta') {
                        card.classList.add('falta');
                        btnF.classList.add('selected-f');
                        divObs.classList.remove('hidden');
                        if(info.motivo) select.value = info.motivo;
                    }
                }
            });
        } else {
            // Limpa se o dia estiver vazio
            document.querySelectorAll('.chamada-card').forEach(card => {
                card.classList.remove('presente', 'falta');
                card.querySelector('.hidden')?.classList.add('hidden');
                const btns = card.querySelectorAll('.btn-check');
                btns.forEach(b => b.classList.remove('selected-p', 'selected-f'));
                const sel = card.querySelector('select');
                if(sel) sel.value = "";
            });
        }
    });
}

// ... RH (MANTER IGUAL) ...
const formRH = document.getElementById('form-rh');
const listaRHBody = document.getElementById('lista-rh-body');
if (formRH) {
    formRH.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            await addDoc(collection(db, "colaboradores"), {
                nome: document.getElementById('rh-nome').value.toUpperCase(),
                matricula: document.getElementById('rh-matricula').value,
                funcao: document.getElementById('rh-funcao').value,
                linha: document.getElementById('rh-linha').value,
                ativo: true, criadoEm: new Date()
            });
            alert("Sucesso!"); formRH.reset();
        } catch(e) { console.error(e); }
    });
}
function carregarColaboradoresRH() {
    onSnapshot(query(collection(db, "colaboradores"), orderBy("nome")), (s) => {
        listaRHBody.innerHTML = "";
        s.forEach((d) => {
            const c = d.data();
            listaRHBody.innerHTML += `<tr><td>${c.matricula}</td><td>${c.nome}</td><td>${c.linha}</td><td><button class="btn-excluir" onclick="window.deletarColaborador('${d.id}')">X</button></td></tr>`;
        });
    });
}
window.deletarColaborador = async function(id) {
    if(confirm("Excluir?")) await deleteDoc(doc(db, "colaboradores", id));
}
