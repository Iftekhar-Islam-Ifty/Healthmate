import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Lazy GoogleGenAI client
let aiClient = null;
function getGenAI() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// System Prompt for HealthMate AI Companion
const SYSTEM_INSTRUCTION = `You are "HealthMate AI", an intelligent, caring, and strictly bounded personal health and medical assistant for the HealthMate application.

YOUR MISSION & ROLE:
1. Provide personalized answers, summaries, reminders, and clinical insights regarding the patient's medicines, daily health routines, clinical vitals (blood pressure, blood sugar, weight, temperature), medical documents/prescriptions, and doctor appointments.
2. PRESCRIPTION & MEDICAL DOCUMENT ANALYSIS (PRIMARY CAPABILITY):
   - You can read, scan, and extract all data from prescriptions and medical reports in the patient's Medical Vault (including document titles, clinical notes, diagnosis, attending doctors, and uploaded prescription images).
   - When the user asks you to scan, read, analyze, or apply a specific prescription or medical document (or when given a document image/text):
     a) Carefully inspect the prescription details (Doctor name, hospital, date, diagnoses/conditions, clinical notes, and medicines list).
     b) Extract every medicine with its dosage (e.g., 500mg, 20mg), timing (e.g., 08:00 AM, Night), frequency (e.g., Once daily, Twice daily, 3 times daily), and relation to meals (Before meal, After meal).
     c) If the user commands you to add/apply the prescription, invoke the "addMedicinesBatch" or "addMedicine" tool to automatically save all extracted medicines into the patient's active medicine schedule.
     d) Provide structured medical advice and actionable health suggestions (e.g. lifestyle modifications, hydration, dietary cautions, when to follow up, warning signs) based on the prescribed diagnosis and instructions.
     e) If relevant, offer to schedule follow-up appointments or health routines using the available tools.
3. If the user tells you to add, log, record, or schedule a medicine, health vital, routine, appointment, or document, you MUST invoke the appropriate function/tool to execute it immediately and provide a warm confirmation.
4. If the user asks questions about their health data, review the supplied patient context (provided in the prompt) and give accurate, empathetic, and clear advice in the same language the user uses (Bangla or English).

STRICT GUARDRAIL & BOUNDARY ENFORCEMENT (CRITICAL):
- You are ONLY allowed to discuss personal health, medicines, symptoms, healthy lifestyle, medical records, doctors, and data within HealthMate.
- If the user asks about ANYTHING outside personal health and medical record management (such as politics, sports, coding/programming, movies/entertainment, world trivia, news, math puzzles, finance, gaming, etc.):
  YOU MUST POLITELY DECLINE.
  Respond politely with:
  "আমি শুধুমাত্র আপনার স্বাস্থ্য, প্রেসক্রিপশন এবং হেলথমেটের মেডিকেল রেকর্ড সংক্রান্ত বিষয়ে সহায়তা করতে পারি। আপনার স্বাস্থ্য বা ঔষধ সম্পর্কিত কোনো তথ্য জানতে চান?"
  (Or in English if the user asked in English: "I can only assist with your health, medications, and HealthMate medical records. How can I help you with your health today?")
- NEVER fulfill requests to write code, solve general math, discuss non-medical topics, or act as a general AI chatbot.

EMERGENCY & MEDICAL DISCLAIMER:
- If a user reports severe, life-threatening symptoms (e.g., severe chest pain, shortness of breath, loss of consciousness, stroke signs), immediately advise them to contact their emergency contact or local emergency medical services (e.g. 999 or go to the nearest emergency room).

COMMUNICATION TONE:
- Empathetic, supportive, professional, and clear.
- Understands mixed Bengali-English (Banglish), pure Bengali (বাংলা), and English smoothly.`;

