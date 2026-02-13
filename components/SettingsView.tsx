import React, { useState, useEffect } from 'react';
import firebase from 'firebase/compat/app';
import { UserProfile, Language } from '../types';
import { saveUserProfile, getUserProfile } from '../services/databaseService';
import { translations } from '../utils/translations';
import { Save, User as UserIcon, Building, Stethoscope, Check } from 'lucide-react';

interface SettingsViewProps {
  user: firebase.User;
  language: Language;
  onProfileUpdate: (profile: UserProfile) => void;
}

const SettingsView: React.FC<SettingsViewProps> = ({ user, language, onProfileUpdate }) => {
  const t = translations[language];
  const [profile, setProfile] = useState<UserProfile>({
    uid: user.uid,
    displayName: user.displayName || '',
    email: user.email || '',
    hospitalName: '',
    specialty: '',
    themePref: 'light'
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      const existing = await getUserProfile(user.uid);
      if (existing) {
        setProfile(existing);
        onProfileUpdate(existing);
      }
    };
    loadData();
  }, [user.uid]);

  const handleSave = async () => {
    setLoading(true);
    setSuccess(false);
    try {
      await saveUserProfile(profile);
      onProfileUpdate(profile);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e) {
      alert("Failed to save profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto glass-panel p-8 rounded-3xl shadow-xl border-white">
        <div className="flex items-center gap-4 mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-medical-500 to-teal-400 rounded-2xl flex items-center justify-center text-white shadow-lg">
                <UserIcon size={32} />
            </div>
            <div>
                <h2 className="text-2xl font-bold text-slate-800">{t.profile}</h2>
                <p className="text-slate-500">{t.updateProfile}</p>
            </div>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div>
               <label className="block text-sm font-bold text-slate-600 mb-2">Display Name</label>
               <div className="relative">
                 <UserIcon size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                 <input 
                    type="text" 
                    className="w-full pl-10 pr-4 py-3 bg-white/60 border border-slate-200 rounded-xl focus:ring-2 focus:ring-medical-500 outline-none transition-all"
                    value={profile.displayName}
                    onChange={(e) => setProfile({...profile, displayName: e.target.value})}
                 />
               </div>
             </div>
             <div>
               <label className="block text-sm font-bold text-slate-600 mb-2">Email (Read Only)</label>
               <input 
                  type="text" 
                  disabled
                  className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 cursor-not-allowed"
                  value={profile.email}
               />
             </div>
          </div>

          <div>
             <label className="block text-sm font-bold text-slate-600 mb-2">{t.hospitalName}</label>
             <div className="relative">
               <Building size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
               <input 
                  type="text" 
                  className="w-full pl-10 pr-4 py-3 bg-white/60 border border-slate-200 rounded-xl focus:ring-2 focus:ring-medical-500 outline-none transition-all"
                  value={profile.hospitalName}
                  onChange={(e) => setProfile({...profile, hospitalName: e.target.value})}
                  placeholder="e.g. Cho Ray Hospital"
               />
             </div>
          </div>

          <div>
             <label className="block text-sm font-bold text-slate-600 mb-2">{t.specialty}</label>
             <div className="relative">
               <Stethoscope size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
               <input 
                  type="text" 
                  className="w-full pl-10 pr-4 py-3 bg-white/60 border border-slate-200 rounded-xl focus:ring-2 focus:ring-medical-500 outline-none transition-all"
                  value={profile.specialty}
                  onChange={(e) => setProfile({...profile, specialty: e.target.value})}
                  placeholder="e.g. Diagnostic Radiology"
               />
             </div>
          </div>

          <div className="pt-6 border-t border-slate-200 flex items-center justify-end gap-4">
             {success && (
                <span className="text-green-600 font-bold flex items-center gap-2 animate-fade-in">
                    <Check size={18} /> Saved
                </span>
             )}
             <button 
                onClick={handleSave}
                disabled={loading}
                className="bg-medical-600 hover:bg-medical-700 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-medical-500/30 transition-all active:scale-95 disabled:opacity-70"
             >
                {loading ? 'Saving...' : <><Save size={18} /> Save Changes</>}
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsView;