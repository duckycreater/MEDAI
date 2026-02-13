import { GoogleGenAI } from "@google/genai";
import { AnalysisResult, PatientIntake, TreatmentPlan, ROIAnnotation, MedicalContext } from "../types";

// Keep Google Generative AI for Vision (handles Blobs/Images natively and reliably)
const genAI = new GoogleGenAI(import.meta.env.VITE_GEMINI_API_KEY);
const GROQ_API_URL = 'https://api.groq.com/openai/v1';
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const GROQ_MODEL = 'llama-3.1-70b-versatile';
const HF_MODEL = import.meta.env.VITE_HF_MODEL || 'Qwen/Qwen2.5-7B-Instruct';
const HF_API_URL = `https://api-inference.huggingface.co/models/${HF_MODEL}`;
const HF_API_KEY = import.meta.env.VITE_HF_API_KEY;
const CUSTOM_API_URL = import.meta.env.VITE_CUSTOM_API_URL || "https://unmalicious-tamra-charmlessly.ngrok-free.dev/infer";

// Helper to clean AI JSON output which often includes markdown code blocks
const cleanJsonOutput = (text: string): string => {
  if (!text) return "{}";
  let cleaned = text.trim();

  // 1. Try to extract from markdown code blocks first (most reliable)
  // Matches ```json [content] ``` or ``` [content] ```
  const codeBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/i;
  const match = cleaned.match(codeBlockRegex);
  if (match && match[1]) {
    return match[1].trim();
  }

  // 2. If no code block, try to find the outermost JSON object
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return cleaned.substring(firstBrace, lastBrace + 1);
  }

  // 3. Fallback: return as is (might fail if dirty)
  return cleaned;
};

// 0. CUSTOM API: Call the specialized medical model
export const callCustomMedicalAI = async (file: File): Promise<any> => {
  const formData = new FormData();
  formData.append("file", file);
  try {
    const res = await fetch(CUSTOM_API_URL, {
        method: "POST",
        body: formData
    });
    
    if (!res.ok) {
        console.warn(`Custom API Error: ${res.status} ${res.statusText}`);
        return null;
    }
    
    const data = await res.json();
    return data;
  } catch(e) {
    console.warn("Custom Medical API unavailable:", e);
    return null; // Fail gracefully, don't block the main workflow
  }
};

// 1. VISION ANALYSIS: Hybrid (Gemini 1.5 Flash + Custom API Data)
export const analyzeImageWithGemini = async (file: File, base64Image: string, prompt: string): Promise<string> => {
  try {
    // Step A: Get data from the specialized custom model
    let specializedData = null;
    try {
        specializedData = await callCustomMedicalAI(file);
    } catch (e) {
        console.warn("Skipping custom model due to error");
    }

    // Step B: Augment the prompt with the specialized data
    const hybridPrompt = `
      ${prompt}

      [SPECIALIZED MODEL FINDINGS]
      A specialized medical AI model has already processed this image and returned the following raw data:
      ${specializedData ? JSON.stringify(specializedData, null, 2) : "No specialized data available."}

      INSTRUCTIONS:
      1. Review the image visually yourself (Gemini Vision).
      2. Cross-reference with the [SPECIALIZED MODEL FINDINGS] above.
      3. If the specialized model suggests a lesion/finding, verify it in the image.
      4. Return a cohesive technical analysis combining both sources.
    `;

    // Step C: Execute Gemini Vision Analysis
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash-latest',
      generationConfig: {
        temperature: 0.2,
        topK: 40
      }
    });
    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: 'image/png',
          data: base64Image
        }
      },
      {
        text: hybridPrompt
      }
    ]);
    return result.response.text() || "";
  } catch (error) {
    console.error("Gemini Vision Error:", error);
    return "Visual analysis currently unavailable due to network constraints.";
  }
};