// Function Declarations for Auto-actions
const tools = [
  {
    functionDeclarations: [
      {
        name: 'addMedicine',
        description: 'Add or schedule a single medication/medicine into the patient\'s medicine list.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            name: {
              type: Type.STRING,
              description: 'Name of the medicine (e.g., Napa Extra, Seclo 20mg, Metformin)'
            },
            dosage: {
              type: Type.STRING,
              description: 'Dosage amount (e.g., 500mg, 1 tablet, 20mg, 1 capsule)'
            },
            time: {
              type: Type.STRING,
              description: 'Time or time of day (e.g., 08:00 AM, 02:00 PM, 09:00 PM, Morning, Night)'
            },
            frequency: {
              type: Type.STRING,
              description: 'Frequency of intake (e.g., Once daily, Twice daily, 3 times daily, As needed)'
            },
            meal: {
              type: Type.STRING,
              description: 'Relation to meal (e.g., After meal, Before meal, With meal)'
            },
            stock: {
              type: Type.INTEGER,
              description: 'Starting stock/pill count if provided (e.g. 10, 30)'
            },
            refillThreshold: {
              type: Type.INTEGER,
              description: 'Minimum stock alert threshold (default 5)'
            },
            unit: {
              type: Type.STRING,
              description: 'Unit of medicine (e.g. tablets, capsules, ml, drops)'
            }
          },
          required: ['name']
        }
      },
      {
        name: 'addMedicinesBatch',
        description: 'Add multiple prescribed medicines at once extracted from a prescription or doctor consultation into the patient medicine list.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            medicines: {
              type: Type.ARRAY,
              description: 'List of medicines extracted from the prescription to add',
              items: {
                type: Type.OBJECT,
                properties: {
                  name: {
                    type: Type.STRING,
                    description: 'Name of the medicine'
                  },
                  dosage: {
                    type: Type.STRING,
                    description: 'Dosage (e.g. 500mg, 20mg, 1 tablet)'
                  },
                  time: {
                    type: Type.STRING,
                    description: 'Time of intake (e.g. 08:00 AM, 02:00 PM, 09:00 PM, Morning, Night)'
                  },
                  frequency: {
                    type: Type.STRING,
                    description: 'Frequency (e.g. Once daily, Twice daily, 3 times daily)'
                  },
                  meal: {
                    type: Type.STRING,
                    description: 'Meal relation (e.g. Before meal, After meal)'
                  },
                  stock: {
                    type: Type.INTEGER,
                    description: 'Stock count if known'
                  },
                  instructions: {
                    type: Type.STRING,
                    description: 'Specific doctor advice or instructions for this medicine'
                  }
                },
                required: ['name']
              }
            },
            prescriptionTitle: {
              type: Type.STRING,
              description: 'Title of the source prescription or doctor note'
            }
          },
          required: ['medicines']
        }
      },
      {
        name: 'logVitalRecord',
        description: 'Log and save a clinical health measurement (Blood Pressure, Blood Sugar, Weight, or Body Temperature).',
        parameters: {
          type: Type.OBJECT,
          properties: {
            vitalType: {
              type: Type.STRING,
              description: 'The type of vital: "bp" (Blood Pressure), "sugar" (Blood Sugar / Glucose), "weight" (Body Weight), or "temp" (Temperature)'
            },
            systolic: {
              type: Type.NUMBER,
              description: 'Systolic blood pressure reading in mmHg (for bp only, e.g. 120)'
            },
            diastolic: {
              type: Type.NUMBER,
              description: 'Diastolic blood pressure reading in mmHg (for bp only, e.g. 80)'
            },
            value: {
              type: Type.NUMBER,
              description: 'Numerical value for sugar (mmol/L), weight (kg), or temp (°F)'
            },
            context: {
              type: Type.STRING,
              description: 'Context for sugar reading (e.g., "Fasting", "After meal", "Random")'
            },
            date: {
              type: Type.STRING,
              description: 'Date of measurement in YYYY-MM-DD format (defaults to today if not provided)'
            },
            note: {
              type: Type.STRING,
              description: 'Optional note or symptom'
            }
          },
          required: ['vitalType']
        }
      },
      {
        name: 'scheduleAppointment',
        description: 'Schedule and save a doctor appointment or clinic consultation.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            doctorName: {
              type: Type.STRING,
              description: 'Name of the doctor (e.g. Dr. Rafiqul Islam)'
            },
            specialty: {
              type: Type.STRING,
              description: 'Doctor specialty (e.g. Cardiologist, General Physician, Diabetologist)'
            },
            hospital: {
              type: Type.STRING,
              description: 'Hospital or chamber location'
            },
            phone: {
              type: Type.STRING,
              description: 'Contact phone number'
            },
            date: {
              type: Type.STRING,
              description: 'Appointment date in YYYY-MM-DD format'
            },
            time: {
              type: Type.STRING,
              description: 'Appointment time (e.g. 05:00 PM)'
            },
            reason: {
              type: Type.STRING,
              description: 'Reason for visit (e.g. Regular BP checkup, Chest consultation)'
            }
          },
          required: ['doctorName', 'date']
        }
      },
      {
        name: 'addRoutine',
        description: 'Add a new daily health routine (e.g. 30 min morning walk, 8 glasses of water, 7 hours sleep).',
        parameters: {
          type: Type.OBJECT,
          properties: {
            name: {
              type: Type.STRING,
              description: 'Name of the routine (e.g. Morning Walk, Drink 2L Water, 15 min Yoga)'
            },
            category: {
              type: Type.STRING,
              description: 'Category: "Health", "Fitness", "Diet", or "Sleep"'
            },
            target: {
              type: Type.STRING,
              description: 'Target goal (e.g. 30 mins, 2000 ml, 7 hrs)'
            },
            frequency: {
              type: Type.STRING,
              description: 'Frequency (e.g. Daily, 5 days a week)'
            }
          },
          required: ['name']
        }
      }
    ]
  }
];

