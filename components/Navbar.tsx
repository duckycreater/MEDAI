import React from 'react';
import { 
  Activity, 
  Home, 
  Settings, 
  LogOut, 
  Database,
  History,
  Globe
} from 'lucide-react';
import { AppView, Language } from '../types';
import { translations } from '../utils/translations';

interface NavbarProps {
  currentView: AppView;
  onChangeView: (view: AppView) => void;
  onLogout: () => void;
  language: Language;
  setLanguage: (lang: Language) => void;
}

const Navbar: React.FC<NavbarProps> = ({ currentView, onChangeView, onLogout, language, setLanguage }) => {
  const t = translations[language];
  
  const navItems = [
    { id: AppView.DASHBOARD, icon: Home, label: t.dashboard },
    { id: AppView.ANALYSIS, icon: Activity, label: t.analysis },
    { id: AppView.HISTORY, icon: History, label: t.history },
    { id: 'DATASET', icon: Database, label: t.datasets }, 
    { id: AppView.SETTINGS, icon: Settings, label: t.settings },
  ];

  return (
    <div className="w-72 bg-white border-r border-slate-100 h-screen flex flex-col shrink-0 transition-all duration-300 z-50">
      <div className="p-8 flex items-center gap-3 mb-2">
        <div className="w-10 h-10 bg-gradient-to-br from-medical-600 to-teal-500 rounded-xl flex items-center justify-center shadow-lg shadow-medical-500/30">
            <Activity size={24} className="text-white" strokeWidth={2.5} />
        </div>
        <div>
           <h1 className="text-xl font-extrabold text-black tracking-tight leading-none">MediDICOM</h1>
           <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase mt-1">AI Diagnostics</p>
        </div>
      </div>

      <div className="flex-1 px-4 space-y-1.5 overflow-y-auto">
        <p className="px-4 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-3 mt-4">Main Menu</p>
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => {
                if(Object.values(AppView).includes(item.id as AppView)) {
                    onChangeView(item.id as AppView)
                }
            }}
            className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl text-sm font-bold transition-all duration-200 group
              ${currentView === item.id 
                ? 'bg-slate-900 text-white shadow-xl shadow-slate-900/20' 
                : 'text-slate-500 hover:bg-slate-50 hover:text-black'
              }
            `}
          >
            <item.icon size={20} className={currentView === item.id ? 'text-medical-400' : 'text-slate-400 group-hover:text-black'} strokeWidth={2} />
            {item.label}
            {currentView === item.id && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-medical-400"></div>}
          </button>
        ))}
      </div>

      <div className="p-6 border-t border-slate-100 space-y-4 bg-slate-50/50">
        {/* Language Switcher */}
        <div className="flex items-center justify-between bg-white border border-slate-200 rounded-xl p-1.5 shadow-sm">
          <Globe size={16} className="text-slate-400 ml-2" />
          <div className="flex gap-1">
             <button 
                onClick={() => setLanguage('vi')}
                className={`text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all ${language === 'vi' ? 'bg-black text-white' : 'text-slate-500 hover:text-black'}`}
             >
                VN
             </button>
             <button 
                onClick={() => setLanguage('en')}
                className={`text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all ${language === 'en' ? 'bg-black text-white' : 'text-slate-500 hover:text-black'}`}
             >
                EN
             </button>
          </div>
        </div>

        <button 
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 text-slate-500 hover:text-red-600 hover:bg-red-50 px-4 py-3 rounded-xl text-sm font-bold transition-colors"
        >
          <LogOut size={18} />
          Sign Out
        </button>
      </div>
    </div>
  );
};

export default Navbar;