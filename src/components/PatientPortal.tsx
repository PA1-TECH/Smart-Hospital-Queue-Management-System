import React, { useState, useEffect } from "react";
import { 
  Calendar, CheckCircle, Clock, AlertTriangle, User, History, 
  ChevronRight, Brain, AlertOctagon, HelpCircle, UserPlus, Sparkles,
  Printer, X
} from "lucide-react";
import { motion } from "motion/react";
import { Department, Doctor, Appointment } from "../types";

interface PatientPortalProps {
  departments: Department[];
  doctors: Doctor[];
  appointments: Appointment[];
  onRefresh: () => void;
}

export default function PatientPortal({ departments, doctors, appointments, onRefresh }: PatientPortalProps) {
  // Booking Form State
  const [patientName, setPatientName] = useState("");
  const [patientAge, setPatientAge] = useState("");
  const [patientGender, setPatientGender] = useState("Male");
  const [symptoms, setSymptoms] = useState("");
  const [selectedDeptId, setSelectedDeptId] = useState("");
  const [selectedDocId, setSelectedDocId] = useState("");
  
  // AI assist state
  const [isAiEvaluating, setIsAiEvaluating] = useState(false);
  const [aiEvaluationResult, setAiEvaluationResult] = useState<{
    priority: "Critical" | "High" | "Medium" | "Normal";
    recommendedDepartmentId: string;
    explanation: string;
  } | null>(null);

  // Booking result/status
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTokenId, setActiveTokenId] = useState<string | null>(null);
  const [showPrintModal, setShowPrintModal] = useState(false);
  
  // Tab control inside Patient Portal: 'book' | 'track' | 'history'
  const [activeTab, setActiveTab] = useState<'book' | 'track' | 'history'>('book');

  // Load active tracker if patient booked previously
  useEffect(() => {
    // Look for active tickets in list
    const active = appointments.find(
      a => (a.status === "Waiting" || a.status === "Called") && a.patientName && a.id.startsWith("apt_")
    );
    if (active && !activeTokenId) {
      setActiveTokenId(active.id);
      setActiveTab('track');
    }
  }, [appointments]);

  // Handle AI Pre-evaluation for symptoms
  const handleAiPreEvaluate = async () => {
    if (!symptoms.trim()) {
      alert("Please describe your symptoms first to analyze.");
      return;
    }
    setIsAiEvaluating(true);
    setAiEvaluationResult(null);
    try {
      const res = await fetch("/api/appointments/priority-recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symptoms,
          age: patientAge,
          gender: patientGender
        })
      });
      if (res.ok) {
        const data = await res.json();
        setAiEvaluationResult(data);
        // Automatically precheck recommended department
        if (data.recommendedDepartmentId) {
          setSelectedDeptId(data.recommendedDepartmentId);
          // Auto assign first doctor from that dept
          const dList = doctors.filter(dr => dr.departmentId === data.recommendedDepartmentId && dr.availability !== "Offline");
          if (dList.length > 0) {
            setSelectedDocId(dList[0].id);
          }
        }
      }
    } catch (e) {
      console.error("Failed evaluating symptoms", e);
    } finally {
      setIsAiEvaluating(false);
    }
  };

  // Submit Booking
  const handleBookToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientName.trim()) {
      alert("Patient Name is required!");
      return;
    }
    if (!selectedDeptId) {
      alert("Please select a Clinical Department!");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        patientName,
        patientAge,
        patientGender,
        symptoms,
        departmentId: selectedDeptId,
        doctorId: selectedDocId,
        priority: aiEvaluationResult?.priority || "Normal",
        isEmergency: aiEvaluationResult?.priority === "Critical"
      };

      const res = await fetch("/api/appointments/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setActiveTokenId(data.appointment.id);
          onRefresh();
          setActiveTab('track');
          // Reset form fields
          setPatientName("");
          setPatientAge("");
          setSymptoms("");
          setAiEvaluationResult(null);
        }
      } else {
        const errorData = await res.json();
        alert(errorData.error || "Booking failed");
      }
    } catch (err) {
      console.error(err);
      alert("Network booking failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Resolve Active Ticket Data
  const activeTicket = appointments.find(a => a.id === activeTokenId);
  
  // Calculate relative position ahead
  const getQueuePositionDetails = (ticket: Appointment) => {
    // Gather all waiting tasks for this doctor or department in created order
    let deptQueue = appointments.filter(
      a => a.departmentId === ticket.departmentId && a.status === "Waiting"
    );
    
    // Sort so critical emergency ones and earlier bookings are at the top
    deptQueue.sort((a, b) => {
      if (a.isEmergency && !b.isEmergency) return -1;
      if (!a.isEmergency && b.isEmergency) return 1;
      // High priority first
      const priorityWeights = { Critical: 4, High: 3, Medium: 2, Normal: 1 };
      const weightA = priorityWeights[a.priority] || 1;
      const weightB = priorityWeights[b.priority] || 1;
      if (weightA !== weightB) return weightB - weightA;
      // chronological
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    const index = deptQueue.findIndex(a => a.id === ticket.id);
    const activeConsulting = appointments.find(
      a => a.departmentId === ticket.departmentId && a.status === "Called" && a.doctorId === ticket.doctorId
    );

    return {
      indexAhead: index < 0 ? 0 : index,
      currentlyConsulting: activeConsulting ? activeConsulting.tokenNumber : "None"
    };
  };

  // Dedicated dynamic thermal slip print engine
  const handlePrintTicket = (ticket: Appointment) => {
    const iframe = document.createElement("iframe");
    iframe.style.position = "absolute";
    iframe.style.width = "0px";
    iframe.style.height = "0px";
    iframe.style.border = "none";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (doc) {
      doc.open();
      doc.write(`
        <html>
          <head>
            <title>Print Token - ${ticket.tokenNumber}</title>
            <style>
              @import url('https://fonts.googleapis.com/css2?family=Courier+Prime:wght@400;700&family=Inter:wght@400;600;800&display=swap');
              body {
                font-family: 'Courier Prime', Courier, monospace;
                margin: 0;
                padding: 15px;
                color: #000;
                background-color: #fff;
                width: 300px;
              }
              .receipt {
                width: 100%;
                border: 1px dashed #000;
                padding: 12px;
                box-sizing: border-box;
                text-align: center;
              }
              .header {
                font-weight: 800;
                font-size: 15px;
                margin-bottom: 3px;
                text-transform: uppercase;
                font-family: 'Inter', sans-serif;
                letter-spacing: 0.5px;
              }
              .subheader {
                font-size: 9px;
                margin-bottom: 12px;
                font-family: 'Inter', sans-serif;
                letter-spacing: 0.5px;
                color: #555;
              }
              .divider {
                border-top: 1px dashed #000;
                margin: 10px 0;
              }
              .token-num {
                font-size: 34px;
                font-weight: 700;
                margin: 8px 0;
                letter-spacing: 1px;
              }
              .details-table {
                width: 100%;
                font-size: 11px;
                text-align: left;
                margin-top: 8px;
              }
              .details-table td {
                padding: 2px 0;
                vertical-align: top;
              }
              .details-table td.label {
                font-weight: bold;
                width: 42%;
              }
              .barcode {
                font-size: 16px;
                letter-spacing: 2px;
                margin: 12px 0 3px 0;
                font-weight: normal;
              }
              .footer-msg {
                font-size: 8.5px;
                margin-top: 12px;
                line-height: 1.4;
                font-family: 'Inter', sans-serif;
                color: #444;
              }
              @media print {
                body {
                  padding: 0;
                }
                .receipt {
                  border: none;
                }
              }
            </style>
          </head>
          <body>
            <div class="receipt">
              <div class="header">Genesys Care clinic</div>
              <div class="subheader">SMART CONGESTION CLINIC SYSTEM</div>
              <div class="divider"></div>
              
              <div style="font-size: 9.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; font-family: 'Inter', sans-serif;">CLINICAL VISIT TOKEN</div>
              <div class="token-num">${ticket.tokenNumber}</div>
              
              <div class="divider"></div>
              
              <table class="details-table">
                <tr>
                  <td class="label">Patient Name:</td>
                  <td>${ticket.patientName}</td>
                </tr>
                <tr>
                  <td class="label">Age / Gender:</td>
                  <td>${ticket.patientAge}y / ${ticket.patientGender}</td>
                </tr>
                <tr>
                  <td class="label">Specialist:</td>
                  <td>${ticket.doctorName}</td>
                </tr>
                <tr>
                  <td class="label">Specialty Wing:</td>
                  <td>${ticket.departmentName}</td>
                </tr>
                <tr>
                  <td class="label">Priority Rank:</td>
                  <td style="font-weight: bold;">${ticket.priority}</td>
                </tr>
                <tr>
                  <td class="label">Est. Wait:</td>
                  <td>${ticket.status === "Called" ? "0 mins" : ticket.estimatedWaitTime + " mins"}</td>
                </tr>
                <tr>
                  <td class="label">Issued At:</td>
                  <td>${new Date(ticket.createdAt).toLocaleString()}</td>
                </tr>
              </table>
              
              <div class="divider"></div>
              
              <div class="barcode">||||  || |||||  ||| | ||||</div>
              <div style="font-size: 8.5px; font-weight: bold; margin-bottom: 5px;">*${ticket.id.toUpperCase()}*</div>
              
              <div class="footer-msg">
                Your place is monitored dynamically.<br>
                Please follow the video status monitors.<br>
                Thank you for your cooperation!
              </div>
            </div>
            <script>
              window.onload = function() {
                window.print();
                setTimeout(function() {
                  window.frameElement.remove();
                }, 100);
              };
            </script>
          </body>
        </html>
      `);
      doc.close();
    }
  };

  // Gather past visits
  const historicalTickets = appointments.filter(
    a => a.status === "Completed" && a.id.startsWith("apt_")
  );

  return (
    <div className="mx-auto max-w-6xl p-4 font-sans text-slate-800">
      {/* Patient Header Banner */}
      <div className="mb-6 rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-650 to-violet-700 p-6 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10">
          <h1 className="text-2xl font-black tracking-tight">Patient Care Hub</h1>
          <p className="mt-2 text-xs text-indigo-100/90 leading-relaxed max-w-xl">
            Book digital tokens, track doctors live, view AI waiting duration, and review clinic medical notes.
          </p>
        </div>

        {/* Dynamic Warning Notification */}
        {activeTicket && (
          <div className="mt-4 relative z-10">
            {activeTicket.status === "Called" ? (
              <div className="animate-pulse flex items-center gap-3 rounded-2xl bg-rose-600 border border-rose-500/30 p-4 text-xs font-bold text-white shadow-lg">
                <AlertOctagon className="h-5 w-5 shrink-0" />
                <span>
                  ⏰ <strong>URGENT:</strong> Your Token <strong>{activeTicket.tokenNumber}</strong> is called! Please proceed immediately to <strong>{activeTicket.doctorName}</strong>'s room!
                </span>
              </div>
            ) : getQueuePositionDetails(activeTicket).indexAhead === 0 ? (
              <div className="flex items-center gap-2 rounded-2xl bg-amber-550 border border-amber-500/25 p-3.5 text-xs font-semibold text-white shadow-md">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>
                  📢 <strong>Your turn is up next!</strong> Only 1 patient ahead. Please wait near the clinic doors of <strong>{activeTicket.doctorName}</strong>.
                </span>
              </div>
            ) : null}
          </div>
        )}
        <div className="absolute -right-4 -bottom-4 w-32 h-32 bg-white opacity-[0.06] rounded-full blur-2xl"></div>
      </div>

      {/* Internal Navigation Tabs */}
      <div className="mb-6 flex border-b border-slate-200 overflow-x-auto whitespace-nowrap">
        <button
          onClick={() => setActiveTab('book')}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-xs font-semibold tracking-wide transition-all cursor-pointer ${
            activeTab === 'book'
              ? "border-indigo-600 text-indigo-600 font-extrabold"
              : "border-transparent text-slate-500 hover:text-indigo-600 hover:border-slate-300"
          }`}
        >
          <UserPlus className="h-4 w-4" />
          Book Digital Token
        </button>
        <button
          onClick={() => setActiveTab('track')}
          className={`relative flex items-center gap-2 border-b-2 px-5 py-3 text-xs font-semibold tracking-wide transition-all cursor-pointer ${
            activeTab === 'track'
              ? "border-indigo-600 text-indigo-600 font-extrabold"
              : "border-transparent text-slate-500 hover:text-indigo-600 hover:border-slate-300"
          }`}
        >
          <Clock className="h-4 w-4" />
          Live Tracker Status
          {activeTicket && (
            <span className="absolute -top-1 -right-0.5 min-w-4 rounded-full bg-rose-500 text-[9px] text-white px-1 py-0.5 text-center font-bold">
              1
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-xs font-semibold tracking-wide transition-all cursor-pointer ${
            activeTab === 'history'
              ? "border-indigo-600 text-indigo-600 font-extrabold"
              : "border-transparent text-slate-500 hover:text-indigo-600 hover:border-slate-300"
          }`}
        >
          <History className="h-4 w-4" />
          Consultation Chronicles ({historicalTickets.length})
        </button>
      </div>

      {/* VIEWPORT CONTROLLER */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN: PRIMARY WORKSPACE */}
        <div className="lg:col-span-2">
          {activeTab === 'book' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <h2 className="text-base font-black text-slate-900 mb-6 flex items-center gap-2 pb-3 border-b border-slate-100">
                <Calendar className="h-5 w-5 text-indigo-600" />
                Book Clinic Entrance Token
              </h2>

              <form onSubmit={handleBookToken} className="space-y-5">
                {/* Name */}
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-slate-400 font-extrabold mb-1.5">
                    Patient Full Name
                  </label>
                  <input
                    type="text"
                    value={patientName}
                    onChange={e => setPatientName(e.target.value)}
                    placeholder="e.g. Thomas Higgins"
                    className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-xs focus:ring-1 focus:ring-indigo-550 focus:border-indigo-600 focus:outline-none text-slate-800 placeholder-slate-400/70"
                    required
                  />
                </div>

                {/* Age & Gender */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest text-slate-400 font-extrabold mb-1.5">
                      Age
                    </label>
                    <input
                      type="number"
                      value={patientAge}
                      onChange={e => setPatientAge(e.target.value)}
                      placeholder="Years"
                      className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-xs focus:ring-1 focus:ring-indigo-550 focus:border-indigo-600 focus:outline-none text-slate-800 placeholder-slate-400/70"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest text-slate-400 font-extrabold mb-1.5">
                      Gender
                    </label>
                    <select
                      value={patientGender}
                      onChange={e => setPatientGender(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs focus:ring-1 focus:ring-indigo-550 focus:border-indigo-600 focus:outline-none text-slate-800"
                    >
                      <option>Male</option>
                      <option>Female</option>
                      <option>Other</option>
                    </select>
                  </div>
                </div>

                {/* Symptoms Description */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-[10px] uppercase tracking-widest text-slate-400 font-extrabold">
                      Symptom Description / Concern
                    </label>
                    <button
                      type="button"
                      onClick={handleAiPreEvaluate}
                      disabled={!symptoms.trim() || isAiEvaluating}
                      className="flex items-center gap-1.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-200 px-3 py-1 text-[10px] font-bold hover:bg-indigo-150 active:scale-95 duration-150 transition-all disabled:bg-slate-50 disabled:text-slate-400 disabled:border-transparent cursor-pointer"
                    >
                      {isAiEvaluating ? (
                        <>
                          <Clock className="h-3.5 w-3.5 animate-spin" />
                          AI Assessing...
                        </>
                      ) : (
                        <>
                          <Brain className="h-3.5 w-3.5 animate-pulse" />
                          Evaluate Symptoms
                        </>
                      )}
                    </button>
                  </div>
                  <textarea
                    rows={4}
                    value={symptoms}
                    onChange={e => setSymptoms(e.target.value)}
                    placeholder="Describe symptoms briefly (e.g., 'Cough and high fever since last night, asthma history')"
                    className="w-full rounded-2xl border border-slate-200 p-4 text-xs focus:ring-1 focus:ring-indigo-550 focus:border-indigo-600 focus:outline-none text-slate-800 placeholder-slate-400/70 leading-relaxed"
                  />
                </div>

                {/* AI recommendation Result Box */}
                {aiEvaluationResult && (
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="rounded-3xl border border-indigo-100 bg-indigo-50/50 p-5 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold tracking-widest text-indigo-605 uppercase flex items-center gap-1">
                        <Sparkles className="h-3.5 w-3.5 text-yellow-500 animate-spin-slow" />
                        AI Triage Report
                      </span>
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-white ${
                        aiEvaluationResult.priority === "Critical" ? "bg-rose-600" :
                        aiEvaluationResult.priority === "High" ? "bg-amber-500" :
                        aiEvaluationResult.priority === "Medium" ? "bg-indigo-500" : "bg-slate-500"
                      }`}>
                        Priority: {aiEvaluationResult.priority}
                      </span>
                    </div>
                    <p className="text-xs text-indigo-900 font-medium font-sans leading-relaxed">
                      "{aiEvaluationResult.explanation}"
                    </p>
                    <p className="text-[10px] text-indigo-500 font-extrabold uppercase tracking-wide">
                      Recommended Wing routing: <span className="text-indigo-700">{departments.find(d => d.id === aiEvaluationResult.recommendedDepartmentId)?.name || 'General Clinic'}</span>
                    </p>
                  </motion.div>
                )}

                {/* Department Selection */}
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-slate-400 font-extrabold mb-1.5">
                    Clinic Specialty / Dept. Sector
                  </label>
                  <select
                    value={selectedDeptId}
                    onChange={e => {
                      setSelectedDeptId(e.target.value);
                      // Default to first doctor in department
                      const d = doctors.filter(dr => dr.departmentId === e.target.value && dr.availability !== "Offline");
                      if (d.length > 0) setSelectedDocId(d[0].id);
                    }}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs focus:ring-1 focus:ring-indigo-550 focus:border-indigo-600 focus:outline-none"
                    required
                  >
                    <option value="">-- Choose Department --</option>
                    {departments.map(dept => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name} ({dept.description})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Doctor selection */}
                {selectedDeptId && (
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest text-slate-400 font-extrabold mb-1.5">
                      Practitioner Specialist
                    </label>
                    <select
                      value={selectedDocId}
                      onChange={e => setSelectedDocId(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs focus:ring-1 focus:ring-indigo-550 focus:border-indigo-600 focus:outline-none"
                    >
                      {doctors
                        .filter(dr => dr.departmentId === selectedDeptId)
                        .map(dr => (
                          <option key={dr.id} value={dr.id}>
                            {dr.name} ({dr.availability})
                          </option>
                        ))}
                    </select>
                  </div>
                )}

                {/* Book Trigger Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full rounded-2xl bg-indigo-600 py-3.5 text-xs font-black uppercase tracking-widest text-white hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-100 transition-all duration-300 shadow-md cursor-pointer disabled:bg-slate-200 disabled:text-slate-400"
                >
                  {isSubmitting ? "Locking Entrance Slot..." : "Generate Digital Token"}
                </button>
              </form>
            </motion.div>
          )}

          {activeTab === 'track' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6"
            >
              {activeTicket ? (
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
                  {/* Token Big Number and status */}
                  <div className="flex flex-col md:flex-row items-center justify-between border-b border-slate-100 pb-5 gap-4">
                    <div className="text-center md:text-left">
                      <p className="text-[10px] uppercase tracking-widest text-slate-400 font-extrabold">Active Token Number</p>
                      <h3 className="text-4xl font-black text-indigo-600 tracking-tight mt-1">{activeTicket.tokenNumber}</h3>
                      <p className="text-xs text-slate-500 mt-2">
                        Registered Patient: <span className="font-bold text-slate-800">{activeTicket.patientName}</span>
                      </p>
                    </div>

                    <div className="text-center md:text-right space-y-1">
                      <span className={`inline-flex rounded-full px-3.5 py-1 text-xs font-black tracking-wide uppercase ${
                        activeTicket.status === "Called"
                          ? "bg-rose-50 text-rose-650 animate-pulse border border-rose-200"
                          : "bg-indigo-50 text-indigo-700 border border-indigo-200"
                      }`}>
                        {activeTicket.status === "Called" ? "In Consultation" : "Waiting in Queue"}
                      </span>
                      <p className="text-[10px] text-slate-400 font-semibold tracking-wider block">Booked at: {new Date(activeTicket.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                    </div>
                  </div>

                  {/* Queue Metrics Container */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Live queue position */}
                    <div className="rounded-2xl border border-slate-250/60 p-5 bg-slate-50/50 text-center">
                      <User className="h-5 w-5 text-indigo-600 mx-auto mb-2" />
                      <p className="text-[10px] font-extrabold tracking-widest uppercase text-slate-400">Queue Position</p>
                      <p className="text-2xl font-black text-slate-900 mt-1">
                        {activeTicket.status === "Called" ? "In Session" : getQueuePositionDetails(activeTicket).indexAhead}
                      </p>
                      <p className="text-[10px] text-slate-500 mt-1 font-semibold">patients ahead of you</p>
                    </div>

                    {/* AI predicted wait duration */}
                    <div className="rounded-2xl border border-slate-250/60 p-5 bg-indigo-50/30 text-center">
                      <Clock className="h-5 w-5 text-indigo-600 mx-auto mb-2 animate-spin-slow" />
                      <p className="text-[10px] font-extrabold tracking-widest uppercase text-slate-400">AI Estimated Wait</p>
                      <p className="text-2xl font-black text-indigo-600 mt-1">
                        {activeTicket.status === "Called" ? "0" : activeTicket.estimatedWaitTime} <span className="text-xs font-normal text-slate-500">mins</span>
                      </p>
                      <p className="text-[10px] text-indigo-500 mt-1 font-semibold">predicted by CareBot AI</p>
                    </div>

                    {/* AI Confidence estimation */}
                    <div className="rounded-2xl border border-slate-250/60 p-5 bg-slate-50/50 text-center">
                      <Brain className="h-5 w-5 text-emerald-600 mx-auto mb-2" />
                      <p className="text-[10px] font-extrabold tracking-widest uppercase text-slate-400">Confidence Rating</p>
                      <p className="text-2xl font-black text-emerald-600 mt-1">
                        {activeTicket.confidencePercentage}%
                      </p>
                      <p className="text-[10px] text-slate-550 mt-1 font-semibold">historical data match</p>
                    </div>
                  </div>

                  {/* Doctor Assignment description */}
                  <div className="rounded-2xl border border-slate-200 p-4 bg-slate-50/40 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] uppercase text-slate-400 font-extrabold tracking-wider">Assigned Practitioner</p>
                      <h4 className="text-sm font-bold text-slate-800 mt-0.5">{activeTicket.doctorName}</h4>
                      <p className="text-xs text-slate-500">{activeTicket.departmentName} Clinic</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] uppercase text-slate-400 font-extrabold tracking-wider">Current Ward Active Token</p>
                      <p className="text-sm font-black text-indigo-600 mt-0.5">
                        {getQueuePositionDetails(activeTicket).currentlyConsulting}
                      </p>
                    </div>
                  </div>

                  {/* Refresh state & Print Ticket Slip */}
                  <div className="flex flex-wrap gap-2.5 justify-end items-center">
                    <button
                      onClick={() => setShowPrintModal(true)}
                      className="flex items-center gap-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-4 py-2 text-xs font-extrabold uppercase tracking-widest transition cursor-pointer border border-indigo-100"
                    >
                      <Printer className="h-3.5 w-3.5" />
                      Print Token
                    </button>
                    <button
                      onClick={onRefresh}
                      className="flex items-center gap-2 rounded-xl bg-slate-100 hover:bg-slate-200 px-4 py-2 text-xs font-bold text-slate-700 transition cursor-pointer"
                    >
                      <RefreshCwIcon className="h-3.5 w-3.5" />
                      Force Live Position Refresh
                    </button>
                  </div>
                </div>
              ) : (
                <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-10 text-center space-y-4">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-slate-50 text-slate-400">
                    <Clock className="h-6 w-6" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-700">No active ticket booked yet</h3>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                    Toggle onto our Booking tab above to specify your symptoms and secure a live slot inside the clinics.
                  </p>
                  <button
                    onClick={() => setActiveTab('book')}
                    className="rounded-2xl bg-indigo-600 hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-100 px-5 py-2.5 text-xs font-black uppercase tracking-widest text-white transition-all duration-200 shadow-md cursor-pointer"
                  >
                    Go Book Token Position
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'history' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4"
            >
              <h2 className="text-base font-black text-slate-900 mb-4 flex items-center gap-2">
                <History className="h-5 w-5 text-indigo-600" />
                Previous Clinical Visits
              </h2>
              
              {historicalTickets.length > 0 ? (
                <div className="space-y-4">
                  {historicalTickets.map((ticket) => (
                    <div
                      key={ticket.id}
                      className="rounded-3xl border border-slate-200 bg-white p-5 hover:border-indigo-200 transition-all shadow-sm"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 mb-3 gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-extrabold text-slate-900">{ticket.patientName} ({ticket.patientAge}y)</h4>
                            <span className="rounded-full bg-slate-100 border border-slate-200 text-[9px] px-2.5 py-0.5 text-slate-600 font-mono font-bold">
                              {ticket.tokenNumber}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-450 font-bold uppercase tracking-wider mt-0.5 mt-1">Department: {ticket.departmentName} | Doctor: {ticket.doctorName}</p>
                        </div>
                        <div className="sm:text-right">
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 px-3 py-1 text-xs font-black uppercase tracking-wider text-[10px]">
                            <CheckCircle className="h-3.5 w-3.5" />
                            Completed
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="text-xs text-slate-700 leading-relaxed">
                          <span className="font-extrabold text-slate-400 uppercase tracking-wider text-[9px] block">Symptoms Presented</span>
                          <span className="text-slate-700 font-medium block mt-1">"{ticket.symptoms}"</span>
                        </div>
                        
                        {ticket.notes && (
                          <div className="rounded-2xl bg-slate-50 border border-slate-150 p-4 mt-3 text-xs">
                            <span className="font-extrabold text-indigo-600 uppercase tracking-widest text-[9px] block mb-1">Clinical Diagnosis & Notes</span>
                            <p className="text-gray-700 font-medium leading-relaxed italic">"{ticket.notes}"</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-3xl border border-dashed border-slate-250 p-10 text-center space-y-4">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                    <History className="h-6 w-6" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-700">No visitation records found</h3>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                    Completed doctor consult records from the central desk will outline diagnosis notes securely in this portal.
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </div>

        {/* RIGHT COLUMN: INFORMATION RAIL & INSTRUCTIONS */}
        <div className="space-y-6">
          {/* Active Ticket Quick Widget */}
          {activeTicket && activeTab !== 'track' && (
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              className="rounded-3xl bg-slate-900 text-white p-6 space-y-4 shadow-lg border border-slate-800 relative overflow-hidden"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-indigo-400 tracking-widest uppercase">Your Active Slot</span>
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
              </div>

              <div>
                <h4 className="text-3xl font-black text-white tracking-wide">{activeTicket.tokenNumber}</h4>
                <p className="text-xs text-slate-300 mt-1">Position: <span className="text-indigo-300 font-extrabold">{getQueuePositionDetails(activeTicket).indexAhead} ahead</span></p>
              </div>

              <button
                onClick={() => setActiveTab('track')}
                className="w-full rounded-2xl bg-indigo-650 hover:bg-indigo-600 text-white py-2.5 text-xs font-black uppercase tracking-widest transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
              >
                Track Live Progress
                <ChevronRight className="h-4 w-4" />
              </button>
            </motion.div>
          )}

          {/* Department Locations Directory Card */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <h3 className="text-xs font-black text-slate-900 tracking-widest uppercase pb-2 border-b border-indigo-100/50">Clinic Directory & Wings</h3>
            
            <div className="space-y-3">
              <div className="flex items-start gap-2.5 pb-2.5 border-b border-slate-100">
                <div className="h-2.5 w-2.5 rounded-full bg-rose-500 mt-1"></div>
                <div className="text-xs">
                  <h4 className="font-extrabold text-slate-800">Cardiology Sector</h4>
                  <p className="text-slate-500 mt-0.5">Wing A, Room 102 (Floor 1)</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 pb-2.5 border-b border-slate-100">
                <div className="h-2.5 w-2.5 rounded-full bg-indigo-500 mt-1"></div>
                <div className="text-xs">
                  <h4 className="font-extrabold text-slate-800">Pediatrics Sector</h4>
                  <p className="text-slate-500 mt-0.5">Wing B, Room 105 (Floor 1)</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 pb-2.5 border-b border-slate-100">
                <div className="h-2.5 w-2.5 rounded-full bg-violet-500 mt-1"></div>
                <div className="text-xs">
                  <h4 className="font-extrabold text-slate-800">General Medicine Sector</h4>
                  <p className="text-slate-500 mt-0.5">Wing C, Rooms 108 & 109</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 pb-2.5 border-b border-slate-100">
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 mt-1"></div>
                <div className="text-xs">
                  <h4 className="font-extrabold text-slate-800">Orthopedics Clinical Ward</h4>
                  <p className="text-slate-500 mt-0.5">Wing D, Second Floor</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="h-2.5 w-2.5 rounded-full bg-amber-500 mt-1"></div>
                <div className="text-xs">
                  <h4 className="font-extrabold text-slate-800">Ophthalmology Clinic</h4>
                  <p className="text-slate-500 mt-0.5">Room 204, Second Floor</p>
                </div>
              </div>
            </div>
          </div>

          {/* Need assistance instructions card */}
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 relative overflow-hidden">
            <h4 className="text-xs font-black text-slate-900 tracking-widest uppercase mb-1.5">Need Interactive Advice?</h4>
            <p className="text-xs text-slate-500 leading-relaxed mb-3">
              Explain your health concern, symptom details, or directional queries to our <strong>AI CareBot</strong> floating at the bottom right anytime!
            </p>
            <div className="text-[10px] text-indigo-650 font-extrabold uppercase tracking-widest flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-indigo-600 animate-ping"></span>
              CareBot AI Online (GEMINI API)
            </div>
          </div>
        </div>
      </div>

      {/* SKEUOMORPHIC THERMAL SLIP PRINT MODAL */}
      {showPrintModal && activeTicket && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-slate-100 rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 relative text-slate-800"
          >
            {/* Close trigger button */}
            <button
              onClick={() => setShowPrintModal(false)}
              className="absolute top-4 right-4 h-8 w-8 flex items-center justify-center rounded-full bg-slate-200/80 hover:bg-slate-300 text-slate-600 transition cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="text-center mb-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">Token Printer Preview</h3>
              <p className="text-[10px] text-slate-400 mt-1">Simulated thermal receipt roll style</p>
            </div>

            {/* Thermal Slip Content Area */}
            <div 
              id="thermal-receipt-printable" 
              className="bg-white border text-left border-slate-200 p-5 rounded-2xl shadow-sm font-mono text-xs text-slate-950 relative overflow-hidden"
              style={{ minHeight: "380px" }}
            >
              <div className="text-center space-y-1">
                <span className="font-extrabold text-[13px] tracking-tight text-slate-900 block font-sans">GENESYS CARE CLINIC</span>
                <span className="text-[8px] text-slate-500 block uppercase tracking-wider font-sans">Wait Congestion Intelligent Triage</span>
                <div className="border-t border-dashed border-slate-300 my-2"></div>
                
                <span className="text-[9px] text-slate-500 tracking-widest block uppercase font-sans">VISIT PASS TOKEN NO.</span>
                <span className="text-4xl font-extrabold text-indigo-700 tracking-wider block my-2">
                  {activeTicket.tokenNumber}
                </span>
                
                <div className="border-t border-dashed border-slate-300 my-2"></div>
              </div>

              {/* Data specifications list */}
              <table className="w-full text-[10.5px] border-collapse text-left my-3 font-mono leading-relaxed">
                <tbody>
                  <tr>
                    <td className="font-bold text-slate-500 pr-1 py-0.5">Patient:</td>
                    <td className="text-slate-955 break-all font-semibold">{activeTicket.patientName}</td>
                  </tr>
                  <tr>
                    <td className="font-bold text-slate-500 pr-1 py-0.5">Age/Gender:</td>
                    <td className="text-slate-800 font-semibold">{activeTicket.patientAge}y / {activeTicket.patientGender}</td>
                  </tr>
                  <tr>
                    <td className="font-bold text-slate-500 pr-1 py-0.5">Specialist:</td>
                    <td className="font-extrabold text-slate-900">{activeTicket.doctorName}</td>
                  </tr>
                  <tr>
                    <td className="font-bold text-slate-500 pr-1 py-0.5">Sector:</td>
                    <td className="text-slate-800">{activeTicket.departmentName}</td>
                  </tr>
                  <tr>
                    <td className="font-bold text-slate-500 pr-1 py-0.5">Priority:</td>
                    <td className="font-extrabold text-indigo-650">{activeTicket.priority} Rank</td>
                  </tr>
                  <tr>
                    <td className="font-bold text-slate-500 pr-1 py-0.5">Est. Wait:</td>
                    <td className="font-bold text-slate-900">
                      {activeTicket.status === "Called" ? "0 mins" : `${activeTicket.estimatedWaitTime} mins`}
                    </td>
                  </tr>
                  <tr>
                    <td className="font-bold text-slate-500 pr-1 py-0.5">Registered:</td>
                    <td className="text-[9.5px] text-slate-600">{new Date(activeTicket.createdAt).toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>

              <div className="border-t border-dashed border-slate-300 my-3"></div>

              {/* Barcode artwork */}
              <div className="text-center space-y-1 py-1">
                <div className="text-base tracking-widest leading-none font-normal text-slate-800 select-none">
                  ||||  || |||||  ||| | ||||
                </div>
                <div className="text-[8px] font-bold text-slate-500 font-mono tracking-wider">
                  *{activeTicket.id.toUpperCase()}*
                </div>
              </div>

              <div className="text-center text-[8.5px] text-slate-500 mt-3 border-t border-dotted border-slate-200 pt-2 leading-relaxed font-sans font-semibold">
                Please preserve this ticket pass.<br />
                Monitor the clinic display panel outside.
              </div>
            </div>

            {/* Print Confirmation Actions */}
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowPrintModal(false)}
                className="w-full rounded-2xl bg-slate-200 hover:bg-slate-300 text-slate-700 py-3 text-xs font-bold transition cursor-pointer"
              >
                Close Preview
              </button>
              <button
                onClick={() => {
                  handlePrintTicket(activeTicket);
                  setShowPrintModal(false);
                }}
                className="w-full rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold uppercase py-3 text-xs tracking-wider transition shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Printer className="h-4 w-4" />
                Print Now
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

// Minimalistic local icon
function RefreshCwIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
      <path d="M16 16h5v5" />
    </svg>
  );
}
