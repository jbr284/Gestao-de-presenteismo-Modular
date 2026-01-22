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
// 🚨 FUNÇÕES PÚBLICAS (WINDOW) 🚨
// ==================================================================

window.marcarPresenca = async function(id, status, nome) {
    const dataIso = document.getElementById('data-chamada').value;
    if (!dataIso) { alert("Selecione uma data!"); return; }

    // --- 1. FEEDBACK VISUAL INSTANTÂNEO (TABELA) ---
    const tr = document.getElementById(`row-${id}`);
    const btnP = document.getElementById(`btn-p-${id}`);
    const btnF = document.getElementById(`btn-f-${id}`);
    const divObs = document.getElementById(`div-obs-${id}`);

    // Limpa estados
    tr.classList.remove('row-presente', 'row-falta');
    btnP.classList.remove('selected-p');
    btnF.classList.remove('selected-f');
    divObs.classList.add('hidden'); // Esconde a coluna Obs por padrão

    if (status === 'presente') {
        tr.classList.add('row-presente');
        btnP.classList.add('selected-p');
    } else {
        tr.classList.add('row-falta');
        btnF.classList.add('selected-f');
        divObs.classList.remove('hidden'); // <--- MOSTRA O SELECT NA COLUNA 5
    }

    // --- 2. SALVAR NO BANCO ---
    const updateData = {};
    const campo = `${linhaAtual}.${id}`;

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
    } catch (error) {
        console.error("Erro:", error);
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

    await setDoc(doc(db, "chamadas", dataIso), updateData, { merge: true });
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

// Abas
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

// --- LISTAGEM DE CHAMADA (AGORA EM TABELA) ---
const listaChamadaContainer = document.querySelector('.lista-chamada');

function carregarListaChamada() {
    listaChamadaContainer.innerHTML = '<p style="text-align:center; padding:20px;">Carregando tabela...</p>';
    if (unsubscribeColaboradores) unsubscribeColaboradores();

    const q = query(
        collection(db, "colaboradores"), 
        where("linha", "==", linhaAtual),
        where("ativo", "==", true),
        orderBy("nome")
    );

    unsubscribeColaboradores = onSnapshot(q, (snapshot) => {
        if (snapshot.empty) {
            listaChamadaContainer.innerHTML = '<p style="text-align:center; padding:20px; color:#666;">Nenhum colaborador nesta linha.</p>';
            return;
        }

        // MONTA O CABEÇALHO DA TABELA
        let html = `
            <table class="tabela-chamada">
                <thead>
                    <tr>
                        <th class="col-matricula">Mat.</th>
                        <th class="col-nome">Nome</th>
                        <th class="col-funcao">Função</th>
                        <th class="col-acao">Lógica (Ação)</th>
                        <th class="col-obs">Observação</th>
                    </tr>
                </thead>
                <tbody>
        `;

        // MONTA AS LINHAS (TR)
        snapshot.forEach((docSnap) => {
            const colab = docSnap.data();
            const id = docSnap.id;

            html += `
                <tr id="row-${id}">
                    <td class="col-matricula">${colab.matricula}</td>
                    <td class="col-nome"><strong>${colab.nome}</strong></td>
                    <td class="col-funcao">${colab.funcao}</td>
                    
                    <td class="col-acao">
                        <div class="btn-group">
                            <button id="btn-p-${id}" class="btn-check" onclick="window.marcarPresenca('${id}', 'presente', '${colab.nome}')">
                                <span class="material-icons" style="font-size:16px;">check_circle</span> Presente
                            </button>
                            <button id="btn-f-${id}" class="btn-check" onclick="window.marcarPresenca('${id}', 'falta', '${colab.nome}')">
                                <span class="material-icons" style="font-size:16px;">cancel</span> Faltou
                            </button>
                        </div>
                    </td>

                    <td class="col-obs">
                        <div id="div-obs-${id}" class="hidden">
                            <select id="motivo-${id}" class="select-motivo" onchange="window.salvarMotivo('${id}', '${colab.nome}')">
                                <option value="">Selecione o motivo...</option>
                                <option value="Injustificada">Falta Injustificada</option>
                                <option value="Atestado">Atestado Médico</option>
                                <option value="Justificada">Justificada (Gestor)</option>
                                <option value="Suspensao">Suspensão</option>
                                <option value="Folga">Folga / Banco</option>
                            </select>
                        </div>
                    </td>
                </tr>
            `;
        });

        html += `</tbody></table>`;
        listaChamadaContainer.innerHTML = html;
        
        sincronizarStatusChamada();
    });
}

// SINCRONIZAÇÃO (PINTAR A TABELA)
function sincronizarStatusChamada() {
    const dataIso = document.getElementById('data-chamada').value;
    if(!dataIso) return;
    if (unsubscribeChamadaDia) unsubscribeChamadaDia();

    unsubscribeChamadaDia = onSnapshot(doc(db, "chamadas", dataIso), (docSnap) => {
        if (docSnap.exists()) {
            const dadosDia = docSnap.data();
            const dadosLinha = dadosDia[linhaAtual] || {};

            // Percorre as chaves salvas e atualiza a tabela
            Object.keys(dadosLinha).forEach(id => {
                const info = dadosLinha[id];
                const tr = document.getElementById(`row-${id}`);
                
                // Se o funcionário ainda existir na tabela
                if (tr) {
                    const btnP = document.getElementById(`btn-p-${id}`);
                    const btnF = document.getElementById(`btn-f-${id}`);
                    const divObs = document.getElementById(`div-obs-${id}`);
                    const select = document.getElementById(`motivo-${id}`);

                    // Reset
                    tr.classList.remove('row-presente', 'row-falta');
                    btnP.classList.remove('selected-p');
                    btnF.classList.remove('selected-f');
                    divObs.classList.add('hidden');

                    if (info.status === 'presente') {
                        tr.classList.add('row-presente');
                        btnP.classList.add('selected-p');
                    } else if (info.status === 'falta') {
                        tr.classList.add('row-falta');
                        btnF.classList.add('selected-f');
                        divObs.classList.remove('hidden'); // Mostra a coluna Obs
                        if(info.motivo) select.value = info.motivo;
                    }
                }
            });
        } else {
            // Limpa tabela se mudou para um dia sem dados
            document.querySelectorAll('tr[id^="row-"]').forEach(tr => {
                tr.className = "";
                tr.querySelectorAll('.btn-check').forEach(b => b.className = 'btn-check');
                tr.querySelectorAll('div[id^="div-obs-"]').forEach(d => d.classList.add('hidden'));
                tr.querySelectorAll('select').forEach(s => s.value = "");
            });
        }
    });
}

// ... RH (MANTENHA IGUAL) ...
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
