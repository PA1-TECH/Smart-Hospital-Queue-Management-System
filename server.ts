import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

const PORT = 3000;

// Path for state preservation
const STATE_FILE_PATH = path.join(__dirname, "queue_state_persistence.json");

// System Initial State Types
import { Department, Doctor, Appointment, PriorityLevel } from "./src/types.js";

const DEFAULT_DEPARTMENTS: Department[] = [
  { id: "dept_cardiology", name: "Cardiology", description: "Heart health and cardiovascular care", avgPreConsultationTime: 12 },
  { id: "dept_pediatrics", name: "Pediatrics", description: "Infant, child, and adolescent healthcare", avgPreConsultationTime: 8 },
  { id: "dept_general_medicine", name: "General Medicine", description: "Routine health examinations, physicals, and prescriptions", avgPreConsultationTime: 6 },
  { id: "dept_orthopedics", name: "Orthopedics", description: "Bones, joints, ligaments, tendons, and muscles care", avgPreConsultationTime: 10 },
  { id: "dept_ophthalmology", name: "Ophthalmology", description: "Vision tests, eye examinations, and specialty eyecare", avgPreConsultationTime: 8 }
];

const DEFAULT_DOCTORS: Doctor[] = [
  { id: "doc_jones", name: "Dr. Arthur Jones", departmentId: "dept_cardiology", departmentName: "Cardiology", availability: "Online", avgDuration: 18, assignedQueueCount: 0 },
  { id: "doc_smith", name: "Dr. Sarah Smith", departmentId: "dept_pediatrics", departmentName: "Pediatrics", availability: "Online", avgDuration: 12, assignedQueueCount: 0 },
  { id: "doc_patel", name: "Dr. Meera Patel", departmentId: "dept_general_medicine", departmentName: "General Medicine", availability: "Online", avgDuration: 10, assignedQueueCount: 0 },
  { id: "doc_davis", name: "Dr. Emily Davis", departmentId: "dept_general_medicine", departmentName: "General Medicine", availability: "Online", avgDuration: 12, assignedQueueCount: 0 },
  { id: "doc_wood", name: "Dr. Robert Wood", departmentId: "dept_orthopedics", departmentName: "Orthopedics", availability: "In Consultation", avgDuration: 15, assignedQueueCount: 0 },
  { id: "doc_lee", name: "Dr. Christopher Lee", departmentId: "dept_ophthalmology", departmentName: "Ophthalmology", availability: "Online", avgDuration: 14, assignedQueueCount: 0 }
];

