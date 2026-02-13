
import React, { useEffect, useState } from 'react';
import { getUserCases } from '../services/databaseService';
import { FullCaseRecord, Language } from '../types';
import { translations } from '../utils/translations';
import { Search, Calendar, User, FileText, ChevronRight, AlertCircle } from 'lucide-react';

interface HistoryViewProps {
  userId: string;
  language: Language;
}

const HistoryView: React.FC<HistoryViewProps> = ({ userId, language }) => {
  const t = translations[language];
  const [cases, setCases] = useState<FullCaseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCase, setSelectedCase] = useState<FullCaseRecord | null>(null);

  useEffect(() => {
    const fetch = async () => {
      try {
        const data = await getUserCases(userId);
        setCases(data || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [userId]);

  const filteredCases = (cases || []).filter(c => 
    (c.intake?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (c.analysis?.diagnosis || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
     return <div className="flex h-full items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-medical-500 border-t-transparent rounded-full"></div></div>;
  }

  // Render detail view if a case is selected
  if (selectedCase) {
    return (
        <div className="p-8 h-full overflow-y-auto animate-fade-in">
            <button onClick={() => setSelectedCase(null)} className="mb-4 text-slate-500 hover:text-medical-600 font-bold flex items-center gap-2">
                 ← Back to History
            </button>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="glass-panel p-6 rounded-3xl">
                     <h2 className="text-2xl font-bold text-slate-800 mb-4">{selectedCase.intake.name}</h2>
                     <div className="space-y-2 mb-6">
                        <p className="text-slate-600"><span className="font-bold">Date:</span> {selectedCase.timestamp ? new Date(selectedCase.timestamp.seconds * 1000).toLocaleDateString() : 'N/A'}</p>
                        <p className="text-slate-600"><span className="font-bold">Age/Gender:</span> {selectedCase.intake.age} / {selectedCase.intake.gender}</p>
                        <p className="text-slate-600"><span className="font-bold">Complaint:</span> {selectedCase.intake.chiefComplaint}</p>
                     </div>
                     <div className="bg-black rounded-xl overflow-hidden shadow-lg border border-slate-600 flex justify-center group relative">
                        <img src={selectedCase.imageUrl} alt="Scan" className="max-h-96 object-contain" />
                        <div className="absolute bottom-0 left-0 w-full bg-black/60 p-2 text-white text-xs text-center backdrop-blur-sm">
                             {selectedCase.doctorConfirmedRois?.length || 0} Annotated Regions
                        </div>
                     </div>
                </div>
                <div className="space-y-6">
                    <div className="glass-panel p-6 rounded-3xl border-l-4 border-medical-500">
                        <h3 className="text-xl font-bold text-slate-800 mb-2">{t.diagnosis}</h3>
                        <p className="text-lg text-slate-700 font-medium">{selectedCase.analysis.diagnosis}</p>
                        <p className="text-sm text-slate-500 mt-2 whitespace-pre-wrap">{selectedCase.analysis.reportText}</p>
                        
                        <div className="mt-4 flex gap-4">
                           <div className="bg-red-50 text-red-700 px-3 py-1 rounded-lg text-xs font-bold border border-red-100 flex items-center gap-1">
                              <AlertCircle size={12}/>
                              Risk: {selectedCase.analysis.prognosis?.recurrenceRisk ?? '--'}%
                           </div>
                           <div className="bg-teal-50 text-teal-700 px-3 py-1 rounded-lg text-xs font-bold border border-teal-100">
                              5Y Survival: {selectedCase.analysis.prognosis?.mortality5Year ? (100 - selectedCase.analysis.prognosis.mortality5Year) : '--'}%
                           </div>
                        </div>
                    </div>
                    <div className="glass-panel p-6 rounded-3xl border-l-4 border-teal-500">
                        <h3 className="text-xl font-bold text-slate-800 mb-2">{t.treatment}</h3>
                        <p className="font-bold text-teal-700">{selectedCase.treatment?.protocolName}</p>
                        <ul className="mt-2 list-disc pl-4 text-slate-600 space-y-1">
                            {/* Defensive check for medications */}
                            {(selectedCase.treatment?.medications || []).map((m, i) => (
                                <li key={i}>{m.genericName} - {m.dosage}</li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    )
  }

  return (
    <div className="p-8 h-full flex flex-col">
      <div className="flex justify-between items-center mb-8">
        <div>
           <h2 className="text-2xl font-bold text-slate-800">{t.history}</h2>
           <p className="text-slate-500">{cases.length} {t.totalCases}</p>
        </div>
        <div className="relative">
           <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
           <input 
             type="text" 
             placeholder={t.search} 
             className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-medical-500 outline-none shadow-sm"
             value={searchTerm}
             onChange={(e) => setSearchTerm(e.target.value)}
           />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-2">
         {filteredCases.length === 0 ? (
            <div className="text-center py-20 text-slate-400">
                <FileText size={48} className="mx-auto mb-4 opacity-50" />
                <p>{t.noCases}</p>
            </div>
         ) : (
            <div className="grid gap-4">
                {filteredCases.map((c) => (
                    <div 
                      key={c.id} 
                      onClick={() => setSelectedCase(c)}
                      className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md hover:border-medical-200 transition-all cursor-pointer flex items-center gap-6 group"
                    >
                        <div className="w-16 h-16 bg-slate-100 rounded-xl flex items-center justify-center overflow-hidden shrink-0">
                            {c.imageUrl ? (
                                <img src={c.imageUrl} className="w-full h-full object-cover" />
                            ) : <User size={24} className="text-slate-400" />}
                        </div>
                        <div className="flex-1">
                            <h4 className="font-bold text-slate-800 text-lg group-hover:text-medical-600 transition-colors">{c.intake.name}</h4>
                            <p className="text-sm text-slate-500 flex gap-4">
                                <span className="flex items-center gap-1"><Calendar size={14}/> {c.timestamp ? new Date(c.timestamp.seconds * 1000).toLocaleDateString() : 'N/A'}</span>
                                <span className="flex items-center gap-1"><User size={14}/> {c.intake.age} / {c.intake.gender}</span>
                            </p>
                        </div>
                        <div className="text-right">
                             <span className="inline-block px-3 py-1 bg-medical-50 text-medical-700 rounded-lg text-sm font-bold border border-medical-100 mb-1">
                                {c.analysis.confidence}% Conf.
                             </span>
                             <p className="text-xs text-slate-400 max-w-[200px] truncate">{c.analysis.diagnosis}</p>
                        </div>
                        <ChevronRight className="text-slate-300 group-hover:text-medical-500" />
                    </div>
                ))}
            </div>
         )}
      </div>
    </div>
  );
};

export default HistoryView;
