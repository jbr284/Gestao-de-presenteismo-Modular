import React, { useState } from 'react';
import { initializeApp } from "firebase/app";
import { getFirestore, collection, query, where, getDocs } from "firebase/firestore";
import { Search, Box, Layers, Factory, Ruler, AlertCircle, Loader2, Calendar, Hash, Info, ClipboardList } from 'lucide-react';

// Suas configurações do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAFTsYMyUdAiL5RpyZiP-Wy6cOfaIASky4",
  authDomain: "pesquisa-de-cortes-laser-serra.firebaseapp.com",
  projectId: "pesquisa-de-cortes-laser-serra",
  storageBucket: "pesquisa-de-cortes-laser-serra.firebasestorage.app",
  messagingSenderId: "1057192314490",
  appId: "1:1057192314490:web:8cff2aadd538d7ff291dc3"
};

// Inicializa Firebase e Firestore
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export default function App() {
  const [activeTab, setActiveTab] = useState('PN IND.'); 
  const [searchValue, setSearchValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState<any[]>([]);

  const filters = [
    { label: 'PN IND.', column: 'PN_IND' },
    { label: 'PN CONJ.', column: 'CONJUNTO' },
    { label: 'OP IND.', column: 'OP_IND' },
    { label: 'OP CONJ.', column: 'OP_CONJ' },
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
      // BUSCA DIRETA NO FIRESTORE (Alta Velocidade)
      const q = query(collection(db, "producao"), where(selectedColumn, "==", searchValue));
      const querySnapshot = await getDocs(q);
      
      const docs = querySnapshot.docs.map(doc => doc.data());

      if (docs.length === 0) {
        setError(`Nenhum registro para ${activeTab}: ${searchValue}`);
      } else {
        setResults(docs); 
      }
    } catch (err: any) {
      console.error(err);
      setError('Erro ao acessar o banco de dados. Verifique as regras de segurança do Firestore.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen pb-20 bg-slate-950 text-slate-100 font-sans">
      <header className="bg-slate-900/95 border-b border-slate-800 p-4 sticky top-0 z-30 backdrop-blur-md">
        <div className="flex justify-between items-center max-w-md mx-auto">
          <h1 className="text-xl font-black italic text-white tracking-tighter uppercase">Motor <span className="text-orange-500 not-italic">FIRE</span></h1>
          <span className="text-[10px] text-emerald-500 font-bold border border-emerald-500/20 px-2 py-0.5 rounded tracking-widest">FIREBASE CLOUD</span>
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
                activeTab === f.label ? 'bg-orange-600 border-orange-400 text-white shadow-lg shadow-orange-900/40' : 'bg-slate-900 border-slate-800 text-slate-500'
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
            className="w-full bg-slate-900 border-2 border-slate-800 text-white text-lg font-bold rounded-2xl py-4 pl-6 pr-16 focus:border-orange-500 outline-none uppercase shadow-inner"
          />
          <button type="submit" disabled={isLoading} className="absolute right-2 top-2 bottom-2 aspect-square bg-orange-600 rounded-xl flex items-center justify-center">
            {isLoading ? <Loader2 className="animate-spin w-6 h-6" /> : <Search className="w-6 h-6" />}
          </button>
        </form>

        {error && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-500/30 rounded-2xl flex gap-3 items-center">
            <AlertCircle className="text-red-500 w-5 h-5" />
            <p className="text-xs font-bold text-red-400">{error}</p>
          </div>
        )}

        {/* Lista de Resultados (Cards) */}
        <div className="space-y-6">
          {results.length > 0 && <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] ml-1">{results.length} registros no servidor</p>}
          
          {results.map((item, index) => (
            <div key={index} className="bg-slate-900 border border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl animate-in fade-in slide-in-from-bottom-4">
              <div className="p-6 bg-gradient-to-br from-slate-900 to-slate-800 border-b border-slate-800">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-1">PN Identificado</p>
                    <h2 className="text-2xl font-black text-white leading-none break-all">{item['PN_IND'] || 'S/N'}</h2>
                  </div>
                  <div className="bg-orange-600 p-3 rounded-2xl text-center min-w-[70px]">
                    <p className="text-[9px] font-black text-orange-100 uppercase mb-1">QTDI</p>
                    <p className="text-2xl font-black text-white">{item['QTDI'] || '0'}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="text-[9px] bg-slate-800 text-slate-400 px-2 py-1 rounded-lg font-bold">PROJ: {item['PROJETO']}</span>
                  <span className="text-[9px] bg-slate-800 text-blue-400 px-2 py-1 rounded-lg font-bold uppercase tracking-tighter">NEST: {item['NESTING'] || '---'}</span>
                </div>
              </div>

              <div className="p-6 grid grid-cols-2 gap-4 bg-slate-950/20">
                <div className="p-3 bg-slate-900 rounded-2xl border border-slate-800/50">
                  <div className="flex items-center gap-1.5 text-slate-600 mb-1"><Layers className="w-3 h-3"/><span className="text-[8px] font-black uppercase">Material</span></div>
                  <p className="text-xs font-bold text-slate-200">{item['MAT'] || '-'}</p>
                </div>
                <div className="p-3 bg-slate-900 rounded-2xl border border-slate-800/50">
                  <div className="flex items-center gap-1.5 text-slate-600 mb-1"><Ruler className="w-3 h-3"/><span className="text-[8px] font-black uppercase">Espessura</span></div>
                  <p className="text-xs font-bold text-slate-200">{item['ESP'] || '-'}</p>
                </div>
              </div>

              <div className="px-6 pb-6">
                <div className="bg-emerald-500/10 border border-emerald-500/20 p-5 rounded-3xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Factory className="w-6 h-6 text-emerald-500" />
                    <div>
                      <p className="text-[8px] font-black text-emerald-700 uppercase leading-none mb-1 tracking-widest">Processo Atual</p>
                      <p className="text-2xl font-black text-emerald-400 uppercase leading-none">{item['PROC'] || 'PENDENTE'}</p>
                    </div>
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
