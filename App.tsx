import React, { useState, useEffect } from 'react';
import firebase from 'firebase/compat/app';
import { auth } from './firebaseConfig';
import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';
import AnalysisView from './components/AnalysisView';
import HistoryView from './components/HistoryView';
import SettingsView from './components/SettingsView';
import Auth from './components/Auth';
import MedicalChatbot from './components/MedicalChatbot';
import { AppView, Language, UserProfile, MedicalContext } from './types';
import { Activity } from 'lucide-react';
import { getUserProfile } from './services/databaseService';

const App: React.FC = () => {
  const [user, setUser] = useState<firebase.User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [currentView, setCurrentView] = useState<AppView>(AppView.DASHBOARD);
  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState<Language>('vi');

  // Global Context for the Chatbot
  const [medicalContext, setMedicalContext] = useState<MedicalContext>({
    activeView: AppView.DASHBOARD
  });

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
          const profile = await getUserProfile(currentUser.uid);
          if (profile) setUserProfile(profile);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Update context view whenever view changes
  useEffect(() => {
    setMedicalContext(prev => ({ ...prev, activeView: currentView }));
  }, [currentView]);

  const handleLogout = async () => {
    await auth.signOut();
    setUserProfile(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <div className="animate-spin text-medical-600 mb-4">
          <Activity size={48} />
        </div>
        <p className="text-slate-500 font-medium">Initializing MediDICOM Core...</p>
      </div>
    );
  }

  if (!user) {
    return <Auth onLoginSuccess={() => {}} />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 text-slate-900 font-sans">
      <Navbar 
        currentView={currentView} 
        onChangeView={setCurrentView} 
        onLogout={handleLogout}
        language={language}
        setLanguage={setLanguage}
      />
      
      <main className="flex-1 overflow-auto relative">
        {currentView === AppView.DASHBOARD && (
          <Dashboard 
            onNewAnalysis={() => setCurrentView(AppView.ANALYSIS)} 
            language={language}
            userProfile={userProfile}
          />
        )}
        
        {currentView === AppView.ANALYSIS && (
          <AnalysisView 
            onBack={() => setCurrentView(AppView.DASHBOARD)} 
            language={language} 
            // Callback to update global context when analysis is done
            onAnalysisComplete={(patient, diagnosis, treatment) => {
                setMedicalContext({
                    activeView: AppView.ANALYSIS,
                    patient,
                    diagnosis,
                    treatment
                });
            }}
          />
        )}

        {currentView === AppView.HISTORY && user && (
          <HistoryView userId={user.uid} language={language} />
        )}

        {currentView === AppView.SETTINGS && user && (
           <SettingsView 
             user={user} 
             language={language} 
             onProfileUpdate={setUserProfile}
           />
        )}
      </main>

      {/* Persistent Medical Copilot */}
      <MedicalChatbot context={medicalContext} />
    </div>
  );
};

export default App;