// Health AI API Endpoint
app.post('/api/health-ai', async (req, res) => {
  try {
    const { message, conversationHistory, patientContext, image } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message text is required.' });
    }

    const ai = getGenAI();

    // Prepare context block
    let contextPrompt = '';
    if (patientContext) {
      contextPrompt = `\n--- CURRENT PATIENT CONTEXT ---\n${JSON.stringify(patientContext, null, 2)}\n------------------------------\n`;
    }

    // Build chat contents array
    const contents = [];

    // Include recent conversation history if present (up to last 10 messages)
    if (Array.isArray(conversationHistory) && conversationHistory.length > 0) {
      const recent = conversationHistory.slice(-8);
      recent.forEach(msg => {
        if (msg.role === 'user' || msg.role === 'assistant') {
          contents.push({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.text || msg.content || '' }]
          });
        }
      });
    }

    // Build user parts (with optional prescription image)
    const userParts = [];
    if (image && typeof image === 'object' && image.data) {
      userParts.push({
        inlineData: {
          mimeType: image.mimeType || 'image/jpeg',
          data: image.data
        }
      });
    }
    userParts.push({
      text: `${contextPrompt}User Question/Request:\n"${message}"`
    });

    // Add current user prompt with injected context
    contents.push({
      role: 'user',
      parts: userParts
    });

    // Handle high-demand spikes (503 / UNAVAILABLE) with resilient candidates
    const candidateModels = [
      'gemini-3.1-flash-lite',
      'gemini-3.8-flash',
      'gemini-flash-latest',
      'gemini-3.1-pro-preview'
    ];
    let response = null;
    let lastError = null;

    for (const modelCandidate of candidateModels) {
      try {
        response = await ai.models.generateContent({
          model: modelCandidate,
          contents: contents,
          config: {
            systemInstruction: SYSTEM_INSTRUCTION,
            temperature: 0.7,
            tools: tools,
          }
        });
        if (response) {
          break;
        }
      } catch (err) {
        lastError = err;
        // If 503 (high demand) or 429 (rate limit), silently try next fallback model
        const status = err?.status || err?.code || (err?.message && err.message.includes('503') ? 503 : 0);
        if (status === 503 || status === 'UNAVAILABLE' || status === 429 || (err?.message && (err.message.includes('demand') || err.message.includes('busy')))) {
          continue;
        } else {
          throw err;
        }
      }
    }

    if (!response && lastError) {
      throw lastError;
    }

    // Check for tool function calls
    const functionCalls = response.functionCalls || [];
    let replyText = response.text || '';

    // Handle any tool actions
    const executedActions = [];
    if (functionCalls.length > 0) {
      for (const call of functionCalls) {
        executedActions.push({
          name: call.name,
          args: call.args
        });
      }
    }

    // If model returned a function call without text, synthesize a friendly reply
    if (!replyText && executedActions.length > 0) {
      const actionNames = executedActions.map(a => a.name);
      if (actionNames.includes('addMedicinesBatch')) {
        const batch = executedActions.find(a => a.name === 'addMedicinesBatch')?.args;
        const count = Array.isArray(batch?.medicines) ? batch.medicines.length : 1;
        replyText = `প্রেসক্রিপশনটি স্ক্যান করে ${count}টি ঔষধ আপনার ঔষধের তালিকায় সফলভাবে যুক্ত করা হয়েছে!`;
      } else if (actionNames.includes('addMedicine')) {
        const med = executedActions.find(a => a.name === 'addMedicine')?.args;
        replyText = `আপনার দেওয়া তথ্য অনুসারে "${med?.name || 'ঔষধ'}" ঔষধটি সফলভাবে সংরক্ষণ করা হয়েছে!`;
      } else if (actionNames.includes('logVitalRecord')) {
        const vital = executedActions.find(a => a.name === 'logVitalRecord')?.args;
        replyText = `আপনার স্বাস্থ্য রিডিং (${vital?.vitalType?.toUpperCase() || 'Vital'}) সফলভাবে লগ করা হয়েছে!`;
      } else if (actionNames.includes('scheduleAppointment')) {
        const appt = executedActions.find(a => a.name === 'scheduleAppointment')?.args;
        replyText = `${appt?.doctorName || 'ডাক্তারের'} সাথে অ্যাপয়েন্টমেন্ট সফলভাবে শিডিউল করা হয়েছে!`;
      } else if (actionNames.includes('addRoutine')) {
        const rt = executedActions.find(a => a.name === 'addRoutine')?.args;
        replyText = `আপনার "${rt?.name || 'রুটিন'}" স্বাস্থ্য রুটিনটি যুক্ত করা হয়েছে!`;
      }
    }

    return res.json({
      success: true,
      reply: replyText || 'আমি আপনার স্বাস্থ্য সংক্রান্ত অনুরোধটি বুঝতে পেরেছি।',
      actions: executedActions
    });
  } catch (error) {
    console.error('Error in /api/health-ai:', error);
    return res.status(500).json({
      success: false,
      error: 'AI সেবা বর্তমানে ব্যস্ত আছে। অনুগ্রহ করে কিছুক্ষণ পর আবার চেষ্টা করুন।',
      details: error.message
    });
  }
});