// Helper to generate some initial historical and current appointments
const generateInitialAppointments = (): Appointment[] => {
  const baseTime = new Date();
  baseTime.setHours(8, 0, 0, 0); // Start queue at 8 AM

  const list: Appointment[] = [
    // Completed Cardiology patients
    {
      id: "apt_1",
      tokenNumber: "CAR-001",
      patientName: "John Thompson",
      patientAge: 62,
      patientGender: "Male",
      symptoms: "Mild angina during physical exertion",
      priority: "High",
      departmentId: "dept_cardiology",
      departmentName: "Cardiology",
      doctorId: "doc_jones",
      doctorName: "Dr. Arthur Jones",
      status: "Completed",
      isEmergency: false,
      estimatedWaitTime: 0,
      confidencePercentage: 95,
      createdAt: new Date(baseTime.getTime() + 10 * 60 * 1000).toISOString(),
      calledAt: new Date(baseTime.getTime() + 25 * 60 * 1000).toISOString(),
      completedAt: new Date(baseTime.getTime() + 42 * 60 * 1000).toISOString(),
      notes: "Cardiogram normal, prescribed low-dose aspirin. Follow up in 3 months."
    },
    {
      id: "apt_2",
      tokenNumber: "CAR-002",
      patientName: "Mary Jenkins",
      patientAge: 71,
      patientGender: "Female",
      symptoms: "Sudden chest pressure and dizziness",
      priority: "Critical",
      departmentId: "dept_cardiology",
      departmentName: "Cardiology",
      doctorId: "doc_jones",
      doctorName: "Dr. Arthur Jones",
      status: "Completed",
      isEmergency: true,
      estimatedWaitTime: 0,
      confidencePercentage: 98,
      createdAt: new Date(baseTime.getTime() + 45 * 60 * 1000).toISOString(),
      calledAt: new Date(baseTime.getTime() + 48 * 60 * 1000).toISOString(),
      completedAt: new Date(baseTime.getTime() + 75 * 60 * 1000).toISOString(),
      notes: "Admitted due to emergency cardiac arrythmia. Transferred to ICU."
    },
    // Completed Pediatrics patients
    {
      id: "apt_3",
      tokenNumber: "PED-001",
      patientName: "Alice Miller",
      patientAge: 4,
      patientGender: "Female",
      symptoms: "Routine childhood immunization shots",
      priority: "Normal",
      departmentId: "dept_pediatrics",
      departmentName: "Pediatrics",
      doctorId: "doc_smith",
      doctorName: "Dr. Sarah Smith",
      status: "Completed",
      isEmergency: false,
      estimatedWaitTime: 0,
      confidencePercentage: 90,
      createdAt: new Date(baseTime.getTime() + 15 * 60 * 1000).toISOString(),
      calledAt: new Date(baseTime.getTime() + 35 * 60 * 1000).toISOString(),
      completedAt: new Date(baseTime.getTime() + 47 * 60 * 1000).toISOString(),
      notes: "Administered MMR & Varicella vaccines. Child tolerated well."
    },
    // Completed General Medicine patients
    {
      id: "apt_4",
      tokenNumber: "GEN-001",
      patientName: "Robert Dow",
      patientAge: 29,
      patientGender: "Male",
      symptoms: "Common cold, mild throat congestion, fatigue",
      priority: "Normal",
      departmentId: "dept_general_medicine",
      departmentName: "General Medicine",
      doctorId: "doc_patel",
      doctorName: "Dr. Meera Patel",
      status: "Completed",
      isEmergency: false,
      estimatedWaitTime: 12,
      confidencePercentage: 92,
      createdAt: new Date(baseTime.getTime() + 20 * 60 * 1000).toISOString(),
      calledAt: new Date(baseTime.getTime() + 40 * 60 * 1000).toISOString(),
      completedAt: new Date(baseTime.getTime() + 52 * 60 * 1000).toISOString(),
      notes: "Prescribed fluids, vocal rest, and OTC antihistamines."
    },
    // Waiting patients in active queues
    {
      id: "apt_5",
      tokenNumber: "GEN-002",
      patientName: "Henry Watson",
      patientAge: 45,
      patientGender: "Male",
      symptoms: "Moderate headache with persistent fever (101 F)",
      priority: "Medium",
      departmentId: "dept_general_medicine",
      departmentName: "General Medicine",
      doctorId: "doc_patel",
      doctorName: "Dr. Meera Patel",
      status: "Waiting",
      isEmergency: false,
      estimatedWaitTime: 10,
      confidencePercentage: 88,
      createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString() // 30 mins ago
    },
    {
      id: "apt_6",
      tokenNumber: "PED-002",
      patientName: "Tommy Higgins",
      patientAge: 8,
      patientGender: "Male",
      symptoms: "Severe asthma coughing fit since morning",
      priority: "High",
      departmentId: "dept_pediatrics",
      departmentName: "Pediatrics",
      doctorId: "doc_smith",
      doctorName: "Dr. Sarah Smith",
      status: "Waiting",
      isEmergency: false,
      estimatedWaitTime: 12,
      confidencePercentage: 85,
      createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString() // 15 mins ago
    },
    {
      id: "apt_7",
      tokenNumber: "CAR-003",
      patientName: "Susie Clark",
      patientAge: 53,
      patientGender: "Female",
      symptoms: "Palpitations and shortness of breath",
      priority: "High",
      departmentId: "dept_cardiology",
      departmentName: "Cardiology",
      doctorId: "doc_jones",
      doctorName: "Dr. Arthur Jones",
      status: "Waiting",
      isEmergency: false,
      estimatedWaitTime: 18,
      confidencePercentage: 90,
      createdAt: new Date(Date.now() - 10 * 60 * 1000).toISOString() // 10 mins ago
    },
    {
      id: "apt_8",
      tokenNumber: "GEN-003",
      patientName: "Clara Croft",
      patientAge: 32,
      patientGender: "Female",
      symptoms: "Routine prescription renewal for thyroid",
      priority: "Normal",
      departmentId: "dept_general_medicine",
      departmentName: "General Medicine",
      doctorId: "doc_davis",
      doctorName: "Dr. Emily Davis",
      status: "Waiting",
      isEmergency: false,
      estimatedWaitTime: 15,
      confidencePercentage: 85,
      createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString() // 5 mins ago
    }
  ];
  return list;
};

