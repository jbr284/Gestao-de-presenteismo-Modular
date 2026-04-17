import React, { useState } from 'react';
import { Search, Box, Layers, Factory, Ruler, AlertCircle, Loader2, ChevronRight } from 'lucide-react';

// === COLA AQUI A TUA URL DO POWER AUTOMATE ===
const POWER_AUTOMATE_URL = https://default63123b3750ce444c80fafe99d1bf9f.46.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/ab37f4a7d0a94a388fab2161f970e7fc/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=wp2-vlplwP9LufynRp1I8GyIc1EkBmEghe2nKsh10G8;

export default function App() {
  const [activeTab, setActiveTab] = useState('PROJETO'); 
  const [searchValue, setSearchValue] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [partData, setPartData] = useState<any>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchValue || !POWER_AUTOMATE_URL.startsWith('http')) {
      if (!POWER_AUTOMATE_URL.startsWith('http')) setError('Erro: URL do Power Automate não configurada.');
      return;
    }
    
    setIsLoading(true);
    setError('');
    setPartData(null);
    
    try {
      const response = await fetch(POWER_AUTOMATE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          searchField: activeTab,
          searchValue: searchValue
        })
      });

      if (!response.ok) throw new Error('Falha na comunicação com o servidor.');

      const data = await response.json();
      
      if (!data || data.length === 0) {
        setError(`Nenhum registo encontrado para ${activeTab}: ${searchValue}`);
      } else {
        setPartData(data[0]); 
      }
    } catch (err) {
      console.error(err);
      setError('Erro de conexão. Verifique se o fluxo do Power Automate está ativo e se a URL está correta.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen pb-20 bg-slate-950 text-slate-100 font-sans">
      {/* Header Profissional */}
      <header className="bg-slate-900/80 border-b border-slate-800 p-4 sticky top-0 z-20 backdrop-blur-lg">
        <div className="flex justify-between items-center max-w-md mx-auto">
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-white">MOTOR <span className="text-blue-500">PCP</span></h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"></span>
              <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">Sistema Online</p>
            </div>
          </div>
          <div className="flex flex-col items-end">
             <span className="text-[10px] text-slate-500 font-bold tracking-tighter uppercase">MODULAR DTC</span>
             <span className="text-[9px] text-slate-600">v1.0.0-PROD</span>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto p-5">
        {/* Seletor de Categoria de Busca */}
        <div className="flex bg-slate-900 rounded-2xl p-1.5 mb-6 border border-slate-800 shadow-2xl">
          {['PROJETO', 'PEÇA', 'OP IND.'].map((tab) => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setPartData(null); setError(''); }}
              className={`flex-1 py-3 text-xs font-black rounded-xl transition-all duration-300 ${
                activeTab === tab 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' 
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Input de Busca de Alto Impacto */}
        <form onSubmit={handleSearch} className="relative mb-8 group">
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl blur opacity-20 group-focus-within:opacity-40 transition duration-500"></div>
          <input
            type="text"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value.toUpperCase())}
            placeholder={`PESQUISAR ${activeTab}...`}
            className="relative w-full bg-slate-900 border border-slate-700 text-white text-xl font-bold rounded-2xl py-5 pl-6 pr-16 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:text-slate-600 uppercase"
          />
          <button 
            type="submit" 
            disabled={isLoading} 
            className="absolute right-3 top-3 bottom-3 aspect-square bg-blue-600 rounded-xl flex items-center justify-center text-white hover:bg-blue-500 active:scale-90 transition-all shadow-lg disabled:bg-slate-800"
          >
            {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Search className="w-7 h-7" />}
          </button>
        </form>

        {/* Feedback de Erro */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-5 rounded-2xl flex items-start gap-4 animate-in fade-in slide-in-from-top-2">
            <AlertCircle className="w-6 h-6 shrink-0 mt-0.5" />
            <div>
               <p className="font-bold text-sm">Atenção no Chão de Fábrica</p>
               <p className="text-xs opacity-80 mt-1 leading-relaxed">{error}</p>
            </div>
          </div>
        )}

        {/* --- RESULTADO DA CONSULTA AO EXCEL --- */}
        {partData && (
          <div className="space-y-5 animate-in fade-in slide-in-from-bottom-6 duration-500">
            {/* Card Detalhado da Peça */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
              <div className="p-6 border-b border-slate-800 bg-gradient-to-br from-slate-900 to-slate-800 flex justify-between items-start">
                <div className="flex-1 pr-4">
                  <div className="flex items-center gap-2 mb-2">
                     <span className="bg-blue-600/20 text-blue-400 text-[10px] font-black px-2 py-0.5 rounded-md border border-blue-500/20">IDENTIFICADO</span>
                     <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{activeTab}</p>
                  </div>
                  <h2 className="text-3xl font-black text-white leading-none break-words">{partData['PEÇA'] || 'S/N'}</h2>
                  <p className="text-xs text-slate-400 font-bold mt-2 uppercase">Projeto: <span className="text-slate-200">{partData['PROJETO'] || '-'}</span></p>
                </div>
                <div className="bg-blue-600 p-4 rounded-2xl text-center shadow-lg shadow-blue-900/40 min-w-[80px]">
                  <p className="text-[9px] text-blue-100 font-black uppercase mb-1">QTDI</p>
                  <p className="text-3xl font-black text-white">{partData['QTDI'] || '0'}</p>
                </div>
              </div>
              
              <div className="p-6 grid grid-cols-2 gap-6">
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2 text-slate-500">
                    <Layers className="w-4 h-4"/>
                    <span className="text-[10px] font-black uppercase">Material</span>
                  </div>
                  <p className="text-base font-bold text-slate-100">{partData['MAT.'] || '-'}</p>
                </div>
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2 text-slate-500">
                    <Ruler className="w-4 h-4"/>
                    <span className="text-[10px] font-black uppercase">Espessura</span>
                  </div>
                  <p className="text-base font-bold text-slate-100">{partData['ESP.'] || '-'}</p>
                </div>
              </div>
            </div>

            {/* Roteiro de Produção */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-600/5 rounded-full blur-3xl -mr-16 -mt-16"></div>
              <h3 className="text-[10px] text-slate-500 font-black tracking-[0.2em] mb-4 flex items-center gap-2">
                <Factory className="w-4 h-4 text-emerald-500" /> FLUXO DE PROCESSO
              </h3>
              <div className="flex items-center gap-4">
                 <div className="flex-1 bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl flex items-center justify-between">
                    <span className="text-lg font-black text-emerald-400">{partData['PROC.'] || 'CONSULTAR TI'}</span>
                    <ChevronRight className="w-5 h-5 text-emerald-500/50" />
                 </div>
              </div>
            </div>
          </div>
        )}

        {/* Estado Inicial / Vazio */}
        {!isLoading && !partData && !error && (
          <div className="text-center mt-24 px-10">
            <div className="w-20 h-20 bg-slate-900 rounded-3xl border border-slate-800 flex items-center justify-center mx-auto mb-6 shadow-xl">
               <Box className="w-10 h-10 text-slate-700" />
            </div>
            <h3 className="text-slate-300 font-bold mb-2">Pronto para Consulta</h3>
            <p className="text-slate-500 text-xs leading-relaxed font-medium">Insira o código acima para consultar os dados do Excel em tempo real no chão de fábrica.</p>
          </div>
        )}
      </main>
    </div>
  );
}
