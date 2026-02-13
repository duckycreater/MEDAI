
import React, { useState, useEffect } from 'react';
import { 
  Upload, ZoomIn, Sun, Maximize, Cpu, 
  CheckCircle, AlertTriangle, Activity, 
  User, Pill, Stethoscope, ChevronRight,
  ClipboardList, ArrowLeft, Save, Layers, Scan, BrainCircuit,
  TrendingUp, Info, Syringe, Clock, ShieldCheck, AlertOctagon, HeartPulse
} from 'lucide-react';
import { analyzeImageWithGemini, consultClinicalAgent, generateTreatmentPlan } from '../services/aiService';
import { uploadMedicalImage, saveMedicalCase } from '../services/databaseService';
import { AnalysisResult, PatientIntake, TreatmentPlan, Language, ROIAnnotation } from '../types';
import { translations } from '../utils/translations';
import { auth } from '../firebaseConfig';
import ROIEditor from './ROIEditor';

interface AnalysisViewProps {
  onBack: () => void;
  language: Language;
  onAnalysisComplete?: (patient: PatientIntake, diagnosis: AnalysisResult, treatment?: TreatmentPlan) => void;
}

const AnalysisView: React.FC<AnalysisViewProps> = ({ onBack, language, onAnalysisComplete }) => {
  const t = translations[language];
  const [step, setStep] = useState<1|2|3|4>(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [patientData, setPatientData] = useState<PatientIntake>({
    name: '', age: '', gender: 'Male', chiefComplaint: '', history: '',
    vitals: { bp: '120/80', hr: '75', spO2: '98', temp: '36.5' }
  });

  const [file, setFile] = useState<File | null>(null);
  const [image, setImage] = useState<string | null>(null);
  
  // State for ROIs
  const [aiProposedRois, setAiProposedRois] = useState<ROIAnnotation[]>([]);
  const [doctorConfirmedRois, setDoctorConfirmedRois] = useState<ROIAnnotation[]>([]);

  const [diagnosis, setDiagnosis] = useState<AnalysisResult | null>(null);
  const [treatment, setTreatment] = useState<TreatmentPlan | null>(null);

  // Sync context when diagnosis or treatment updates
  useEffect(() => {
    if (diagnosis && onAnalysisComplete) {
        onAnalysisComplete(patientData, diagnosis, treatment || undefined);
    }
  }, [diagnosis, treatment]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onload = (event) => event.target?.result && setImage(event.target.result as string);
      reader.readAsDataURL(selectedFile);
    }
  };

  const executeDiagnosis = async () => {
    if (!image || !file) return;
    setIsProcessing(true);
    try {
      const visionPrompt = "Analyze this medical image strictly. Identify lesions, tumors, or abnormalities. Return technical findings.";
      const base64 = image.split(',')[1];
      
      // Pass the File object for Custom API and Base64 for Gemini
      const geminiFindings = await analyzeImageWithGemini(file, base64, visionPrompt);
      
      const result = await consultClinicalAgent(geminiFindings, {}, patientData, language);
      
      // Ensure arrays exist to prevent crashes
      const safeResult: AnalysisResult = {
        ...result,
        findings: result.findings || [],
        rois: result.rois || [],
        recommendations: result.recommendations || []
      };

      setDiagnosis(safeResult);
      setAiProposedRois(safeResult.rois);
      setStep(3);
    } catch (e: any) {
      console.error(e);
      alert("AI Diagnosis failed. Please try again or check connection.");
    } finally {
      setIsProcessing(false);
    }
  };

  const executeTreatment = async () => {
    if (!diagnosis) return;
    setIsProcessing(true);
    try {
      const plan = await generateTreatmentPlan(diagnosis.diagnosis, patientData, language);
      setTreatment(plan);
      setStep(4);
    } catch (e: any) {
      alert("Could not generate treatment protocol. " + e.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveRecord = async () => {
    if (!auth.currentUser || !diagnosis || !treatment || !image) return;
    setIsSaving(true);
    try {
        const imageUrl = await uploadMedicalImage(auth.currentUser.uid, image, 'xray');
        
        await saveMedicalCase({
            userId: auth.currentUser.uid,
            intake: patientData,
            analysis: diagnosis,
            treatment: treatment,
            imageUrl: imageUrl,
            aiProposedRois: aiProposedRois || [],
            doctorConfirmedRois: doctorConfirmedRois || []
        });
        alert(t.saveSuccess);
        onBack();
    } catch (error: any) {
        alert("Failed to save: " + error.message);
    } finally {
        setIsSaving(false);
    }
  };

  const ProgressBar = () => (
    <div className="flex items-center justify-between mb-8 px-4 md:px-10">
      {[
        { id: 1, label: t.stepIntake, icon: User },
        { id: 2, label: t.stepImaging, icon: Scan },
        { id: 3, label: t.stepDiagnosis, icon: BrainCircuit },
        { id: 4, label: t.stepTreatment, icon: Pill }
      ].map((s, idx) => (
        <React.Fragment key={s.id}>
          <div className={`flex flex-col items-center gap-2 z-10 transition-all duration-300 ${step >= s.id ? 'text-medical-600' : 'text-slate-400'}`}>
            <div className={`w-10 h-10 md:w-14 md:h-14 rounded-2xl flex items-center justify-center border-2 transition-all duration-500
              ${step >= s.id ? 'bg-white border-medical-500 shadow-lg shadow-medical-500/20 scale-110' : 'bg-slate-50 border-slate-200'}`}>
              <s.icon size={step >= s.id ? 24 : 20} strokeWidth={step >= s.id ? 2.5 : 2} />
            </div>
            <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider hidden md:block">{s.label}</span>
          </div>
          {idx < 3 && (
            <div className="flex-1 h-1 mx-4 bg-slate-200 relative rounded-full overflow-hidden">
               <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-medical-500 to-teal-400 transition-all duration-700 ease-out"
                 style={{ width: step > idx + 1 ? '100%' : step === idx + 1 ? '50%' : '0%' }}></div>
            </div>
          )}
        </React.Fragment>
      ))}
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-slate-50 overflow-hidden relative">
      {(isSaving) && (
        <div className="absolute inset-0 z-50 bg-white/80 backdrop-blur-md flex flex-col items-center justify-center">
            <div className="w-16 h-16 border-4 border-medical-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <h2 className="text-xl font-bold text-slate-800">{t.saving}</h2>
        </div>
      )}

      <div className="glass-panel px-6 py-4 flex justify-between items-center shadow-sm z-20 m-4 rounded-2xl border-white/50">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-medical-700 transition-colors group">
            <div className="p-2 rounded-full bg-slate-100 group-hover:bg-medical-100 transition-colors"><ArrowLeft size={18} /></div>
            <span className="text-sm font-bold">{t.back}</span>
          </button>
          <div className="h-8 w-px bg-slate-300"></div>
          <div>
             <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
               <ClipboardList className="text-medical-600" size={20}/>
               {t.analysis}
             </h2>
             <p className="text-xs text-slate-500 font-mono uppercase tracking-widest">HIPAA Compliant Session</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          <ProgressBar />

          {step === 1 && (
            <div className="glass-panel rounded-3xl p-8 animate-slide-up shadow-xl border-white/50">
              <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-3">
                <div className="p-3 bg-medical-100 text-medical-600 rounded-xl"><User size={24} /></div>
                {t.stepIntake}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-bold text-slate-600 mb-2">{t.patientName}</label>
                    <input type="text" className="w-full p-4 bg-white/50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-medical-500 outline-none transition-all shadow-sm" 
                      value={patientData.name} onChange={e => setPatientData({...patientData, name: e.target.value})} placeholder="Ex: Nguyen Van A" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-600 mb-2">{t.age}</label>
                      <input type="number" className="w-full p-4 bg-white/50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-medical-500 outline-none"
                        value={patientData.age} onChange={e => setPatientData({...patientData, age: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-600 mb-2">{t.gender}</label>
                      <select className="w-full p-4 bg-white/50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-medical-500 outline-none"
                        value={patientData.gender} onChange={e => setPatientData({...patientData, gender: e.target.value as any})}>
                        <option>Male</option>
                        <option>Female</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-600 mb-2">{t.complaint}</label>
                    <textarea className="w-full p-4 bg-white/50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-medical-500 outline-none h-32 shadow-sm resize-none"
                      value={patientData.chiefComplaint} onChange={e => setPatientData({...patientData, chiefComplaint: e.target.value})} placeholder="Symptoms..." />
                  </div>
                </div>
                <div className="space-y-6">
                   <div className="bg-white/60 p-6 rounded-2xl border border-white/50 shadow-sm">
                      <h4 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2"><Activity size={18} className="text-red-500" /> {t.vitals}</h4>
                      <div className="grid grid-cols-2 gap-4">
                        {['bp', 'hr', 'spO2', 'temp'].map((v) => (
                           <div key={v}>
                              <label className="text-xs font-bold text-slate-500 uppercase">{v}</label>
                              <input type="text" className="w-full mt-1 p-3 bg-white border border-slate-200 rounded-lg focus:border-medical-500 outline-none font-mono text-center"
                                value={(patientData.vitals as any)[v]} onChange={e => setPatientData({...patientData, vitals: {...patientData.vitals, [v]: e.target.value}})} />
                           </div>
                        ))}
                      </div>
                   </div>
                   <div>
                    <label className="block text-sm font-bold text-slate-600 mb-2">{t.medicalHistory}</label>
                    <textarea className="w-full p-4 bg-white/50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-medical-500 outline-none h-32 shadow-sm resize-none"
                      value={patientData.history} onChange={e => setPatientData({...patientData, history: e.target.value})} placeholder="History..." />
                  </div>
                </div>
              </div>
              <div className="mt-8 flex justify-end">
                <button onClick={() => setStep(2)} className="bg-medical-600 hover:bg-medical-700 text-white px-8 py-4 rounded-xl font-bold flex items-center gap-3 shadow-lg hover:scale-105 transition-all">
                  {t.next} <ChevronRight size={20} />
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
             <div className="h-[75vh] flex gap-6 animate-slide-up">
               {image ? (
                  <ROIEditor 
                    imageSrc={image} 
                    initialROIs={aiProposedRois} 
                    onConfirm={(confirmed) => {
                      setDoctorConfirmedRois(confirmed);
                      executeDiagnosis();
                    }}
                    language={language}
                  />
               ) : (
                  <div className="flex-1 glass-panel rounded-3xl flex flex-col items-center justify-center border-dashed border-2 border-slate-300 bg-slate-50/50">
                    <div className="w-20 h-20 bg-medical-100 text-medical-600 rounded-full flex items-center justify-center mb-4"><Upload size={32} /></div>
                    <h3 className="text-xl font-bold text-slate-800">Upload DICOM / Scan</h3>
                    <p className="text-slate-500 mb-6">X-Ray, CT, MRI supported</p>
                    <label className="bg-medical-600 hover:bg-medical-700 text-white px-8 py-3 rounded-xl cursor-pointer font-bold transition-all hover:scale-105">
                      Select Image
                      <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                    </label>
                  </div>
               )}
               {isProcessing && (
                  <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex flex-col items-center justify-center text-white">
                    <div className="w-16 h-16 border-4 border-medical-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p className="font-bold text-lg">AI Vision Agent analyzing pathologies...</p>
                    <p className="text-sm text-slate-300 mt-2">Running Hybrid Analysis (Specialized + Gemini Vision)...</p>
                  </div>
               )}
             </div>
          )}

          {step === 3 && diagnosis && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-slide-up pb-10">
               <div className="lg:col-span-2 space-y-6">
                  <div className="glass-panel p-8 rounded-3xl shadow-xl border-white relative overflow-hidden">
                     <div className="flex justify-between items-start mb-6">
                        <div>
                           <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2"><Stethoscope size={16} /> {t.diagnosis}</h3>
                           <h1 className="text-3xl font-extrabold text-slate-800 leading-tight">{diagnosis.diagnosis}</h1>
                        </div>
                        <div className="px-4 py-2 bg-green-100 text-green-700 rounded-xl text-sm font-bold border border-green-200">{diagnosis.confidence}% Confidence</div>
                     </div>

                     {/* Prognosis Dashboard */}
                     <div className="grid grid-cols-3 gap-4 mb-6">
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 relative overflow-hidden group">
                           <div className="absolute top-0 right-0 w-16 h-16 bg-red-100 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
                           <p className="text-[10px] font-bold text-slate-400 uppercase relative z-10">Recurrence Risk</p>
                           <p className={`text-2xl font-black relative z-10 ${ (diagnosis.prognosis?.recurrenceRisk || 0) > 50 ? 'text-red-600' : 'text-slate-800'}`}>
                             {diagnosis.prognosis?.recurrenceRisk ?? '--'}%
                           </p>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 relative overflow-hidden group">
                           <div className="absolute top-0 right-0 w-16 h-16 bg-blue-100 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
                           <p className="text-[10px] font-bold text-slate-400 uppercase relative z-10">5-Year Survival</p>
                           <p className="text-2xl font-black text-medical-600 relative z-10">
                             {diagnosis.prognosis?.mortality5Year ? (100 - diagnosis.prognosis.mortality5Year) : '--'}%
                           </p>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 relative overflow-hidden group">
                           <div className="absolute top-0 right-0 w-16 h-16 bg-teal-100 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
                           <p className="text-[10px] font-bold text-slate-400 uppercase relative z-10">PFS Estimate</p>
                           <p className="text-2xl font-black text-teal-600 relative z-10">{diagnosis.prognosis?.pfsMonths ?? '--'} mo</p>
                        </div>
                     </div>

                     <div className="bg-slate-50/50 rounded-2xl p-6 border border-slate-100"><p className="text-slate-700 leading-relaxed text-sm whitespace-pre-wrap font-medium">{diagnosis.reportText}</p></div>
                  </div>

                  <div className="glass-panel p-6 rounded-3xl shadow-lg border-white">
                     <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2 text-lg"><CheckCircle className="text-teal-500" size={24}/> {t.findings}</h3>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {(diagnosis.findings || []).length > 0 ? (
                           (diagnosis.findings || []).map((f, i) => (
                              <div key={i} className="flex gap-3 text-slate-700 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm items-start hover:shadow-md transition-shadow">
                                 <div className="w-2 h-2 rounded-full bg-teal-500 mt-2 shrink-0"></div>
                                 <span className="text-sm font-medium">{f}</span>
                              </div>
                           ))
                        ) : (
                           <p className="text-slate-400 italic col-span-2">No specific findings extracted.</p>
                        )}
                     </div>
                  </div>
               </div>

               <div className="space-y-6">
                  <div className="bg-gradient-to-br from-medical-50 to-blue-50 p-6 rounded-3xl border border-medical-100 shadow-lg">
                     <h3 className="font-bold text-medical-900 mb-4 flex items-center gap-2 text-lg"><div className="p-2 bg-medical-100 rounded-lg"><Info size={20} className="text-medical-600"/></div> Clinical Guidelines</h3>
                     <div className="bg-white/80 p-4 rounded-xl text-xs text-slate-600 font-medium italic border border-medical-200 leading-relaxed shadow-inner">
                       "{diagnosis.guidelines || 'Guideline reference unavailable.'}"
                     </div>
                     <div className="mt-4 flex items-center justify-between">
                        <p className="text-[10px] font-bold text-medical-500 uppercase">Standard</p>
                        <span className="px-2 py-1 bg-medical-200 text-medical-800 text-[10px] font-bold rounded-md">
                          {diagnosis.prognosis?.standardReference || 'N/A'}
                        </span>
                     </div>
                  </div>
                  <button onClick={executeTreatment} disabled={isProcessing} className="w-full bg-slate-900 hover:bg-slate-800 text-white py-5 rounded-2xl font-bold text-lg shadow-xl flex items-center justify-center gap-3 transition-all group active:scale-95">
                    {isProcessing ? 'Generating Protocol...' : <>{t.stepTreatment} <ChevronRight /></>}
                  </button>
               </div>
            </div>
          )}

          {step === 4 && treatment && (
            <div className="animate-slide-up pb-10">
               {/* Header Protocol Card */}
               <div className="glass-panel rounded-3xl shadow-2xl border-white overflow-hidden mb-6">
                  <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-8 text-white relative">
                     <div className="absolute top-0 right-0 p-8 opacity-10"><ClipboardList size={120} /></div>
                     <div className="relative z-10 flex flex-col md:flex-row md:justify-between md:items-end gap-4">
                       <div>
                          <div className="flex items-center gap-2 text-teal-400 font-bold uppercase tracking-wider text-xs mb-2">
                             <ShieldCheck size={14}/> Verified Protocol
                          </div>
                          <h2 className="text-3xl font-extrabold">{treatment.protocolName}</h2>
                          <p className="text-slate-400 mt-1 flex items-center gap-2"><TrendingUp size={16}/> {treatment.guidelineVersion}</p>
                       </div>
                       <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-lg border border-white/10">
                          <p className="text-xs text-slate-300 uppercase font-bold">Cycle Info</p>
                          <p className="text-lg font-mono font-bold">{treatment.cycleInfo}</p>
                       </div>
                     </div>
                  </div>
               </div>

               <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                  {/* Left Column: Medications */}
                  <div className="xl:col-span-2 space-y-6">
                     <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2"><Pill className="text-medical-600"/> Pharmacological Regimen</h3>
                     
                     <div className="space-y-4">
                        {(treatment.medications || []).map((med, i) => (
                           <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg transition-all group relative overflow-hidden">
                              {med.blackBoxWarning && (
                                <div className="absolute top-0 right-0 bg-red-600 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl shadow-lg z-10 flex items-center gap-1">
                                   <AlertOctagon size={12}/> BLACK BOX WARNING
                                </div>
                              )}
                              
                              <div className="flex flex-col md:flex-row gap-6 relative z-10">
                                 {/* Icon & Category */}
                                 <div className="flex flex-col items-center gap-2 shrink-0">
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white text-xl font-bold shadow-md
                                       ${med.category === 'Chemotherapy' ? 'bg-purple-600' : med.category === 'Immunotherapy' ? 'bg-blue-600' : 'bg-teal-500'}
                                    `}>
                                       {med.route.includes('IV') ? <Syringe size={24}/> : <Pill size={24}/>}
                                    </div>
                                    <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{med.category}</span>
                                 </div>

                                 {/* Details */}
                                 <div className="flex-1">
                                    <div className="flex flex-col mb-3">
                                       <h4 className="text-xl font-bold text-slate-800">{med.genericName} <span className="text-sm font-normal text-slate-500">({med.tradeNameExample})</span></h4>
                                       <div className="flex gap-4 mt-1 text-sm font-medium text-slate-600">
                                          <span className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded border border-slate-100"><Syringe size={14} className="text-blue-500"/> {med.dosage}</span>
                                          <span className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded border border-slate-100"><Clock size={14} className="text-orange-500"/> {med.frequency}</span>
                                          <span className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded border border-slate-100"><Activity size={14} className="text-green-500"/> {med.route}</span>
                                       </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                                       <div>
                                          <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Mechanism of Action</p>
                                          <p className="text-xs text-slate-700 leading-relaxed">{med.mechanism}</p>
                                       </div>
                                       <div>
                                          <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Common Side Effects</p>
                                          <div className="flex flex-wrap gap-1">
                                             {med.sideEffects.map((se, idx) => (
                                                <span key={idx} className="text-[10px] bg-white border border-slate-200 px-1.5 py-0.5 rounded text-slate-600">{se}</span>
                                             ))}
                                          </div>
                                       </div>
                                    </div>

                                    {med.blackBoxWarning && (
                                       <div className="mt-3 bg-red-50 border border-red-100 p-3 rounded-lg flex gap-3 items-start">
                                          <AlertOctagon className="text-red-600 shrink-0 mt-0.5" size={16}/>
                                          <p className="text-xs text-red-700 font-medium"><strong>Critical Alert:</strong> {med.blackBoxWarning}</p>
                                       </div>
                                    )}
                                 </div>
                              </div>
                           </div>
                        ))}
                     </div>
                  </div>

                  {/* Right Column: Safety & Lifestyle */}
                  <div className="space-y-6">
                     {/* Safety Analysis Card */}
                     <div className={`p-6 rounded-2xl border shadow-lg ${treatment.safetyAnalysis?.isSafe ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200' : 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200'}`}>
                        <h3 className={`text-lg font-bold mb-4 flex items-center gap-2 ${treatment.safetyAnalysis?.isSafe ? 'text-green-800' : 'text-amber-800'}`}>
                           {treatment.safetyAnalysis?.isSafe ? <ShieldCheck size={24}/> : <AlertTriangle size={24}/>}
                           Safety Analysis
                        </h3>
                        
                        <div className="space-y-3">
                           {treatment.safetyAnalysis?.alerts.map((alert, idx) => (
                              <div key={idx} className="bg-white/60 backdrop-blur-sm p-3 rounded-xl border border-white/50 flex gap-3 items-start">
                                 <div className={`p-1.5 rounded-full mt-0.5 shrink-0 ${alert.severity === 'high' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
                                    {alert.type === 'Vitals' ? <HeartPulse size={14}/> : <Activity size={14}/>}
                                 </div>
                                 <div>
                                    <p className="text-xs font-bold uppercase tracking-wide opacity-70">{alert.type} Alert</p>
                                    <p className="text-sm font-medium leading-tight">{alert.message}</p>
                                 </div>
                              </div>
                           ))}
                           {treatment.safetyAnalysis?.alerts.length === 0 && (
                              <div className="text-center py-4">
                                 <p className="text-sm text-green-700 font-medium">No contraindications detected based on current vitals.</p>
                              </div>
                           )}
                           
                           {treatment.safetyAnalysis?.renalAdjustmentNeeded && (
                              <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 text-blue-800 text-xs font-bold flex items-center justify-center gap-2">
                                 <Info size={14}/> Renal Dosage Adjustment Required
                              </div>
                           )}
                        </div>
                     </div>

                     {/* Lifestyle & Followup */}
                     <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><Activity className="text-medical-600"/> Lifestyle & Monitoring</h3>
                        <ul className="space-y-3">
                           {treatment.lifestyle.map((l, i) => (
                              <li key={i} className="flex gap-3 text-sm text-slate-600 items-start">
                                 <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 shrink-0 mt-0.5 text-xs font-bold">{i+1}</div>
                                 <span className="leading-relaxed">{l}</span>
                              </li>
                           ))}
                        </ul>
                        <div className="mt-6 pt-6 border-t border-slate-100">
                           <p className="text-xs font-bold text-slate-400 uppercase mb-1">Follow Up Plan</p>
                           <p className="text-sm font-bold text-medical-700 bg-medical-50 p-3 rounded-xl border border-medical-100">
                              {treatment.followUp}
                           </p>
                        </div>
                     </div>

                     <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 flex flex-col gap-3">
                        <button onClick={() => setStep(1)} className="w-full py-3 text-slate-600 font-bold hover:bg-slate-200 rounded-xl transition-colors text-sm">Create New Case</button>
                        <button onClick={handleSaveRecord} disabled={isSaving} className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl shadow-lg hover:bg-slate-800 flex items-center justify-center gap-2 transition-all disabled:opacity-50">
                           <Save size={18} /> {isSaving ? 'Saving...' : t.save}
                        </button>
                     </div>
                  </div>
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnalysisView;