// Local cache database
let dbState = {
  departments: DEFAULT_DEPARTMENTS,
  doctors: DEFAULT_DOCTORS,
  appointments: generateInitialAppointments()
};

// Helper load/save persisting mechanics
const loadPersistedState = () => {
  try {
    if (fs.existsSync(STATE_FILE_PATH)) {
      const raw = fs.readFileSync(STATE_FILE_PATH, "utf-8");
      const parsed = JSON.parse(raw);
      if (parsed.departments && parsed.doctors && parsed.appointments) {
        dbState = parsed;
        console.log("Queue state successfully loaded from persistence storage.");
      }
    }
  } catch (e) {
    console.error("Failed to load historical queue state, continuing with defaults.", e);
  }
};

const saveStateToDisk = () => {
  try {
    fs.writeFileSync(STATE_FILE_PATH, JSON.stringify(dbState, null, 2), "utf-8");
  } catch (e) {
    console.error("Failed to save queue state persistence.", e);
  }
};

// Run state initial load
loadPersistedState();

// Initialize Gemini Client Lazily
let geminiClientCache: any = null;
const getGeminiClient = () => {
  if (!geminiClientCache) {
    const key = process.env.GEMINI_API_KEY;
    if (!key || key === "MY_GEMINI_API_KEY" || key.trim() === "") {
      console.warn("GEMINI_API_KEY is not defined. AI prediction services will proceed using intelligent heuristic fallbacks.");
      return null;
    }
    geminiClientCache = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
  }
  return geminiClientCache;
};

// Re-calculate Doctor Assignments count (active patients waiting)
const refreshDoctorAssignmentCounts = () => {
  dbState.doctors.forEach(doc => {
    doc.assignedQueueCount = dbState.appointments.filter(
      a => a.doctorId === doc.id && a.status === "Waiting"
    ).length;
  });
};
refreshDoctorAssignmentCounts();

// Wait time heuristic calculator for fallbacks
const calculateHeuristicWaitTime = (
  deptId: string,
  docId: string,
  priority: PriorityLevel,
  isEmergency: boolean
) => {
  // Base department time
  const dept = dbState.departments.find(d => d.id === deptId) || dbState.departments[0];
  const doc = dbState.doctors.find(d => d.id === docId);

  // Filter regular patients ahead in this doctor's (or department's) queue
  const ahead = dbState.appointments.filter(a => {
    if (a.status !== "Waiting") return false;
    if (a.departmentId !== deptId) return false;
    if (docId && a.doctorId !== docId) return false;
    return true;
  });

  // Emergency is resolved immediately (approx 2 mins setup)
  if (isEmergency || priority === "Critical") {
    return { waitTime: 2, confidence: 99 };
  }

  const baseDocDuration = doc ? doc.avgDuration : 15;
  const preConsTime = dept.avgPreConsultationTime;

  // Let's count who has higher priority or was created earlier
  const queueLength = ahead.length;
  let estimated = queueLength * baseDocDuration + preConsTime;

  // Priority modifiers
  if (priority === "High") {
    estimated = Math.max(5, Math.round(estimated * 0.5));
  } else if (priority === "Medium") {
    estimated = Math.max(10, Math.round(estimated * 0.8));
  }

  // Cap wait times
  if (estimated < 5) estimated = 5;

  // Confidence calculations
  let confidence = 85;
  if (!docId) {
    confidence -= 15; // Lower confidence if doctor is unassigned
  }
  if (doc?.availability === "In Consultation") {
    confidence += 5; // Higher certainty as doctor is active
  } else if (doc?.availability === "Offline") {
    confidence -= 25; // Massive drag if offline
  }

  confidence = Math.max(40, Math.min(98, confidence));

  return { waitTime: estimated, confidence };
};

// ----------------------------------------------------
// API ROUTES
// ----------------------------------------------------

// Get full current system queue definitions
app.get("/api/state", (req, res) => {
  refreshDoctorAssignmentCounts();
  res.json(dbState);
});

// Update doctor availability state (Doctor Portal utility)
app.post("/api/doctors/update-status", (req, res) => {
  const { doctorId, status } = req.body; // 'Online', 'Offline', 'In Consultation'
  const doc = dbState.doctors.find(d => d.id === doctorId);
  if (!doc) {
    return res.status(404).json({ error: "Doctor not found" });
  }
  doc.availability = status;
  saveStateToDisk();
  res.json({ success: true, doctor: doc });
});

