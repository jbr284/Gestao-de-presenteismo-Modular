import React, { useState } from 'react';
import { Search, Box, Layers, Factory, Ruler, AlertCircle, Loader2, Calendar, Hash, Info, ClipboardList } from 'lucide-react';

// === MANTENHA SUA URL AQUI ===
const POWER_AUTOMATE_URL = "https://default63123b3750ce444c80fafe99d1bf9f.46.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/ab37f4a7d0a94a388fab2161f970e7fc/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=wp2-vlplwP9LufynRp1I8GyIc1EkBmEghe2nKsh10G8";

export default function App() {
  const [activeTab, setActiveTab] = useState('PN IND.'); 
  const [searchValue, setSearchValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState<any[]>([]);

  // Filtros mapeados exatamente com os cabeçalhos da sua planilha
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
        body: JSON.stringify({ searchField: selectedColumn, searchValue: searchValue })
      });
      if (!response.ok) throw new Error('Erro na comunicação com o Excel (502/400).');
      const data = await response.json();
      if (!data || data.length === 0) {
        setError(`Nenhum dado para ${activeTab}: ${searchValue}`);
      } else {
        setResults(data); 
      }
    } catch (err: any) {
      setError('Falha na busca. Verifique a conexão ou os nomes das colunas.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen pb-20 bg-slate-950 text-slate-100 font-sans">
      <header className="bg-slate-900/95 border-b border-slate-800 p-4 sticky top-0 z-30 backdrop-blur-md">
        <div className="flex justify-between items-center max-w-md mx-auto">
          <h1 className="text-xl font-black italic text-white uppercase tracking-tighter">Motor <span className="text-blue-500 not-italic">PCP</span></h1>
          <span className="text-[10px] text-emerald-500 font-bold border border-emerald-500/20 px-2 py-0.5 rounded">ONLINE</span>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4">
        {/* Menu de Filtros */}
        <div className="grid grid-cols-3 gap-2 mb-6">
          {filters.map((f) => (
            <button
              key={f.label}
              onClick={() => { setActiveTab(f.label); setResults([]); setError(''); }}
              className={`py-3 text-[9px] font-black rounded-xl border transition-all ${
                activeTab === f.label ? 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-900/40' : 'bg-slate-900 border-slate-800 text-slate-500'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Busca */}
        <form onSubmit={handleSearch} className="relative mb-6">
          <input
            type="text"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value.toUpperCase())}
            placeholder={`BUSCAR ${activeTab}...`}
            className="w-full bg-slate-900 border-2 border-slate-800 text-white text-lg font-bold rounded-2xl py-4 pl-6 pr-16 focus:border-blue-500 outline-none uppercase shadow-inner"
          />
          <button type="submit" disabled={isLoading} className="absolute right-2 top-2 bottom-2 aspect-square bg-blue-600 rounded-xl flex items-center justify-center">
            {isLoading ? <Loader2 className="animate-spin w-6 h-6" /> : <Search className="w-6 h-6" />}
          </button>
        </form>

        {error && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-500/30 rounded-2xl flex gap-3 items-center">
            <AlertCircle className="text-red-500 w-5 h-5" />
            <p className="text-xs font-bold text-red-400">{error}</p>
          </div>
        )}

        {/* Listagem de Cards */}
        <div className="space-y-6">
          {results.length > 0 && <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] ml-1">{results.length} registros encontrados</p>}
          
          {results.map((item, index) => (
            <div key={index} className="bg-slate-900 border border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl animate-in fade-in slide-in-from-bottom-4">
              
              {/* Header: Info Principal */}
              <div className="p-6 bg-gradient-to-br from-slate-900 to-slate-800 border-b border-slate-800">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">PN Individual</p>
                    <h2 className="text-2xl font-black text-white leading-none break-all">{item['PN IND.'] || 'S/N'}</h2>
                  </div>
                  <div className="bg-blue-600 p-3 rounded-2xl text-center min-w-[70px]">
                    <p className="text-[9px] font-black text-blue-100 uppercase leading-none mb-1">QTDI</p>
                    <p className="text-2xl font-black text-white">{item['QTDI'] || '0'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-1 rounded-lg font-bold">PROJ: {item['PROJETO']}</span>
                  <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-1 rounded-lg font-bold font-mono text-blue-400 uppercase">NEST: {item['NESTING'] || '---'}</span>
                </div>
              </div>

              {/* Grid Técnico */}
              <div className="p-6 grid grid-cols-2 gap-4">
                <div className="bg-slate-950/40 p-3 rounded-2xl border border-slate-800/50">
                  <div className="flex items-center gap-1.5 text-slate-600 mb-1"><Layers className="w-3 h-3"/><span className="text-[8px] font-black uppercase">Material</span></div>
                  <p className="text-xs font-bold text-slate-200">{item['MAT.'] || '-'}</p>
                </div>
                <div className="bg-slate-950/40 p-3 rounded-2xl border border-slate-800/50">
                  <div className="flex items-center gap-1.5 text-slate-600 mb-1"><Ruler className="w-3 h-3"/><span className="text-[8px] font-black uppercase">Espessura</span></div>
                  <p className="text-xs font-bold text-slate-200">{item['ESP.'] || '-'}</p>
                </div>
              </div>

              {/* Bloco de Processo */}
              <div className="px-6 pb-2">
                <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <Factory className="w-6 h-6 text-emerald-500" />
                    <div>
                      <p className="text-[8px] font-black text-emerald-600 uppercase tracking-widest leading-none mb-1">Próxima Etapa</p>
                      <p className="text-xl font-black text-emerald-400 uppercase leading-none">{item['PROC.'] || 'VER PCP'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Informações Adicionais (Datas e Refs) */}
              <div className="p-6 grid grid-cols-2 gap-y-4 gap-x-6 border-t border-slate-800/50 mt-4 bg-slate-950/30">
                <div className="flex items-start gap-2">
                  <Calendar className="w-3 h-3 text-slate-600 mt-0.5" />
                  <div>
                    <p className="text-[8px] font-black text-slate-600 uppercase">D. Corte</p>
                    <p className="text-[10px] font-bold text-slate-400">{item['D. CORTE'] || '-'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Hash className="w-3 h-3 text-slate-600 mt-0.5" />
                  <div>
                    <p className="text-[8px] font-black text-slate-600 uppercase">OP Ind.</p>
                    <p className="text-[10px] font-bold text-slate-400">{item['OP IND.'] || '-'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2 col-span-2">
                  <Info className="w-3 h-3 text-slate-600 mt-0.5" />
                  <div>
                    <p className="text-[8px] font-black text-slate-600 uppercase">Observações</p>
                    <p className="text-[10px] font-bold text-slate-400 leading-tight">{item['OBS'] || 'Sem observações cadastradas.'}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
