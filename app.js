import { auth, db } from './firebase-config.js';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
// Adicionado getDocs para o relatório
import { collection, addDoc, query, orderBy, onSnapshot, deleteDoc, doc, where, setDoc, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- VARIÁVEIS GLOBAIS ---
let linhaAtual = 'linha_1'; 
let unsubscribeColaboradores = null; 
let unsubscribeChamadaDia = null;

// --- ELEMENTOS UI ---
const loginScreen = document.getElementById('login-screen');
const appScreen = document.getElementById('app-screen');
const formLogin = document.getElementById('form-login');
const msgErro = document.getElementById('mensagem-erro');
const btnLogout = document.getElementById('btn-logout');

// ==================================================================
// 🚨 FUNÇÕES PÚBLICAS (WINDOW) 🚨
// ==================================================================

// 1. Marcar Presença/Falta
window.marcarPresenca = async function(id, status, nome) {
    const dataIso = document.getElementById('data-chamada').value;
    if (!dataIso) { alert("ERRO: Selecione uma data!"); return; }

    console.log(`Salvando: ${nome} | ${status} | ${dataIso}`);

    // Feedback Visual Imediato
    const card = document.getElementById(`card-${id}`);
    const btnP = document.getElementById(`btn-p-${id}`);
    const btnF = document.getElementById(`btn-f-${id}`);
    const divObs = document.getElementById(`div-obs-${id}`);

    card.classList.remove('presente', 'falta');
    btnP.classList.remove('selected-p');
    btnF.classList.remove('selected-f');
    divObs.classList.add('hidden');

    if (status === 'presente') {
        card.classList.add('presente');
        btnP.classList.add('selected-p');
    } else {
        card.classList.add('falta');
        btnF.classList.add('selected-f');
        divObs.classList.remove('hidden');
    }

    // Salvar no Firebase
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
        console.log("Salvo com sucesso!");
    } catch (error) {
        console.error("ERRO SALVAR:", error);
        alert(`Erro ao salvar: ${error.message}`);
    }
};

// 2. Salvar Motivo
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
        console.error("Erro motivo:", error);
    }
};

// 3. Gerar Relatório (Aba Dados)
async function gerarRelatorioMensal() {
    const container = document.getElementById('container-relatorio');
    const mesSelecionado = document.getElementById('filtro-mes').value; // YYYY-MM
    const linhaFiltro = document.getElementById('filtro-linha-dados').value;

    if(!mesSelecionado) { alert("Selecione um mês."); return; }

    container.innerHTML = '<p style="text-align:center; padding:20px;">Processando relatório...</p>';

    try {
        // Busca Colaboradores
        let qColab = query(collection(db, "colaboradores"), orderBy("nome"));
        if(linhaFiltro !== 'todas') {
            qColab = query(collection(db, "colaboradores"), where("linha", "==", linhaFiltro), orderBy("nome"));
        }
        
        const snapColabs = await getDocs(qColab);
        const colaboradores = [];
        snapColabs.forEach(d => colaboradores.push({id: d.id, ...d.data()}));

        // Busca Chamadas do Mês
        const inicioMes = `${mesSelecionado}-01`;
        const fimMes = `${mesSelecionado}-31`;
        
        const qChamadas = query(
            collection(db, "chamadas"),
            where("__name__", ">=", inicioMes),
            where("__name__", "<=", fimMes)
        );
        
        const snapChamadas = await getDocs(qChamadas);
        const dadosChamadas = {}; 
        snapChamadas.forEach(d => dadosChamadas[d.id] = d.data());

        // Monta Tabela HTML
        const [ano, mes] = mesSelecionado.split('-').map(Number);
        const qtdDias = new Date(ano, mes, 0).getDate();

        let html = `<table class="tabela-mensal"><thead><tr><th class="col-fixa-nome">Colaborador</th>`;
        for(let d=1; d<=qtdDias; d++) html += `<th>${d}</th>`;
        html += `<th>Resumo</th></tr></thead><tbody>`;

        colaboradores.forEach(colab => {
            if(!colab.ativo) return;

            let totalFaltas = 0;
            let linhaHtml = `<tr><td class="col-fixa-nome">${colab.nome.split(' ')[0]} <small>(${colab.matricula})</small></td>`;

            for(let d=1; d<=qtdDias; d++) {
                const diaString = `${mesSelecionado}-${String(d).padStart(2,'0')}`;
                const dadosDia = dadosChamadas[diaString];
                
                let cellClass = "";
                let cellContent = "-";
                let tooltip = "";

                let infoColab = null;
                if(dadosDia && dadosDia[colab.linha] && dadosDia[colab.linha][colab.id]) {
                    infoColab = dadosDia[colab.linha][colab.id];
                }

                if(infoColab) {
                    if(infoColab.status === 'presente') {
                        cellClass = "cell-p"; cellContent = "P"; tooltip = "Presente";
                    } else if(infoColab.status === 'falta') {
                        const motivo = infoColab.motivo || "Injust.";
                        tooltip = motivo;
                        if(motivo.includes("Atestado") || motivo.includes("Justificada")) {
                            cellClass = "cell-a"; cellContent = "J"; 
                        } else if(motivo.includes("Suspensao")) {
                            cellClass = "cell-s"; cellContent = "S";
                        } else {
                            cellClass = "cell-f"; cellContent = "F"; totalFaltas++;
                        }
                    }
                }
                linhaHtml += `<td class="${cellClass}" title="${tooltip}">${cellContent}</td>`;
            }
            linhaHtml += `<td><strong>${totalFaltas}</strong> Faltas</td></tr>`;
            html += linhaHtml;
        });

        html += `</tbody></table>`;
        container.innerHTML = html;

    } catch (error) {
        console.error(error);
        container.innerHTML = `<p style="color:red; text-align:center;">Erro: ${error.message}</p>`;
    }
}


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
        
        // Setup Relatório
        const btnRel = document.getElementById('btn-gerar-relatorio');
        if(btnRel) btnRel.addEventListener('click', gerarRelatorioMensal);
        const fMes = document.getElementById('filtro-mes');
        if(fMes && !fMes.value) {
            const h = new Date();
            fMes.value = `${h.getFullYear()}-${String(h.getMonth()+1).padStart(2,'0')}`;
        }

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

// --- LISTAGEM DE CHAMADA ---
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
            document.querySelectorAll('.chamada-card').forEach(card => {
                card.classList.remove('presente', 'falta');
                card.querySelector('.hidden')?.classList.add('hidden');
                card.querySelectorAll('.btn-check').forEach(b => b.classList.remove('selected-p', 'selected-f'));
                if(card.querySelector('select')) card.querySelector('select').value = "";
            });
        }
    });
}

// RH
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