// Priority recommendations based on entering symptoms (Walk-in booking pre-evaluation & patient booking)
app.post("/api/appointments/priority-recommend", async (req, res) => {
  const { symptoms, age, gender } = req.body;
  if (!symptoms) {
    return res.status(400).json({ error: "Symptoms text is required" });
  }

  const gemini = getGeminiClient();
  if (gemini) {
    try {
      const response = await gemini.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `Analyze patient credentials: Age: ${age || 'Unknown'}, Gender: ${gender || 'Unknown'}. Symptoms: "${symptoms}". Recommend priority level ('Critical', 'High', 'Medium', 'Normal') and map to the most suitable clinic department ID from the following options:
        - dept_cardiology (Chest pain, heart palpitations, chronic high blood pressure, dizziness)
        - dept_pediatrics (Patients under 15 years old with non-emergency conditions, childhood ailments)
        - dept_general_medicine (Fever, cold/flu, headaches, prescription renewals, stomach bugs, general checkup)
        - dept_orthopedics (Bone fractures, joint pain, muscle sprains, ligament damage)
        - dept_ophthalmology (Eye pain, visual disturbances, conjunctivitis)

        Recommend high priority for cardiac, severe breathing issues, severe trauma, or infants with high fevers.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              priority: {
                type: Type.STRING,
                description: "The priority recommendation: Critical, High, Medium, or Normal"
              },
              recommendedDepartmentId: {
                type: Type.STRING,
                description: "The department ID, must be one of: dept_cardiology, dept_pediatrics, dept_general_medicine, dept_orthopedics, dept_ophthalmology"
              },
              explanation: {
                type: Type.STRING,
                description: "A brief direct 1-sentence diagnostic explanation of why this priority and department were recommended."
              }
            },
            required: ["priority", "recommendedDepartmentId", "explanation"]
          }
        }
      });

      const parsed = JSON.parse(response.text.trim());
      return res.json(parsed);
    } catch (err) {
      console.warn("Gemini Priority evaluation: falling back to local heuristic calculations.", err instanceof Error ? err.message : err);
    }
  }

  // Intelligent Local Rules Fallback
  let priority: PriorityLevel = "Normal";
  let recommendedDepartmentId = "dept_general_medicine";
  let explanation = "General checkup symptom pattern detected.";

  const text = symptoms.toLowerCase();
  
  if (age && Number(age) < 15 && text.includes("fever")) {
    priority = "Medium";
    recommendedDepartmentId = "dept_pediatrics";
    explanation = "Pediatric fever assessment advised.";
  } else if (age && Number(age) < 15) {
    recommendedDepartmentId = "dept_pediatrics";
    explanation = "Assigned pediatric care clinic based on patient age.";
  } else if (text.includes("chest") || text.includes("heart") || text.includes("palpitations") || text.includes("angina") || text.includes("cardiac")) {
    priority = "Critical";
    recommendedDepartmentId = "dept_cardiology";
    explanation = "Potential acute cardiovascular risk. Immediate priority advised.";
  } else if (text.includes("breath") || text.includes("cough") || text.includes("fever") || text.includes("flu")) {
    priority = text.includes("high fever") || text.includes("severe") ? "High" : "Medium";
    recommendedDepartmentId = "dept_general_medicine";
    explanation = "Fever and congestion symptoms require general practitioner care.";
  } else if (text.includes("bone") || text.includes("fracture") || text.includes("joint") || text.includes("sprain") || text.includes("broken") || text.includes("fall")) {
    priority = text.includes("broken") || text.includes("fracture") ? "High" : "Medium";
    recommendedDepartmentId = "dept_orthopedics";
    explanation = "Musculoskeletal injury detected. Orthopedics clinic routed.";
  } else if (text.includes("eye") || text.includes("vision") || text.includes("blind") || text.includes("sight")) {
    priority = "Medium";
    recommendedDepartmentId = "dept_ophthalmology";
    explanation = "Visual or ocular irritation detected. Ophthalmology routed.";
  }

  res.json({
    priority,
    recommendedDepartmentId,
    explanation
  });
});

// Book appointment token
app.post("/api/appointments/book", async (req, res) => {
  const { patientName, patientAge, patientGender, symptoms, departmentId, doctorId, priority, isEmergency } = req.body;

  if (!patientName || !departmentId) {
    return res.status(400).json({ error: "Missing required booking details (Name, Department)" });
  }

  // Resolve dept reference
  const dept = dbState.departments.find(d => d.id === departmentId);
  if (!dept) {
    return res.status(404).json({ error: "Specified Department not found." });
  }

  // Resolve doctor assignment
  let targetDoctor = dbState.doctors.find(d => d.id === doctorId);
  if (!targetDoctor) {
    // If no doctor selected, assign first available Online doctor of that department
    targetDoctor = dbState.doctors.find(d => d.departmentId === departmentId && d.availability !== "Offline");
    // Fallback to any doctor in department if all offline
    if (!targetDoctor) {
      targetDoctor = dbState.doctors.find(d => d.departmentId === departmentId);
    }
  }

  if (!targetDoctor) {
    return res.status(400).json({ error: "No available doctors found for this department." });
  }

  const actPriority: PriorityLevel = isEmergency ? "Critical" : (priority || "Normal");

  // Predict wait times
  const heuristic = calculateHeuristicWaitTime(departmentId, targetDoctor.id, actPriority, !!isEmergency);
  let finalWaitTime = heuristic.waitTime;
  let finalConfidence = heuristic.confidence;

  const gemini = getGeminiClient();
  if (gemini) {
    try {
      const activeWaitingAhead = dbState.appointments.filter(
        a => a.doctorId === targetDoctor?.id && a.status === "Waiting"
      ).length;

      const response = await gemini.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `Evaluate clinic wait time prediction parameters:
        - Hospital Department: ${dept.name}
        - Assigned Doctor: ${targetDoctor.name} (Avg consult duration: ${targetDoctor.avgDuration} mins, status: ${targetDoctor.availability})
        - Number of active patients ahead in queue: ${activeWaitingAhead}
        - Patient assigned priority: ${actPriority}
        - Emergency Override Active: ${!!isEmergency}

        Return a validated queue wait-time estimation (in minutes) and your prediction confidence percentage (1-100). Emergency/Critical should have extremely short wait time (1-3 minutes) with high confidence.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              estimatedMinutes: {
                type: Type.INTEGER,
                description: "A calculated realistic wait time projection in integers."
              },
              confidence: {
                type: Type.INTEGER,
                description: "Confidence parameter from 1 to 100."
              }
            },
            required: ["estimatedMinutes", "confidence"]
          }
        }
      });

      const parsed = JSON.parse(response.text.trim());
      finalWaitTime = parsed.estimatedMinutes;
      finalConfidence = parsed.confidence;
    } catch (err) {
      console.warn("Gemini wait predictor: falling back to local heuristic wait calculations.", err instanceof Error ? err.message : err);
    }
  }

  // Generate Token number sequence
  const deptCode = dept.name.toUpperCase().substring(0, 3);
  const deptAppointments = dbState.appointments.filter(a => a.departmentId === departmentId);
  const nextSeq = deptAppointments.length + 1;
  const tokenNumber = `${deptCode}-${nextSeq.toString().padStart(3, "0")}`;

  const id = `apt_${Date.now()}`;

  const newAppointment: Appointment = {
    id,
    tokenNumber,
    patientName,
    patientAge: Number(patientAge) || 30,
    patientGender: patientGender || "Male",
    symptoms: symptoms || "Routine medical checkup",
    priority: actPriority,
    departmentId,
    departmentName: dept.name,
    doctorId: targetDoctor.id,
    doctorName: targetDoctor.name,
    status: "Waiting",
    isEmergency: !!isEmergency,
    estimatedWaitTime: finalWaitTime,
    confidencePercentage: finalConfidence,
    createdAt: new Date().toISOString()
  };

  // IF critical/emergency or receptionist booked emergency:
  if (newAppointment.isEmergency || newAppointment.priority === "Critical") {
    // Insert at the front of the queue by re-arranging wait list if needed
    // In our simplified listing, we'll push it to dbState lists. Front-end will sorts queues securely.
    dbState.appointments.unshift(newAppointment);
  } else {
    dbState.appointments.push(newAppointment);
  }

  refreshDoctorAssignmentCounts();
  saveStateToDisk();

  res.json({ success: true, appointment: newAppointment });
});

