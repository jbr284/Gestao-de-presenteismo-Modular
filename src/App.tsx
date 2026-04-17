import React, { useState } from 'react';
import { Search, Box, Layers, Factory, Ruler, AlertCircle, Loader2, ChevronRight, ClipboardList } from 'lucide-react';

// === SUA URL DO POWER AUTOMATE (MANTENHA A QUE FUNCIONOU) ===
const POWER_AUTOMATE_URL = "https://default63123b3750ce444c80fafe99d1bf9f.46.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/ab37f4a7d0a94a388fab2161f970e7fc/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=wp2-vlplwP9LufynRp1I8GyIc1EkBmEghe2nKsh10G8";

export default function App() {
  const [activeTab, setActiveTab] = useState('PN IND.'); 
  const [searchValue, setSearchValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [partData, setPartData] = useState<any>(null);

  // Lista de filtros conforme sua necessidade
  const filters = [
    'PN IND.', 'PN CONJ.', 'OP IND.', 
    'OP CONJ.', 'NESTING', 'PROJETO'
  ];

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchValue) return;
    
    setIsLoading(true);
    setError('');
    setPartData(null);
    
    try {
      const response = await fetch(POWER_AUTOMATE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          searchField: activeTab, // Envia o nome do filtro selecionado
          searchValue: searchValue
        })
      });

      if (!response.ok) throw new Error('Erro na resposta do servidor.');

      const data = await response.json();
      
      if (!data || data.length === 0) {
        setError(`Nenhum dado encontrado para ${activeTab}: ${searchValue}`);
      } else {
        setPartData(data[0]); 
      }
    } catch (err) {
      setError('Falha na conexão. Verifique o Power Automate.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen pb-20 bg-slate-950 text-slate-100">
      <header className="bg-slate-900 border-b border-slate-800 p-4 sticky top-0 z-20 backdrop-blur-md bg-opacity-80">
        <div className="flex justify-between items-center max-w-md mx-auto">
          <div>
            <h1 className="text-xl font-black tracking-tight italic">MOTOR <span className="text-blue-500 text-not-italic">PCP</span></h1>
            <p className="text-[10px] text-emerald-400 font-bold tracking-widest uppercase flex items-center gap-1">
               <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span> Sistema Online
            </p>
          </div>
          <div className="text-right">
             <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">Modular DTC</p>
             <p className="text-[8px] text-slate-600">v1.1.0-PROD</p>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto p-5">
        
        {/* Grade de Botões de Filtro */}
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 ml-1 text-center">Selecionar Tipo de Busca</p>
        <div className="grid grid-cols-3 gap-2 mb-8 bg-slate-900/50 p-2 rounded-2xl border border-slate-800">
          {filters.map((tab) => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setPartData(null); setError(''); }}
              className={`py-3 text-[10px] font-black rounded-xl transition-all border ${
                activeTab === tab 
                  ? 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-900/50 scale-95' 
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Campo de Pesquisa */}
        <form onSubmit={handleSearch} className="relative mb-8">
          <input
            type="text"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value.toUpperCase())}
            placeholder={`PESQUISAR ${activeTab}...`}
            className="w-full bg-slate-900 border-2 border-slate-800 text-white text-lg font-bold rounded-2xl py-4 pl-6 pr-16 focus:outline-none focus:border-blue-600 transition-all uppercase placeholder:text-slate-700 shadow-inner"
          />
          <button 
            type="submit" 
            className="absolute right-2 top-2 bottom-2 aspect-square bg-blue-600 rounded-xl flex items-center justify-center text-white active:scale-90 transition-transform shadow-md"
          >
            {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Search className="w-6 h-6" />}
          </button>
        </form>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-4 rounded-xl flex items-center gap-3 animate-in fade-in mb-6">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p className="text-xs font-bold leading-tight">{error}</p>
          </div>
        )}

        {/* Resultados */}
        {partData && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden">
              <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                <div>
                  <p className="text-[10px] text-blue-500 font-black uppercase mb-1 tracking-tighter">Item Identificado</p>
                  <h2 className="text-2xl font-black text-white">{partData['PEÇA'] || partData['PN IND.'] || 'S/N'}</h2>
                </div>
                <div className="bg-blue-600/20 px-4 py-2 rounded-2xl border border-blue-500/30 text-center">
                  <p className="text-[9px] text-blue-300 font-bold uppercase tracking-tight">Qtd</p>
                  <p className="text-2xl font-black text-blue-400">{partData['QTDI'] || '0'}</p>
                </div>
              </div>
              
              <div className="p-6 grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-slate-500"><Layers className="w-3 h-3"/><span className="text-[9px] font-black uppercase">Material</span></div>
                  <p className="text-sm font-bold text-slate-200">{partData['MAT.'] || '-'}</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-slate-500"><Ruler className="w-3 h-3"/><span className="text-[9px] font-black uppercase">Espessura</span></div>
                  <p className="text-sm font-bold text-slate-200">{partData['ESP.'] || '-'}</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
              <h3 className="text-[10px] text-slate-500 font-black tracking-widest mb-4 flex items-center gap-2 uppercase">
                <Factory className="w-4 h-4" /> Processo Atual
              </h3>
              <p className="text-xl font-black text-emerald-400 bg-emerald-500/10 p-4 rounded-2xl text-center border border-emerald-500/20 uppercase tracking-tight">
                {partData['PROC.'] || 'NÃO DEFINIDO'}
              </p>
            </div>
            
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
              <h3 className="text-[10px] text-slate-500 font-black tracking-widest mb-2 flex items-center gap-2 uppercase">
                <ClipboardList className="w-4 h-4" /> Referência
              </h3>
              <p className="text-xs text-slate-400 font-bold">PROJETO: <span className="text-slate-200">{partData['PROJETO'] || '-'}</span></p>
              <p className="text-xs text-slate-400 font-bold mt-1 uppercase">Nesting: <span className="text-slate-200">{partData['NESTING'] || '-'}</span></p>
            </div>
          </div>
        )}

        {!isLoading && !partData && !error && (
          <div className="text-center mt-20 opacity-30">
            <Box className="w-12 h-12 mx-auto mb-4 text-slate-700" />
            <p className="text-[10px] font-black uppercase tracking-[0.3em]">Aguardando Busca</p>
          </div>
        )}
      </main>
    </div>
  );
}