// Helper function for Hugging Face API calls using fetch
const callHFApi = async (prompt: string, parameters: any = {}) => {
  try {
    const response = await fetch(HF_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${HF_API_KEY}`,
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          ...parameters,
          return_full_text: false,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`HF API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data[0]?.generated_text || '';
  } catch (error) {
    console.error("HF API Call Error:", error);
    throw error;
  }
};

// Helper function for Groq API calls (fallback)
const callGroqApi = async (prompt: string, parameters: any = {}) => {
  try {
    const maxTokens = parameters.max_new_tokens || parameters.max_tokens || 2048;
    const response = await fetch(`${GROQ_API_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: parameters.temperature || 0.1,
        max_tokens: maxTokens,
      }),
    });

    if (!response.ok) {
      throw new Error(`Groq API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '';
  } catch (error) {
    console.error("Groq API Call Error:", error);
    throw error;
  }
};

// Helper to call API with failover (HF first, then Groq)
const callApiWithFailover = async (prompt: string, parameters: any = {}) => {
  try {
    return await callHFApi(prompt, parameters);
  } catch (hfError) {
    console.warn("HF failed, falling back to Groq:", hfError);
    try {
      return await callGroqApi(prompt, parameters);
    } catch (groqError) {
      console.error("Both HF and Groq failed:", groqError);
      throw new Error("All API backends unavailable.");
    }
  }
};

// 2. CLINICAL REASONING: Integrated with Failover (HF -> Groq)
export const consultClinicalAgent = async (
  visualFindings: string,
  specializedData: any,
  patientData: PatientIntake,
  language: 'en' | 'vi'
): Promise<AnalysisResult> => {
  
  // Algorithm: Chain-of-Thought with Multi-Persona Consensus
  const systemPrompt = `You are the "MediDICOM Central Intelligence" - a simulated Medical Tumor Board.
  
  Your architecture consists of 3 sub-agents:
  1. **Senior Radiologist**: Analyzes morphology, margins, density, and enhancement patterns.
  2. **Oncologist**: Assesses malignancy risk, staging (TNM), and systemic impact.
  3. **Pathologist (Simulated)**: Predicts likely histology based on radiological features.

  **EXECUTION FLOW:**
  1. Internal Monologue: Let the agents debate the findings (don't output this).
  2. Consensus: Formulate a final, high-confidence diagnosis.
  3. Output: Generate the final JSON report.

  **OUTPUT RULES:**
  - Language: Strictly ${language === 'vi' ? 'Vietnamese' : 'English'}.
  - Format: Valid JSON Only. Do not output markdown backticks.
  - Arrays: 'findings', 'recommendations', 'rois' MUST be non-empty arrays if data exists.

  **JSON SCHEMA:**
  {
    "findings": ["Detailed observation 1", "Detailed observation 2"],
    "diagnosis": "Precise Medical Diagnosis (ICD-10 style)",
    "confidence": number (0-100),
    "recommendations": ["Next step 1", "Next step 2"],
    "rois": [{ "id": "uuid", "type": "rect", "points": [{"x":number,"y":number}], "label": "Lesion A", "measurements": {"length": number (mm), "huValue": number} }],
    "prognosis": { "recurrenceRisk": number, "mortality5Year": number, "pfsMonths": number, "standardReference": "NCCN/ESMO Guidelines" },
    "guidelines": "Exact citation of guideline used (e.g. NCCN v3.2024)",
    "reportText": "A comprehensive medical report summary summarizing the board's consensus."
  }`;

  const userPrompt = `
    [CASE DATA]
    Visual Analysis: ${visualFindings}
    Patient Profile: ${patientData.age}yo, ${patientData.gender}.
    Chief Complaint: ${patientData.chiefComplaint}.
    History: ${patientData.history}.
    Vitals: BP ${patientData.vitals.bp}, HR ${patientData.vitals.hr}, SpO2 ${patientData.vitals.spO2}.
  `;

  const fullPrompt = `<|im_start|>system\n${systemPrompt}<|im_end|>\n<|im_start|>user\n${userPrompt}<|im_end|>\n<|im_start|>assistant\n`;

  try {
    // API Call with Failover
    const responseText = await callApiWithFailover(fullPrompt, { 
      temperature: 0.1,
      max_new_tokens: 2048,
    });

    const cleanedText = cleanJsonOutput(responseText);
    let parsed;
    try {
        parsed = JSON.parse(cleanedText);
    } catch(e) {
        console.error("JSON Parse Error", e);
        console.log("Raw Response:", responseText);
        throw new Error("Invalid AI response format from Agent");
    }
    
    return {
      ...parsed,
      findings: Array.isArray(parsed.findings) ? parsed.findings : [],
      recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
      rois: Array.isArray(parsed.rois) ? parsed.rois : []
    } as AnalysisResult;
  } catch (error) {
    console.error("Diagnosis Error:", error);
    throw error;
  }
};

// 3. TREATMENT GENERATION: Integrated with Failover (HF -> Groq)
export const generateTreatmentPlan = async (
  diagnosis: string,
  patientData: PatientIntake,
  language: 'en' | 'vi'
): Promise<TreatmentPlan> => {
  const systemPrompt = `You are an Expert Clinical Pharmacologist and Oncologist.
  
  **TASK:** Generate a precision treatment protocol.
  **STRICT REQUIREMENTS:**
  1. **Gold Standard Only**: Use NCCN (US) or ESMO (EU) or MOH (Vietnam) approved protocols.
  2. **Drug Specifics**: Trade names (e.g., Keytruda) + Generic names (e.g., Pembrolizumab).
  3. **Dosing**: Exact mg/kg or mg/m2 BSA calculations.
  4. **Safety Filter**: Check interactions with patient history/vitals.
  
  **LANGUAGE:** ${language === 'vi' ? 'Vietnamese' : 'English'}.
  
  **JSON SCHEMA:**
  {
    "protocolName": "string",
    "guidelineVersion": "string",
    "cycleInfo": "string",
    "medications": [
      {
        "category": "Chemotherapy" | "Immunotherapy" | "Supportive" | "Targeted",
        "genericName": "string",
        "tradeNameExample": "string",
        "dosage": "string",
        "route": "string",
        "frequency": "string",
        "duration": "string",
        "mechanism": "Clinical mechanism of action",
        "sideEffects": ["string"],
        "blackBoxWarning": "string (optional)"
      }
    ],
    "safetyAnalysis": {
      "isSafe": boolean,
      "renalAdjustmentNeeded": boolean,
      "alerts": [{ "type": "Interaction"|"Contraindication", "message": "string", "severity": "high"|"medium" }]
    },
    "lifestyle": ["string"],
    "followUp": "string"
  }`;

  const userPrompt = `Diagnosis: ${diagnosis}. Patient Context: ${JSON.stringify(patientData)}`;

  const fullPrompt = `<|im_start|>system\n${systemPrompt}<|im_end|>\n<|im_start|>user\n${userPrompt}<|im_end|>\n<|im_start|>assistant\n`;

  try {
    // API Call with Failover
    const responseText = await callApiWithFailover(fullPrompt, { 
      temperature: 0.7,
      max_new_tokens: 2048,
    });

    const cleanedText = cleanJsonOutput(responseText);
    let parsed;
    try {
        parsed = JSON.parse(cleanedText);
    } catch(e) {
        console.error("JSON Parse Error in Treatment Plan", e);
        console.log("Raw Response:", responseText);
        throw new Error("Invalid AI response format from Agent");
    }
    
    // Defensive coding
    const safeMedications = Array.isArray(parsed.medications) ? parsed.medications : [];
    const safeLifestyle = Array.isArray(parsed.lifestyle) ? parsed.lifestyle : [];
    const safeAlerts = parsed.safetyAnalysis?.alerts && Array.isArray(parsed.safetyAnalysis.alerts) 
      ? parsed.safetyAnalysis.alerts 
      : [];

    return {
      protocolName: parsed.protocolName || "Custom Protocol",
      guidelineVersion: parsed.guidelineVersion || "Clinical Judgment",
      cycleInfo: parsed.cycleInfo || "As directed",
      medications: safeMedications,
      lifestyle: safeLifestyle,
      safetyAnalysis: {
        isSafe: parsed.safetyAnalysis?.isSafe ?? true,
        renalAdjustmentNeeded: parsed.safetyAnalysis?.renalAdjustmentNeeded ?? false,
        alerts: safeAlerts
      },
      followUp: parsed.followUp || "Re-eval in 2 weeks"
    } as TreatmentPlan;
  } catch (error) {
    console.error("Treatment Error:", error);
    throw error;
  }
};

// 4. MEDICAL COPILOT: Interactive Chat (Streaming)
// Uses Google GenAI Chat Session for robust history management
export const createMedicalChatSession = (initialContext: MedicalContext) => {
  let contextString = "No active case selected. You are in general consultation mode.";
  
  if (initialContext.patient) {
      contextString = `
      CURRENT ACTIVE CASE CONTEXT:
      - Patient: ${initialContext.patient.age}yo ${initialContext.patient.gender}
      - History: ${initialContext.patient.history}
      - Diagnosis: ${initialContext.diagnosis?.diagnosis || 'Pending'}
      - Key Findings: ${initialContext.diagnosis?.findings?.join(', ') || 'None'}
      - Treatment Plan: ${initialContext.treatment?.protocolName || 'Pending'}
      `;
  }

  const systemInstruction = `
  You are the "MediDICOM Copilot", a high-end AI Medical Consultant for doctors.
  
  **YOUR PERSONA:**
  - Professional, concise, highly knowledgeable, and evidence-based.
  - You act as a peer consultant to the doctor using the app.
  - You cite specific guidelines (NCCN, ESMO, AHA, etc.) whenever possible.
  
  **CAPABILITIES:**
  1. Explain complex findings in the current analysis.
  2. Check for drug interactions (Pharmacology expert).
  3. Suggest differential diagnoses if the current one is uncertain.
  4. Answer general medical queries with deep depth.

  ${contextString}

  **IMPORTANT:** 
  - If the user asks about the specific patient, refer to the [CURRENT ACTIVE CASE CONTEXT].
  - Always support your answers with medical reasoning.
  - Be helpful but concise (doctors are busy).
  `;

  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash-latest',
    generationConfig: {
      temperature: 0.3
    },
    systemInstruction: systemInstruction
  });

  return model.startChat();
};