// Update appointment status (called, completed, no-show)
app.post("/api/appointments/update-status", (req, res) => {
  const { appointmentId, status, notes } = req.body;
  const apt = dbState.appointments.find(a => a.id === appointmentId);
  if (!apt) {
    return res.status(404).json({ error: "Appointment record not found." });
  }

  apt.status = status; // 'Waiting' | 'Called' | 'Completed' | 'No Show'
  if (status === "Called") {
    apt.calledAt = new Date().toISOString();
  } else if (status === "Completed") {
    apt.completedAt = new Date().toISOString();
    if (notes) {
      apt.notes = notes;
    }
  }

  refreshDoctorAssignmentCounts();
  saveStateToDisk();

  res.json({ success: true, appointment: apt });
});

// Emergency patient override switcher - Admins & Receptionists can manually escalate any patient instantly
app.post("/api/appointments/emergency-override", (req, res) => {
  const { appointmentId, isEmergency, priority } = req.body;
  const apt = dbState.appointments.find(a => a.id === appointmentId);
  if (!apt) {
    return res.status(404).json({ error: "Appointment record not found." });
  }

  apt.isEmergency = isEmergency !== undefined ? isEmergency : true;
  apt.priority = priority || "Critical";
  apt.estimatedWaitTime = 2; // Immediate check in
  apt.confidencePercentage = 99;

  // Move this patient to the top of the wait queue
  const index = dbState.appointments.indexOf(apt);
  if (index > -1) {
    dbState.appointments.splice(index, 1);
  }
  dbState.appointments.unshift(apt);

  refreshDoctorAssignmentCounts();
  saveStateToDisk();

  res.json({ success: true, appointment: apt });
});

