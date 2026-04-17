import React, { useState } from 'react';
import { Search, Box, Layers, Factory, Ruler, AlertCircle, Loader2, ChevronRight, ClipboardList, List, Hash } from 'lucide-react';

// MANTENHA A SUA URL ABAIXO
const POWER_AUTOMATE_URL = "https://default63123b3750ce444c80fafe99d1bf9f.46.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/ab37f4a7d0a94a388fab2161f970e7fc/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=wp2-vlplwP9LufynRp1I8GyIc1EkBmEghe2nKsh10G8";

export default function App() {
  const [activeTab, setActiveTab] = useState('PN IND.'); 
  const [searchValue, setSearchValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState<any[]>([]);

  // MAPEAMENTO EXATO COM OS CABEÇALHOS DA SUA PLANILHA
  const filters = [
    { label: 'PN IND.', column: 'PN IND.' },
    { label: 'PN CONJ.', column: 'CONJUNTO' },
    { label: 'OP IND.', column: 'OP IND.' },
    { label: 'OP CONJ.', column: 'OP CONJ.' },
    { label: 'NESTING', column: 'NESTING' },
    { label: 'PROJETO', column: 'PROJETO' }
  ];

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchValue) return;
    
    setIsLoading(true);
    setError('');
    setResults([]);
    
    const selectedColumn = filters.find(f => f.label === activeTab)?.column || activeTab;

    try {
      const response = await fetch(POWER_AUTOMATE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          searchField: selectedColumn,
          searchValue: searchValue
        })
      });

      if (!response.ok) throw new Error('Erro 502: O Excel não reconheceu a coluna ou a tabela.');

      const data = await response.json();
      
      if (!data || data.length === 0) {
        setError(`Nenhum registro para ${activeTab}: ${searchValue}`);
      } else {
        setResults(data); 
      }
    } catch (err: any) {
      setError('Falha na busca. Verifique se o nome da coluna no Excel é exatamente igual ao botão.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen pb-20 bg-slate-950 text-slate-100 font-sans">
      <header className="bg-slate-900/95 border-b border-slate-800 p-4 sticky top-0 z-30 backdrop-blur-md">
        <div className="flex justify-between items-center max-w-md mx-auto">
          <h1 className="text-xl font-black italic tracking-tighter text-white">MOTOR <span className="text-blue-500 not-italic">PCP</span></h1>
          <div className="text-right leading-none">
             <p className="text-[10px] text-emerald-500 font-black tracking-widest uppercase">Online</p>
             <p className="text-[8px] text-slate-600 font-bold uppercase tracking-tighter">Modular DTC</p>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4">
        {/* Grade de Botões 2x3 para Mobile */}
        <div className="grid grid-cols-3 gap-2 mb-6 bg-slate-900/40 p-2 rounded-2xl border border-slate-800/50">
          {filters.map((f) => (
            <button
              key={f.label}
              onClick={() => { setActiveTab(f.label); setResults([]); setError(''); }}
              className={`py-3 text-[9px] font-black rounded-xl border transition-all active:scale-95 ${
                activeTab === f.label 
                  ? 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-900/40' 
                  : 'bg-slate-800 border-slate-700 text-slate-500'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Input */}
        <form onSubmit={handleSearch} className="relative mb-6">
          <input
            type="text"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value.toUpperCase())}
            placeholder={`PESQUISAR ${activeTab}...`}
            className="w-full bg-slate-900 border-2 border-slate-800 text-white text-lg font-bold rounded-2xl py-4 pl-6 pr-16 focus:border-blue-500 outline-none uppercase shadow-inner"
          />
          <button type="submit" disabled={isLoading} className="absolute right-2 top-2 bottom-2 aspect-square bg-blue-600 rounded-xl flex items-center justify-center shadow-lg">
            {isLoading ? <Loader2 className="animate-spin" /> : <Search />}
          </button>
        </form>

        {error && (
          <div className="mb-6 p-4 bg-red-950/30 border border-red-500/30 rounded-2xl flex gap-3 items-center animate-in fade-in">
            <AlertCircle className="text-red-500 shrink-0 w-5 h-5" />
            <p className="text-xs font-bold text-red-400">{error}</p>
          </div>
        )}

        {/* Listagem de Resultados */}
        {results.length > 0 && (
          <div className="space-y-4">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{results.length} Itens encontrados</p>
            {results.map((item, index) => (
              <div key={index} className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl animate-in fade-in slide-in-from-bottom-4 transition-all">
                {/* Cabeçalho do Card */}
                <div className="p-5 border-b border-slate-800 bg-gradient-to-r from-slate-900 to-slate-800/50 flex justify-between items-start">
                  <div className="flex-1">
                    <p className="text-[9px] font-black text-blue-500 mb-1 tracking-widest uppercase">Peça Identificada</p>
                    <h2 className="text-xl font-black text-white leading-tight break-all">{item['PN IND.'] || 'SEM CÓDIGO'}</h2>
                    <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase italic">Conj: {item['CONJUNTO'] || '-'}</p>
                  </div>
                  <div className="bg-blue-600 px-3 py-2 rounded-xl text-center shadow-md">
                    <p className="text-[8px] font-black text-blue-100 uppercase leading-none mb-1">Qtd</p>
                    <p className="text-xl font-black text-white">{item['QTDI'] || '0'}</p>
                  </div>
                </div>
                
                {/* Especificações Técnicas */}
                <div className="p-5 grid grid-cols-2 gap-4">
                  <div className="bg-slate-950/50 p-3 rounded-2xl border border-slate-800/50">
                    <div className="flex items-center gap-1.5 text-slate-500 mb-1"><Layers className="w-3 h-3"/><span className="text-[8px] font-black uppercase tracking-tighter">Material</span></div>
                    <p className="text-xs font-bold text-slate-200">{item['MAT.'] || '-'}</p>
                  </div>
                  <div className="bg-slate-950/50 p-3 rounded-2xl border border-slate-800/50">
                    <div className="flex items-center gap-1.5 text-slate-500 mb-1"><Ruler className="w-3 h-3"/><span className="text-[8px] font-black uppercase tracking-tighter">Espessura</span></div>
                    <p className="text-xs font-bold text-slate-200">{item['ESP.'] || '-'}</p>
                  </div>
                </div>

                {/* Status e Processo */}
                <div className="px-5 pb-5">
                   <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Factory className="w-5 h-5 text-emerald-500" />
                        <span className="text-lg font-black text-emerald-400 uppercase tracking-tight">{item['PROC.'] || 'DEFINIR'}</span>
                      </div>
                      <ChevronRight className="text-emerald-900 w-5 h-5" />
                   </div>
                </div>

                {/* Rodapé do Card (Informações de Rastreio) */}
                <div className="bg-slate-950/80 p-4 border-t border-slate-800/50 grid grid-cols-2 gap-2">
                   <div className="flex items-center gap-2">
                      <Hash className="w-3 h-3 text-slate-600" />
                      <p className="text-[9px] text-slate-500 font-bold">OP IND: <span className="text-slate-300">{item['OP IND.'] || '-'}</span></p>
                   </div>
                   <div className="flex items-center gap-2">
                      <ClipboardList className="w-3 h-3 text-slate-600" />
                      <p className="text-[9px] text-slate-500 font-bold uppercase tracking-tighter">Nest: <span className="text-slate-300">{item['NESTING'] || '-'}</span></p>
                   </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoading && results.length === 0 && !error && (
          <div className="text-center mt-20 opacity-20">
            <Box className="w-16 h-16 mx-auto mb-4" />
            <p className="text-xs font-black uppercase tracking-[0.4em]">Pronto para buscar</p>
          </div>
        )}
      </main>
    </div>
  );
}