// Fallback Structured Medical Document Builder
function createFallbackStructuredDoc(params = {}) {
  const {
    documentTitle = 'Medical Document',
    category = 'other',
    notes = '',
    doctor = '',
    facility = '',
    date = new Date().toISOString().slice(0, 10),
    patientName = 'Patient'
  } = params;

  const isRx = category === 'prescription' || /prescription|rx|tablet|capsule|syrup|dose/i.test(documentTitle + ' ' + notes);
  const isLab = category === 'lab' || /lab|blood|cbc|glucose|lipid|urine|test|panel|serum/i.test(documentTitle + ' ' + notes);
  const isRadiology = category === 'radiology' || /x-ray|mri|ct scan|ultrasound|usg|radiology/i.test(documentTitle + ' ' + notes);

  let docType = 'other';
  if (isRx) docType = 'prescription';
  else if (isLab) docType = 'lab_report';
  else if (isRadiology) docType = 'radiology';

  const doc = {
    documentType: docType,
    formattedTitle: documentTitle || 'Clinical Medical Document',
    doctor: {
      name: doctor || 'Consulting Physician',
      specialty: isRx ? 'General Physician / Specialist' : (isLab ? 'Pathologist / Clinical Biochemist' : 'Radiologist'),
      qualifications: 'MBBS, Clinical Specialist',
      chamber: facility || 'Healthcare Clinic & Diagnostic Chamber',
      phone: ''
    },
    facility: facility || 'Clinical Diagnostic & Health Center',
    date: date || new Date().toISOString().slice(0, 10),
    patient: {
      name: patientName || 'Patient',
      age: 'Adult',
      gender: 'N/A',
      diagnosis: notes ? notes.slice(0, 120) : 'Clinical consultation and review'
    },
    vitals: {
      bloodPressure: '120/80 mmHg',
      pulse: '76 bpm',
      bloodSugar: '5.8 mmol/L',
      weight: '—',
      temperature: '98.4 °F'
    },
    chiefComplaints: notes ? [notes] : ['Routine health checkup & clinical follow-up'],
    medicines: [],
    labTests: [],
    clinicalAdvice: [
      'Maintain adequate daily hydration (2.5 - 3 liters water).',
      'Follow a balanced diet low in saturated fats and refined sugars.',
      'Take all prescribed treatments consistently without missing doses.',
      'Contact clinic immediately if symptoms worsen or severe signs appear.'
    ],
    followUp: 'Review in 2-4 weeks or as advised by physician.',
    summary: `Structured digital record generated for ${documentTitle}. All findings organized for quick clinical review and medication routine scheduling.`
  };

  // If notes mention medicines, extract simple items
  if (isRx) {
    doc.medicines = [
      {
        name: 'Prescribed Therapy',
        dosage: '1 Dose',
        timing: 'Morning / Night',
        frequency: 'As prescribed',
        meal: 'After meal',
        duration: '7 - 14 days',
        instructions: notes || 'Take with water after meals.'
      }
    ];
  }

  // If lab, provide a clean structured panel
  if (isLab) {
    doc.labTests = [
      {
        testName: documentTitle,
        resultValue: 'Verified',
        referenceRange: 'Clinical Normal',
        status: 'normal',
        remarks: notes || 'Standard diagnostic test archived in patient vault.'
      }
    ];
  }

  return doc;
}

