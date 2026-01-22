// firebase-config.js
// Importa as funções do Firebase (versão Modular v9+)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// COLOQUE AQUI AS SUAS CHAVES DO PASSO 2:
const firebaseConfig = {
  apiKey: "AIzaSyC_KZZ_0RwAMVP2iYER3O4B3XxzHXpdi4U",
  authDomain: "gestao-de-presenteismo-modular.firebaseapp.com",
  projectId: "gestao-de-presenteismo-modular",
  storageBucket: "gestao-de-presenteismo-modular.firebasestorage.app",
  messagingSenderId: "946781752204",
  appId: "1:946781752204:web:775251b0b35b9738e9e4a9"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);

// Exporta as ferramentas para usarmos no app.js
export const auth = getAuth(app);
export const db = getFirestore(app);