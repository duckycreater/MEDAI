import React, { useEffect, useState } from 'react';
import { Users, Activity, FileText, Clock, TrendingUp, AlertCircle, ArrowUpRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Language, UserProfile } from '../types';
import { translations } from '../utils/translations';
import { getDashboardStats } from '../services/databaseService';
import { auth } from '../firebaseConfig';

interface DashboardProps {
  onNewAnalysis: () => void;
  language: Language;
  userProfile: UserProfile | null;
}

const chartData = [
  { name: 'Mon', cases: 8 }, { name: 'Tue', cases: 12 }, { name: 'Wed', cases: 10 },
  { name: 'Thu', cases: 15 }, { name: 'Fri', cases: 20 }, { name: 'Sat', cases: 5 }, { name: 'Sun', cases: 3 },
];

const Dashboard: React.FC<DashboardProps> = ({ onNewAnalysis, language, userProfile }) => {
  const t = translations[language];
  const [stats, setStats] = useState({ totalCases: 0, criticalCount: 0, avgTime: "0s" });

  useEffect(() => {
    const loadStats = async () => {
        if(auth.currentUser) {
            const s = await getDashboardStats(auth.currentUser.uid);
            setStats(s);
        }
    }
    loadStats();
  }, []);

  return (
    <div className="p-8 space-y-8 min-h-full overflow-y-auto">
      {/* Header */}
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-extrabold text-black tracking-tight mb-2">{t.dashboard}</h1>
          <p className="text-slate-500 font-medium text-lg">{t.welcome}, <span className="text-black font-bold">{userProfile?.displayName || 'Dr. Minh Duc'}</span></p>
        </div>
        <button 
          onClick={onNewAnalysis}
          className="bg-black hover:bg-slate-800 text-white px-8 py-4 rounded-2xl shadow-xl shadow-slate-900/20 transition-all flex items-center gap-3 font-bold text-sm transform hover:-translate-y-1 active:scale-95 group"
        >
          <Activity size={20} className="text-medical-400 group-hover:text-white transition-colors" />
          {t.newAnalysis}
        </button>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: t.totalCases, val: stats.totalCases.toString(), icon: FileText, color: 'blue', sub: '+12% from last week' },
          { label: t.criticalAlerts, val: stats.criticalCount.toString(), icon: AlertCircle, color: 'red', sub: 'Requires attention' },
          { label: t.avgTime, val: stats.avgTime, icon: Clock, color: 'purple', sub: 'Optimal performance' },
          { label: t.activePatients, val: (stats.totalCases > 0 ? Math.floor(stats.totalCases * 0.8) : 0).toString(), icon: Users, color: 'teal', sub: 'Currently admitted' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:shadow-xl hover:border-slate-200 transition-all relative overflow-hidden group">
            <div className={`absolute top-0 right-0 p-16 opacity-5 bg-${stat.color}-500 rounded-bl-full transition-transform group-hover:scale-110`}></div>
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-4">
                <div className={`p-3 bg-${stat.color}-50 text-${stat.color}-600 rounded-2xl`}>
                    <stat.icon size={24} />
                </div>
                {stat.label === t.totalCases && <div className="flex items-center text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full"><ArrowUpRight size={12} className="mr-1"/> 12%</div>}
              </div>
              
              <h3 className="text-4xl font-black text-black mb-1">{stat.val}</h3>
              <p className="text-sm font-bold text-slate-500">{stat.label}</p>
              <p className="text-xs text-slate-400 mt-2 font-medium">{stat.sub}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Chart */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 lg:col-span-2">
          <div className="flex items-center justify-between mb-8">
             <h3 className="text-xl font-bold text-black flex items-center gap-3">
                <div className="p-2 bg-slate-100 rounded-xl"><TrendingUp size={20} className="text-black" /></div>
                Analytics Overview
             </h3>
             <select className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold text-slate-600 outline-none focus:ring-2 focus:ring-black/5">
                <option>This Week</option>
                <option>This Month</option>
             </select>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12, fontWeight: 600}} dy={15} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <Tooltip 
                  cursor={{fill: '#f8fafc'}} 
                  contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '12px 16px'}} 
                  itemStyle={{color: '#000', fontWeight: 'bold'}}
                  labelStyle={{color: '#94a3b8', marginBottom: '4px', fontSize: '12px'}}
                />
                <Bar dataKey="cases" fill="#0f172a" radius={[8, 8, 8, 8]} barSize={40} activeBar={{fill: '#0ea5e9'}} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Action Panel */}
        <div className="bg-slate-900 p-8 rounded-3xl shadow-xl text-white relative overflow-hidden flex flex-col">
          <div className="absolute top-0 right-0 w-80 h-80 bg-medical-500 rounded-full blur-[120px] opacity-20"></div>
          <div className="absolute bottom-0 left-0 w-60 h-60 bg-teal-500 rounded-full blur-[100px] opacity-20"></div>
          
          <h3 className="text-2xl font-bold mb-6 relative z-10">Quick Actions</h3>
          
          <div className="space-y-4 relative z-10 flex-1">
            <button onClick={onNewAnalysis} className="w-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 p-5 rounded-2xl flex items-center gap-5 transition-all group">
                <div className="p-3 bg-teal-500 rounded-xl group-hover:scale-110 transition-transform shadow-lg shadow-teal-900/50"><Activity size={24} className="text-white" /></div>
                <div className="text-left">
                    <p className="font-bold text-lg">Start Diagnosis</p>
                    <p className="text-xs text-slate-300 font-medium">Upload scan & analyze</p>
                </div>
                <ArrowUpRight className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
            <button className="w-full bg-white/5 hover:bg-white/10 backdrop-blur-md border border-white/5 p-5 rounded-2xl flex items-center gap-5 transition-all group">
                <div className="p-3 bg-blue-600 rounded-xl group-hover:scale-110 transition-transform shadow-lg shadow-blue-900/50"><Users size={24} className="text-white" /></div>
                <div className="text-left">
                    <p className="font-bold text-lg">Patient Directory</p>
                    <p className="text-xs text-slate-300 font-medium">Access records</p>
                </div>
            </button>
          </div>

          <div className="mt-8 pt-6 border-t border-white/10 relative z-10">
             <div className="flex items-center justify-between text-xs font-medium text-slate-400">
                <span>System Status</span>
                <span className="flex items-center gap-2 text-green-400"><span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span> Operational</span>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;