import { auth, db } from './firebase-config.js';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { collection, addDoc, query, orderBy, onSnapshot, deleteDoc, doc, where, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- VARIÁVEIS GLOBAIS DE ESTADO ---
let linhaAtual = 'linha_1'; // Começa na Linha 1
let unsubscribeColaboradores = null; // Para limpar memória
let unsubscribeChamadaDia = null;    // Para limpar memória

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
        
        // Define data de hoje se estiver vazio
        const dateInput = document.getElementById('data-chamada');
        if(!dateInput.value) dateInput.valueAsDate = new Date();
        
        // Carrega dados iniciais
        carregarColaboradoresRH();
        carregarListaChamada(); // Carrega a linha padrão (linha_1)
        
        // Monitora mudança de data para recarregar a chamada
        dateInput.addEventListener('change', () => {
            carregarListaChamada(); // Recarrega os status quando muda a data
        });

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

// --- 3. LÓGICA DA CHAMADA (MOTOR PRINCIPAL) ---
const lineBtns = document.querySelectorAll('.line-btn');
const listaChamadaContainer = document.querySelector('.lista-chamada');

// Troca de Linha
lineBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        lineBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        // Define a linha atual baseada no texto do botão
        if(btn.textContent.includes('Linha 1')) linhaAtual = 'linha_1';
        else if(btn.textContent.includes('Linha 2')) linhaAtual = 'linha_2';
        else if(btn.textContent.includes('Acabamento')) linhaAtual = 'acabamento';
        
        carregarListaChamada();
    });
});

// Constrói a lista de funcionários da linha
function carregarListaChamada() {
    listaChamadaContainer.innerHTML = '<p style="text-align:center; margin-top:20px;">Carregando equipe...</p>';

    // Se já tinha um listener ativo, desliga ele para não duplicar
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

        snapshot.forEach((doc) => {
            const colab = doc.data();
            const id = doc.id;

            const card = document.createElement('div');
            card.className = 'chamada-card';
            card.id = `card-${id}`;
            // Guarda o nome no dataset para facilitar salvamento
            card.dataset.nome = colab.nome; 

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
                    <select class="motivo-select" id="motivo-${id}" onchange="atualizarMotivo('${id}')">
                        <option value="">Selecione o Motivo...</option>
                        <option value="Injustificada">Falta Injustificada</option>
                        <option value="Atestado">Atestado Médico</option>
                        <option value="Justificada">Justificada (Gestor)</option>
                        <option value="Suspensao">Suspensão</option>
                        <option value="Folga">Folga / Compensação</option>
                    </select>
                </div>
            `;
            listaChamadaContainer.appendChild(card);
        });

        // Após desenhar a lista, busca os status do banco para pintar os botões
        sincronizarStatusChamada();
    });
}

// Escuta o documento do DIA e atualiza as cores na tela
function sincronizarStatusChamada() {
    const dataIso = document.getElementById('data-chamada').value; // YYYY-MM-DD
    if(!dataIso) return;

    // Se já tinha listener do dia, desliga
    if (unsubscribeChamadaDia) unsubscribeChamadaDia();

    // O documento será: chamadas/2026-01-22
    const docRef = doc(db, "chamadas", dataIso);

    unsubscribeChamadaDia = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
            const dadosDia = docSnap.data();
            const dadosLinha = dadosDia[linhaAtual] || {}; // Pega só os dados da linha atual

            // Percorre todos os cards na tela e atualiza o visual
            document.querySelectorAll('.chamada-card').forEach(card => {
                const id = card.id.replace('card-', '');
                const info = dadosLinha[id]; // Informação salva para este user

                const btnP = card.querySelector('.btn-p');
                const btnF = card.querySelector('.btn-f');
                const motivoBox = document.getElementById(`motivo-box-${id}`);
                const selectMotivo = document.getElementById(`motivo-${id}`);

                // Reset visual
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
            // Se o dia não existe no banco, limpa tudo visualmente
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

// --- FUNÇÕES DE AÇÃO (SALVAR NO BANCO) ---

// 1. Clicou em Presente ou Falta
window.marcarPresenca = async function(id, status) {
    const dataIso = document.getElementById('data-chamada').value;
    const card = document.getElementById(`card-${id}`);
    const nomeColab = card.dataset.nome;

    if (!dataIso) { alert("Selecione uma data!"); return; }

    // Estrutura para salvar: linha_X -> id_colab -> { status, nome, timestamp }
    const updateData = {};
    
    // Caminho exato dentro do documento: "linha_1.ID123"
    const campo = `${linhaAtual}.${id}`;

    updateData[campo] = {
        status: status,
        nome: nomeColab, // Salvar o nome facilita relatórios futuros sem cruzar tabelas
        atualizadoEm: new Date().toISOString()
    };

    // Se for falta, já prepara o motivo (se já tiver algo selecionado, mantém, senão vazio)
    if (status === 'falta') {
        const motivoAtual = document.getElementById(`motivo-${id}`).value;
        updateData[campo].motivo = motivoAtual;
    } else {
        // Se for presente, apaga o motivo
        updateData[campo].motivo = ""; 
    }

    try {
        // setDoc com merge: true cria o dia se não existir, ou atualiza se existir
        await setDoc(doc(db, "chamadas", dataIso), updateData, { merge: true });
        // O feedback visual virá automaticamente pelo onSnapshot do sincronizarStatusChamada()
    } catch (error) {
        console.error("Erro ao salvar presença:", error);
        alert("Erro ao salvar. Verifique conexão.");
    }
};

// 2. Mudou o Select de Motivo
window.atualizarMotivo = async function(id) {
    const dataIso = document.getElementById('data-chamada').value;
    const novoMotivo = document.getElementById(`motivo-${id}`).value;
    const card = document.getElementById(`card-${id}`);
    const nomeColab = card.dataset.nome;

    const updateData = {};
    const campo = `${linhaAtual}.${id}`;

    // Atualiza apenas o motivo, mantendo status falta
    updateData[campo] = {
        status: 'falta',
        nome: nomeColab,
        motivo: novoMotivo,
        atualizadoEm: new Date().toISOString()
    };

    try {
        await setDoc(doc(db, "chamadas", dataIso), updateData, { merge: true });
    } catch (error) {
        console.error("Erro ao salvar motivo:", error);
    }
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
