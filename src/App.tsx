import React, { useState } from 'react';
import { useIsAuthenticated, useMsal } from '@azure/msal-react';
import { loginRequest } from './authConfig';
import { Search, LogIn, Settings2 } from 'lucide-react';

export default function App() {
  const { instance, accounts } = useMsal();
  const isAuthenticated = useIsAuthenticated();
  
  // Controle das abas e do texto digitado
  const [activeTab, setActiveTab] = useState('PN IND.');
  const [searchValue, setSearchValue] = useState('');

  const handleLogin = () => {
    instance.loginPopup(loginRequest).catch(e => console.error(e));
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    alert(`Preparando para buscar: ${searchValue} na categoria ${activeTab}\n(Conexão com o Excel no próximo passo!)`);
  };

  // TELA 1: LOGIN (Se não estiver autenticado)
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-slate-800 p-8 rounded-2xl shadow-xl max-w-sm w-full text-center border border-slate-700">
          <div className="w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-6 shadow-lg">
            <Settings2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Motor PCP</h1>
          <p className="text-slate-400 mb-8 text-sm">Pesquisa de Cortes - Laser & Serra</p>
          <button 
            onClick={handleLogin}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors"
          >
            <LogIn className="w-5 h-5" />
            Acessar com Microsoft
          </button>
        </div>
      </div>
    );
  }

  // TELA 2: PWA PRINCIPAL (Chão de Fábrica)
  return (
    <div className="min-h-screen pb-20">
      {/* Cabeçalho */}
      <header className="bg-slate-800 border-b border-slate-700 p-4 sticky top-0 z-10 shadow-sm">
        <div className="flex justify-between items-center max-w-md mx-auto">
          <div>
            <h1 className="text-lg font-bold text-white">Motor PCP</h1>
            <p className="text-xs text-slate-400">Operador: {accounts[0]?.name?.split(' ')[0]}</p>
          </div>
          <div className="w-8 h-8 bg-blue-900 text-blue-300 rounded-full flex items-center justify-center font-bold text-sm">
            {accounts[0]?.name?.charAt(0)}
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4 mt-4">
        {/* Navegação Rápida (Tabs) */}
        <div className="flex bg-slate-800 rounded-xl p-1 mb-6 border border-slate-700 shadow-inner">
          {['PN IND.', 'PN CONJ.', 'OP IND.'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 text-[11px] sm:text-xs font-bold rounded-lg transition-all ${
                activeTab === tab 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Barra de Busca Gigante */}
        <form onSubmit={handleSearch} className="relative mb-8">
          <input
            type="text"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value.toUpperCase())}
            placeholder={`Código ${activeTab}...`}
            className="w-full bg-slate-800 border border-slate-700 text-white text-lg rounded-2xl py-4 pl-4 pr-14 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-sm transition-all placeholder:text-slate-500 uppercase"
          />
          <button 
            type="submit"
            className="absolute right-2 top-2 bottom-2 aspect-square bg-blue-600 rounded-xl flex items-center justify-center text-white hover:bg-blue-500 transition-colors shadow-md"
          >
            <Search className="w-6 h-6" />
          </button>
        </form>

        {/* Área de Resultados (Estado Vazio) */}
        <div className="text-center mt-16 opacity-40">
          <Settings2 className="w-16 h-16 mx-auto mb-4 text-slate-500" />
          <p className="text-slate-400">Aguardando busca no sistema...</p>
        </div>
      </main>
    </div>
  );
}