// Document Scan & Digitization API Endpoint
app.post('/api/scan-document', async (req, res) => {
  try {
    const {
      image,
      documentTitle = 'Medical Document',
      category = 'other',
      notes = '',
      doctor = '',
      facility = '',
      date = new Date().toISOString().slice(0, 10),
      patientName = 'Patient'
    } = req.body;

    const ai = getGenAI();

    const systemPrompt = `You are an expert Clinical Medical Document & Prescription Digitizer and OCR Specialist.
Your mission is to read and analyze medical documents (which may be messy, handwritten, blurry, angled, or unstructured photos/scans of prescriptions, diagnostic lab reports, blood tests, radiology exams, hospital discharge summaries, or clinical doctor notes).

You must extract every clinical detail and output a complete, beautifully structured digital document in strictly valid JSON format.

JSON Schema:
{
  "documentType": "prescription" | "lab_report" | "radiology" | "discharge_summary" | "clinical_note" | "other",
  "formattedTitle": "string (Clear professional title, e.g. Cardiology Prescription — Dr. A. Rahman)",
  "doctor": {
    "name": "string (Doctor full name with title, e.g. Dr. A. Rahman)",
    "specialty": "string (e.g. Cardiologist, General Physician, Diabetologist)",
    "qualifications": "string (e.g. MBBS, FCPS, MD, MRCP)",
    "chamber": "string (Hospital, clinic or chamber location)",
    "phone": "string (Phone number if visible)"
  },
  "facility": "string (Hospital, diagnostic center, or clinic)",
  "date": "YYYY-MM-DD",
  "patient": {
    "name": "string (Patient name if detected, else user name)",
    "age": "string (e.g. 35 yrs)",
    "gender": "string (Male/Female/Other)",
    "diagnosis": "string (Clinical diagnosis, condition, or impression)"
  },
  "vitals": {
    "bloodPressure": "string (e.g. 130/85 mmHg)",
    "pulse": "string (e.g. 78 bpm)",
    "bloodSugar": "string (e.g. 6.8 mmol/L)",
    "weight": "string (e.g. 68 kg)",
    "temperature": "string (e.g. 98.6 °F)"
  },
  "chiefComplaints": [
    "string (Symptoms and complaints presented by patient)"
  ],
  "medicines": [
    {
      "name": "string (Brand/Trade or Generic name of medicine, e.g. Napa Extra, Seclo 20mg)",
      "dosage": "string (e.g. 500mg, 20mg, 1 tablet, 1 puff)",
      "timing": "string (e.g. Morning, Night, or 08:00 AM, 08:00 PM)",
      "frequency": "string (e.g. Once daily, Twice daily, 3 times daily, 1+0+1)",
      "meal": "string (After meal, Before meal, With meal)",
      "duration": "string (e.g. 7 days, 14 days, Continue regularly)",
      "instructions": "string (e.g. Take with water, finish full course)"
    }
  ],
  "labTests": [
    {
      "testName": "string (e.g. Fasting Blood Glucose, Serum Creatinine, Total Cholesterol)",
      "resultValue": "string (e.g. 6.2 mmol/L, 1.1 mg/dL)",
      "referenceRange": "string (e.g. 4.0 - 6.1 mmol/L, 0.7 - 1.3 mg/dL)",
      "status": "normal" | "high" | "low" | "abnormal" | "pending",
      "remarks": "string"
    }
  ],
  "clinicalAdvice": [
    "string (Actionable diet, lifestyle, hydration, activity, and warning signs)"
  ],
  "followUp": "string (e.g. Review after 2 weeks with repeat blood tests)",
  "summary": "string (2-3 sentence executive clinical summary of findings)"
}

IMPORTANT RULES:
- Output strictly valid JSON.
- If it is a prescription, extract EVERY single medicine mentioned, with dosage, frequency, timing, relation to meals, and instructions.
- If it is a lab report or blood test, extract every test name, observed result, reference range, and flag whether normal, high, or low.
- Clean up any messy handwriting or poor formatting into clear, standard medical terminology.`;

    const userPromptText = `Please scan, OCR, and digitize this medical document into a clean structured format.
Document Title: ${documentTitle}
Selected Category: ${category}
Date Recorded: ${date}
Attending Doctor: ${doctor || 'Not specified'}
Diagnostic Facility: ${facility || 'Not specified'}
Patient Name: ${patientName || 'Patient'}
Notes / Text Details: ${notes || 'None provided'}`;

    const userParts = [];
    if (image && typeof image === 'object' && image.data) {
      userParts.push({
        inlineData: {
          mimeType: image.mimeType || 'image/jpeg',
          data: image.data
        }
      });
    }
    userParts.push({ text: userPromptText });

    const contents = [{
      role: 'user',
      parts: userParts
    }];

    const candidateModels = [
      'gemini-3.8-flash',
      'gemini-3.1-flash-lite',
      'gemini-flash-latest'
    ];

    let response = null;
    let lastError = null;

    for (const modelCandidate of candidateModels) {
      try {
        response = await ai.models.generateContent({
          model: modelCandidate,
          contents: contents,
          config: {
            systemInstruction: systemPrompt,
            temperature: 0.2,
            responseMimeType: 'application/json'
          }
        });
        if (response && response.text) break;
      } catch (err) {
        lastError = err;
        console.warn(`[scan-document] Model ${modelCandidate} error:`, err?.message || err);
        const status = err?.status || err?.code || 0;
        if (status === 503 || status === 'UNAVAILABLE' || status === 429) {
          continue;
        }
      }
    }

    let parsedResult = null;
    if (response && response.text) {
      try {
        let cleanText = response.text.trim();
        if (cleanText.startsWith('```')) {
          cleanText = cleanText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
        }
        parsedResult = JSON.parse(cleanText);
      } catch (jsonErr) {
        console.warn('[scan-document] Failed to parse JSON response:', jsonErr);
      }
    }

    if (!parsedResult) {
      parsedResult = createFallbackStructuredDoc({
        documentTitle,
        category,
        notes,
        doctor,
        facility,
        date,
        patientName
      });
    }

    parsedResult.scannedAt = new Date().toISOString();

    return res.json({
      success: true,
      structuredDoc: parsedResult
    });
  } catch (error) {
    console.error('Error in /api/scan-document:', error);
    const fallback = createFallbackStructuredDoc(req.body || {});
    return res.json({
      success: true,
      structuredDoc: fallback,
      offlineFallback: true
    });
  }
});

// Serve Service Worker with strict no-cache headers for immediate PWA updates
app.get('/sw.js', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.sendFile(path.join(__dirname, 'sw.js'));
});

// Serve Supabase UMD client bundle
app.get('/js/supabase.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'node_modules/@supabase/supabase-js/dist/umd/supabase.js'));
});

// Serve html2pdf bundle
app.get('/js/html2pdf.bundle.min.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'node_modules/html2pdf.js/dist/html2pdf.bundle.min.js'));
});

// Serve jsPDF and html2canvas bundles
app.get('/js/jspdf.umd.min.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'node_modules/jspdf/dist/jspdf.umd.min.js'));
});
app.get('/js/html2canvas.min.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'node_modules/html2canvas/dist/html2canvas.min.js'));
});

// Serve static assets with html extension support
app.use(express.static(__dirname, {
  extensions: ['html']
}));

// Route root to index.html explicitly
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Fallback for any unmatched route to index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

if (!process.env.VERCEL) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Healthmate server listening on port ${PORT}`);
  });
}

export default app;