// Reset / Flush Queue State back to standard defaults for cleaner trials
app.post("/api/reset-state", (req, res) => {
  dbState = {
    departments: DEFAULT_DEPARTMENTS,
    doctors: DEFAULT_DOCTORS,
    appointments: generateInitialAppointments()
  };
  refreshDoctorAssignmentCounts();
  saveStateToDisk();
  res.json({ success: true, message: "Queue state reset back to pristine defaults successfully!" });
});

// ----------------------------------------------------
// GOOGLE GEMINI CHATBOT ASSISTANT ENDPOINT
// ----------------------------------------------------
app.post("/api/chat", async (req, res) => {
  const { messages, userRole } = req.body; // array of message objects with role/text

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "Messages array is required." });
  }

  const gemini = getGeminiClient();

  // Create a snapshot summary of the active hospital state, to feed into system context
  const activeWaitingList = dbState.appointments.filter(a => a.status === "Waiting");
  const activeCalledList = dbState.appointments.filter(a => a.status === "Called");
  const completedTodayList = dbState.appointments.filter(a => a.status === "Completed");

  const queueSummaryMarkdown = `
Hospital Active State Snapshot:
- Total Departments Online: ${dbState.departments.length}
- Register of Departments: ${dbState.departments.map(d => `${d.name} (${d.id})`).join(", ")}
- Available Doctors on Staff: ${dbState.doctors.map(d => `${d.name} - ${d.departmentName} (Status: ${d.availability})`).join(", ")}
- Patients Currently Waiting: ${activeWaitingList.length}
- Patients Currently Called/In Consultation: ${activeCalledList.length}
- Success Consultations Managed Today: ${completedTodayList.length}

Detailed Queue List (Waiting & Called):
${dbState.appointments
  .filter(a => a.status === "Waiting" || a.status === "Called")
  .map(a => `- Token: ${a.tokenNumber} | Patient: ${a.patientName} | Dept: ${a.departmentName} | Doctor: ${a.doctorName} | Priority: ${a.priority} | Status: ${a.status} (Wait prediction: ${a.estimatedWaitTime} min)`)
  .join("\n")}
`;

  const systemInstruction = `You are the ultimate digital "Smart Hospital Assistant" of the Hospital Queue Management System.
You support clients, patients, nurses, doctors, and general web users.
Your goals are to provide:
1. Hospital navigation help (e.g., Cardiology is wing A, Pediatrics is wing B, Orthopedics is level 2).
2. Queue status inquiry answers (e.g. telling a patient where they stand in line or reviewing assigned estimated wait times for a department).
3. Patient booking/registration triage (e.g. suggesting what department they should select based on their symptoms).
4. Directing queries relating to emergencies immediately to the reception portal.

Current user portal perspective: ${userRole || "Patient"}.
Be reassuring, highly informative, brief, and medically professional.

Here is the LIVE data currently in the database to answer precise queue inquiries:
${queueSummaryMarkdown}

Important guidelines:
- If a patient asks for their queue status or token, reference the token number if it matches, or find their name in the snapshot.
- Make recommendations for suitable departments when symptoms are explained.
- Answer questions with formatting using clean bullet points and markdown. Keep answers under 120 words.
- Do not mention databases or JSON file technical structures. Act as if you are connected directly to the hospital ward reception.`;

  if (gemini) {
    try {
      // Map message lists to Gemini standard
      const contents = messages.map(msg => ({
        role: msg.role === "user" ? "user" : "model",
        parts: [{ text: msg.text }]
      }));

      const response = await gemini.models.generateContent({
        model: "gemini-3.5-flash",
        contents,
        config: { systemInstruction }
      });

      return res.json({ response: response.text });
    } catch (err) {
      console.warn("Gemini Chat assistant offline: falling back to rule-based conversation engine.", err instanceof Error ? err.message : err);
    }
  }

  // Heuristic rule-based chat fallback answering general queries
  const lastUserText = messages[messages.length - 1]?.text?.toLowerCase() || "";
  let answer = "I'm the Smart Hospital Receptionist. Here is what I can assist with:\n\n- Type 'status' to get current queue statistics.\n- Type 'pediatrics' or other department names for directions.\n- Ask me to evaluate symptoms so I can recommend a clinic!";

  if (lastUserText.includes("status") || lastUserText.includes("queue") || lastUserText.includes("wait")) {
    answer = `🏥 **Live Ward Clinic Status**:\n\n` +
      `- **Emergency Cases Active**: ${dbState.appointments.filter(a => a.isEmergency && a.status === 'Waiting').length} patient(s)\n` +
      `- **General Medicine Wait List**: ${dbState.appointments.filter(a => a.departmentId === 'dept_general_medicine' && a.status === 'Waiting').length} patient(s)\n` +
      `- **Cardiology Queue**: ${dbState.appointments.filter(a => a.departmentId === 'dept_cardiology' && a.status === 'Waiting').length} patient(s)\n\n` +
      `Our current prediction confidence stands at **92%** based on average doctor speeds. Please book a token to lock your place in line!`;
  } else if (lastUserText.includes("chest") || lastUserText.includes("heart") || lastUserText.includes("cardiac")) {
    answer = `⚠️ **Critical Chest Pain Patient detected.** Please proceed immediately to Wing A - Room 102 (Cardiology clinic) or alerts our receptionist to trigger an **Emergency Override booking**. I strongly recommend the Cardiology Department immediately.`;
  } else if (lastUserText.includes("kid") || lastUserText.includes("child") || lastUserText.includes("childhood") || lastUserText.includes("baby") || lastUserText.includes("pediat")) {
    answer = `🧸 **Pediatrics Department Guideline**:\n\n` +
      `- Located in **Wing B (Level 1)**, adjacent to the hospital playground.\n` +
      `- Administered by Dr. Sarah Smith.\n` +
      `- Services: Child Immunizations, regular health logs, infant growth checkups.`;
  } else if (lastUserText.includes("where") || lastUserText.includes("navigat") || lastUserText.includes("location") || lastUserText.includes("room")) {
    answer = `📍 **Clinic Navigation Directory**:\n\n` +
      `- **Cardiology**: Wing A, Room 102 (First Floor)\n` +
      `- **Pediatrics**: Wing B, Room 105 (First Floor)\n` +
      `- **General Medicine**: Wing C, Rooms 108 & 109\n` +
      `- **Orthopedics**: Clinic Wing D, Second Floor\n` +
      `- **Ophthalmology (Eye Clinic)**: Room 204, Second Floor\n\n` +
      `Staff elevators are available at the eastern corridor of the central lobby.`;
  } else if (lastUserText.includes("book") || lastUserText.includes("appointment") || lastUserText.includes("token")) {
    answer = `📝 **Booking Token Instructions**:\n\n` +
      `1. Head over to the **Patient Portal** using the role selection toggle at the top.\n` +
      `2. Fill in your name, age, gender, and current symptoms.\n` +
      `3. Our AI engine will pre-classify your symptoms to map the appropriate department and priority level!\n` +
      `4. Verify your details, and press **Book Appoinment Token** to lock your position!`;
  }

  res.json({ response: answer });
});

// Serve frontend assets via Vite middleware in dev or express static files in production
async function runServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Smart Hospital Queue Management System fully loaded on http://0.0.0.0:${PORT}`);
  });
}

runServer();
