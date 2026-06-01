import React, { useState } from "react";
import { 
  PlusCircle, RefreshCw, AlertOctagon, Calendar, Trash2, 
  HelpCircle, Search, Sparkles, Brain, AlertTriangle, UserCheck 
} from "lucide-react";
import { motion } from "motion/react";
import { Department, Doctor, Appointment, PriorityLevel } from "../types";

interface ReceptionistPortalProps {
  departments: Department[];
  doctors: Doctor[];
  appointments: Appointment[];
  onRefresh: () => void;
}

export default function ReceptionistPortal({ departments, doctors, appointments, onRefresh }: ReceptionistPortalProps) {
  // Booking Form State
  const [patientName, setPatientName] = useState("");
  const [patientAge, setPatientAge] = useState("");
  const [patientGender, setPatientGender] = useState("Male");
  const [symptoms, setSymptoms] = useState("");
  const [selectedDeptId, setSelectedDeptId] = useState("");
  const [selectedDocId, setSelectedDocId] = useState("");
  const [selectedPriority, setSelectedPriority] = useState<PriorityLevel>("Normal");
  const [isEmergency, setIsEmergency] = useState(false);

  // Search Filter
  const [searchQuery, setSearchQuery] = useState("");

  // AI Assist State
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [aiResult, setAiResult] = useState<{
    priority: "Critical" | "High" | "Medium" | "Normal";
    recommendedDepartmentId: string;
    explanation: string;
  } | null>(null);

  // Booking Loader
  const [isBooking, setIsBooking] = useState(false);

  // Evaluate Symptoms via backend AI
  const handleAiPreEvaluate = async () => {
    if (!symptoms.trim()) {
      alert("Please enter initial symptoms description first!");
      return;
    }
    setIsEvaluating(true);
    setAiResult(null);

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
        setAiResult(data);
        
        // Auto-assign corresponding fields
        if (data.recommendedDepartmentId) {
          setSelectedDeptId(data.recommendedDepartmentId);
          // Default doctor lookup
          const matchingDoc = doctors.find(dr => dr.departmentId === data.recommendedDepartmentId && dr.availability !== "Offline");
          if (matchingDoc) {
            setSelectedDocId(matchingDoc.id);
          }
        }
        if (data.priority) {
          setSelectedPriority(data.priority);
          setIsEmergency(data.priority === "Critical");
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsEvaluating(false);
    }
  };

  // Submit Walk-in Form Book
  const handleRegisterPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientName.trim()) {
      alert("Patient Name is required!");
      return;
    }
    if (!selectedDeptId) {
      alert("Please assign a Department!");
      return;
    }

    setIsBooking(true);
    try {
      const payload = {
        patientName,
        patientAge,
        patientGender,
        symptoms,
        departmentId: selectedDeptId,
        doctorId: selectedDocId,
        priority: selectedPriority,
        isEmergency
      };

      const res = await fetch("/api/appointments/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        onRefresh();
        // Reset state
        setPatientName("");
        setPatientAge("");
        setSymptoms("");
        setSelectedDeptId("");
        setSelectedDocId("");
        setSelectedPriority("Normal");
        setIsEmergency(false);
        setAiResult(null);
      }
    } catch (err) {
      console.error(err);
      alert("Registration failed");
    } finally {
      setIsBooking(false);
    }
  };

  // Receptionist triggers emergency override instantly
  const handleInstantEmergency = async (aptId: string) => {
    try {
      const res = await fetch("/api/appointments/emergency-override", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointmentId: aptId, isEmergency: true, priority: "Critical" })
      });
      if (res.ok) {
        onRefresh();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Cancel or flag patient as Cancelled / No-show
  const handleCancelAppointment = async (aptId: string) => {
    if (!confirm("Are you sure you want to cancel this ticket slot?")) return;
    try {
      const res = await fetch("/api/appointments/update-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointmentId: aptId, status: "No Show" })
      });
      if (res.ok) {
        onRefresh();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Filter queue displays
  const activeQueuesFiltered = appointments.filter(a => {
    const isWaitingOrCalled = a.status === "Waiting" || a.status === "Called";
    const matchesSearch = a.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          a.tokenNumber.toLowerCase().includes(searchQuery.toLowerCase());
    return isWaitingOrCalled && matchesSearch;
  });

  return (
    <div className="mx-auto max-w-6xl p-4 font-sans text-slate-800">
      {/* Banner */}
      <div className="mb-6 rounded-3xl bg-gradient-to-r from-indigo-700 via-indigo-650 to-indigo-700 p-6 text-white shadow-lg border border-indigo-150/15 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div>
          <h1 className="text-xl font-black tracking-widest uppercase">Admissions & Reception Desk</h1>
          <p className="text-xs text-indigo-100 max-w-xl leading-relaxed mt-1">Coordinate walk-ins, resolve symptoms priority levels with AI triage checklists, and dispatch tokens instantly.</p>
        </div>
        <div className="rounded-full bg-white/10 px-4 py-1.5 text-xs font-black tracking-wider uppercase flex items-center gap-2 border border-white/10">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
          Reception Terminal Active
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT WORKSPACE: ADMIT FORM (5 COLUMNS) */}
        <div className="lg:col-span-5">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <h2 className="text-xs font-black tracking-widest text-slate-900 uppercase flex items-center gap-2">
              <PlusCircle className="h-4.5 w-4.5 text-indigo-600" />
              Register walk-in patient
            </h2>

            <form onSubmit={handleRegisterPatient} className="space-y-3.5 pt-1">
              {/* Patient Name */}
              <div>
                <label className="block text-[10px] font-black text-slate-700 uppercase tracking-wider mb-1">Patient Name</label>
                <input
                  type="text"
                  value={patientName}
                  onChange={e => setPatientName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 placeholder-slate-450"
                  required
                />
              </div>

              {/* Age & Gender */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-slate-700 uppercase tracking-wider mb-1">Age</label>
                  <input
                    type="number"
                    value={patientAge}
                    onChange={e => setPatientAge(e.target.value)}
                    placeholder="e.g. 35"
                    className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 placeholder-slate-450"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-700 uppercase tracking-wider mb-1">Gender</label>
                  <select
                    value={patientGender}
                    onChange={e => setPatientGender(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option>Male</option>
                    <option>Female</option>
                    <option>Other</option>
                  </select>
                </div>
              </div>

              {/* Rapid symptoms box */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-[10px] font-black text-slate-700 uppercase tracking-wider">Symptoms Reported</label>
                  <button
                    type="button"
                    onClick={handleAiPreEvaluate}
                    disabled={!symptoms.trim() || isEvaluating}
                    className="rounded-full bg-indigo-50 hover:bg-indigo-100 text-indigo-650 border border-indigo-200/60 text-[9px] font-black uppercase tracking-wider px-2.5 py-1 transition flex items-center gap-1.5 cursor-pointer disabled:bg-slate-100 disabled:text-slate-400"
                  >
                    {isEvaluating ? (
                      <>
                        <RefreshCw className="h-3 w-3 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3 w-3 text-indigo-600" />
                        AI Evaluate Symptoms
                      </>
                    )}
                  </button>
                </div>
                <textarea
                  rows={2}
                  value={symptoms}
                  onChange={e => setSymptoms(e.target.value)}
                  placeholder="Record patient reported symptoms..."
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder-slate-400 leading-relaxed focus:border-indigo-500 transition"
                />
              </div>

              {/* AI helper box */}
              {aiResult && (
                <div className="rounded-2xl border border-indigo-100/70 bg-gradient-to-br from-indigo-50/50 to-purple-50/30 p-4 space-y-1.5 shadow-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-black tracking-widest text-indigo-600 uppercase flex items-center gap-1">
                      <Brain className="h-4 w-4 text-indigo-600" />
                      Gemini Pre-Triage Recommendation
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-700 leading-relaxed font-medium">
                    {aiResult.explanation}
                  </p>
                </div>
              )}

              {/* Priority levels & Emergency */}
              <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-700 uppercase tracking-wider mb-1">Priority Flag</label>
                  <select
                    value={selectedPriority}
                    onChange={e => setSelectedPriority(e.target.value as PriorityLevel)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 font-medium"
                  >
                    <option value="Normal">Normal</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>

                <div className="flex flex-col justify-end">
                  <label className="flex items-center gap-2.5 cursor-pointer py-2">
                    <input
                      type="checkbox"
                      checked={isEmergency}
                      onChange={e => {
                        setIsEmergency(e.target.checked);
                        if (e.target.checked) setSelectedPriority("Critical");
                      }}
                      className="rounded text-rose-600 h-4.5 w-4.5 border-slate-300 focus:ring-rose-500 focus:ring-1 cursor-pointer"
                    />
                    <span className="text-[10px] font-black uppercase text-rose-650 tracking-wider">Urgent Emergency</span>
                  </label>
                </div>
              </div>

              {/* Clinic Category / Doctors */}
              <div className="grid grid-cols-1 gap-3.5 pt-1">
                <div>
                  <label className="block text-[10px] font-black text-slate-700 uppercase tracking-wider mb-1">Clinic Sector</label>
                  <select
                    value={selectedDeptId}
                    onChange={e => {
                      setSelectedDeptId(e.target.value);
                      const drs = doctors.filter(dr => dr.departmentId === e.target.value && dr.availability !== "Offline");
                      if (drs.length > 0) setSelectedDocId(drs[0].id);
                    }}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  >
                    <option value="">-- Choose department --</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>

                {selectedDeptId && (
                  <div>
                    <label className="block text-[10px] font-black text-slate-705 uppercase tracking-wider mb-1">Specialist Desk</label>
                    <select
                      value={selectedDocId}
                      onChange={e => setSelectedDocId(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      {doctors
                        .filter(dr => dr.departmentId === selectedDeptId)
                        .map(dr => (
                          <option key={dr.id} value={dr.id}>{dr.name} - ({dr.availability})</option>
                        ))}
                    </select>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={isBooking}
                className="w-full rounded-2xl bg-indigo-650 hover:bg-indigo-700 py-3.5 text-xs font-black uppercase tracking-widest text-white transition shadow-md hover:shadow-indigo-100 cursor-pointer disabled:bg-slate-200 disabled:text-slate-400 mt-2"
              >
                {isBooking ? "Locking Entrance Slot..." : "Generate Digital Token Slot"}
              </button>
            </form>
          </div>
        </div>

        {/* RIGHT WORKSPACE: LIVE TRIAGE QUEUE MONITOR (7 COLUMNS) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-100 pb-3.5 gap-3">
              <h3 className="text-xs font-black tracking-widest text-slate-900 uppercase flex items-center gap-1.5">
                <UserCheck className="h-5 w-5 text-indigo-600" />
                Live Ward Queue Monitor ({activeQueuesFiltered.length})
              </h3>
              
              {/* Quick Search */}
              <div className="relative w-full sm:w-auto">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Token # or Patient Name..."
                  className="rounded-2xl border border-slate-200 bg-white pl-8.5 pr-4 py-2 text-[11px] outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-550 w-full sm:w-48 transition"
                />
              </div>
            </div>

            {/* Patients list */}
            {activeQueuesFiltered.length > 0 ? (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {activeQueuesFiltered.map((apt) => (
                  <div
                    key={apt.id}
                    className={`rounded-2xl border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative transition-all ${
                      apt.isEmergency || apt.priority === "Critical"
                        ? "border-rose-200 bg-rose-55/35"
                        : "border-slate-150 bg-slate-50/50 hover:bg-slate-50"
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-indigo-700 font-mono tracking-tight text-sm">
                          {apt.tokenNumber}
                        </span>
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[8px] font-black uppercase tracking-wider border ${
                          apt.status === "Called" ? "bg-amber-50 text-amber-800 border-amber-200" : "bg-indigo-50 text-indigo-800 border-indigo-200"
                        }`}>
                          {apt.status === "Called" ? "In Consult" : "Waiting"}
                        </span>
                      </div>
                      <h4 className="text-xs font-black text-slate-900">{apt.patientName} ({apt.patientAge}y, {apt.patientGender})</h4>
                      <p className="text-[10px] text-slate-500 font-sans">
                        Dept: <span className="font-extrabold text-slate-800">{apt.departmentName}</span> | Doctor: <span className="text-slate-700 font-medium">{apt.doctorName}</span>
                      </p>
                      <p className="text-[10px] text-slate-450 italic mt-0.5">
                        Symptoms: "{apt.symptoms}"
                      </p>
                    </div>

                    <div className="flex flex-wrap sm:flex-col items-end gap-2.5 justify-end sm:justify-start">
                      {/* Priority Tag */}
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[8px] font-black uppercase tracking-widest text-white shrink-0 ${
                        apt.priority === "Critical" ? "bg-rose-500" :
                        apt.priority === "High" ? "bg-amber-500" :
                        apt.priority === "Medium" ? "bg-indigo-650" : "bg-slate-400"
                      }`}>
                        {apt.priority}
                      </span>

                      {/* Wait predict text */}
                      <span className="text-[10px] text-indigo-650 font-extrabold bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100/60 shrink-0">
                        {apt.estimatedWaitTime} min wait
                      </span>

                      {/* Management actions */}
                      <div className="flex gap-1.5 items-center mt-1.5">
                        {(!apt.isEmergency && apt.priority !== "Critical") && (
                          <button
                            onClick={() => handleInstantEmergency(apt.id)}
                            className="rounded-xl bg-white border border-rose-250 hover:bg-rose-50 text-rose-600 px-3 py-1.5 text-[8.5px] font-extrabold uppercase tracking-widest transition cursor-pointer"
                            title="Escalate instantly"
                          >
                            ⚠️ Urgent Code
                          </button>
                        )}
                        <button
                          onClick={() => handleCancelAppointment(apt.id)}
                          className="rounded-xl bg-white border border-slate-200 hover:bg-rose-50 p-2 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                          title="Trash / Cancel slot"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center p-12 text-gray-400 text-xs">
                No active patient matched searching criteria.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
