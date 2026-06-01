import React, { useState } from "react";
import { 
  Users, UserCheck, Play, CheckCircle, AlertTriangle, AlertOctagon, 
  Settings, HeartPulse, Stethoscope, RefreshCw, X, Radio 
} from "lucide-react";
import { motion } from "motion/react";
import { Doctor, Appointment, PriorityLevel } from "../types";

interface DoctorPortalProps {
  doctors: Doctor[];
  appointments: Appointment[];
  onRefresh: () => void;
}

export default function DoctorPortal({ doctors, appointments, onRefresh }: DoctorPortalProps) {
  const [selectedDocId, setSelectedDocId] = useState<string>("");
  const [clinicalNotes, setClinicalNotes] = useState<string>("");
  const [updatingAptId, setUpdatingAptId] = useState<string | null>(null);

  // Filter doctor details
  const activeDoc = doctors.find(d => d.id === selectedDocId);

  // Filter patients waiting specifically for this doctor
  const waitingPatients = appointments.filter(
    a => a.doctorId === selectedDocId && a.status === "Waiting"
  );

  // Sort queue by priority levels or timestamps: Emergency/Critical first, then chronological
  const sortQueue = (list: Appointment[]) => {
    return [...list].sort((a, b) => {
      if (a.isEmergency && !b.isEmergency) return -1;
      if (!a.isEmergency && b.isEmergency) return 1;
      const priorityWeights = { Critical: 4, High: 3, Medium: 2, Normal: 1 };
      const weightA = priorityWeights[a.priority] || 1;
      const weightB = priorityWeights[b.priority] || 1;
      if (weightA !== weightB) return weightB - weightA;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
  };

  const sortedWaiting = sortQueue(waitingPatients);

  // Check if doctor is currently consulting any patient ('Called' status)
  const activeConsultation = appointments.find(
    a => a.doctorId === selectedDocId && a.status === "Called"
  );

  // Update Doctor Availability
  const handleUpdateAvailability = async (newAv: 'Online' | 'Offline' | 'In Consultation') => {
    if (!selectedDocId) return;
    try {
      const res = await fetch("/api/doctors/update-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doctorId: selectedDocId, status: newAv })
      });
      if (res.ok) {
        onRefresh();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Call Next Patient
  const handleCallNext = async (aptId: string) => {
    setUpdatingAptId(aptId);
    try {
      const res = await fetch("/api/appointments/update-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointmentId: aptId, status: "Called" })
      });
      if (res.ok) {
        // Automatically switch doctor status to 'In Consultation'
        await fetch("/api/doctors/update-status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ doctorId: selectedDocId, status: "In Consultation" })
        });
        setClinicalNotes("");
        onRefresh();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingAptId(null);
    }
  };

  // Finish Consultation and save Notes
  const handleCompleteConsultation = async (aptId: string) => {
    if (!clinicalNotes.trim()) {
      alert("Please record clinical prescription or diagnostic report notes first!");
      return;
    }
    setUpdatingAptId(aptId);
    try {
      const res = await fetch("/api/appointments/update-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appointmentId: aptId,
          status: "Completed",
          notes: clinicalNotes
        })
      });
      if (res.ok) {
        // Automatically revert doctor status back to 'Online'
        await fetch("/api/doctors/update-status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ doctorId: selectedDocId, status: "Online" })
        });
        setClinicalNotes("");
        onRefresh();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingAptId(null);
    }
  };

  // Mark patient as No-Show
  const handleNoShow = async (aptId: string) => {
    if (!confirm("Are you sure you want to mark this patient as No Show?")) return;
    setUpdatingAptId(aptId);
    try {
      const res = await fetch("/api/appointments/update-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointmentId: aptId, status: "No Show" })
      });
      if (res.ok) {
        // Revert doctor back to online if called target didn't show
        await fetch("/api/doctors/update-status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ doctorId: selectedDocId, status: "Online" })
        });
        onRefresh();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingAptId(null);
    }
  };

  // Emergency ESCALATION OVERRIDE from medical practitioner
  const handleEmergencyOverride = async (aptId: string) => {
    try {
      const res = await fetch("/api/appointments/emergency-override", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointmentId: aptId, isEmergency: true, priority: "Critical" })
      });
      if (res.ok) {
        alert("Emergency escalation triggered. Patient moved instantly to the front of the queue.");
        onRefresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="mx-auto max-w-6xl p-4 font-sans text-slate-800">
      {/* Doctor Login / select panel */}
      <div className="mb-6 rounded-3xl bg-slate-950 p-6 text-white shadow-lg flex flex-col md:flex-row items-center justify-between gap-4 border border-slate-900">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-indigo-500/10 border border-indigo-550/20 p-3.5 text-indigo-400">
            <Radio className="h-6 w-6 animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-white">Practitioner Terminal</h1>
            <p className="text-xs text-slate-400 mt-1 max-w-xl">Manage queues, call waiting lines, record clinical diagnostics, and trigger emergency bypasses.</p>
          </div>
        </div>

        <div>
          <select
            value={selectedDocId}
            onChange={e => setSelectedDocId(e.target.value)}
            className="rounded-2xl border border-slate-800 bg-slate-900 text-xs text-slate-200 px-4 py-2.5 outline-none focus:ring-1 focus:ring-indigo-500 min-w-[220px] font-semibold transition cursor-pointer"
          >
            <option value="">-- Clinical Profile Sign In --</option>
            {doctors.map(dr => (
              <option key={dr.id} value={dr.id}>
                {dr.name} ({dr.departmentName})
              </option>
            ))}
          </select>
        </div>
      </div>

      {activeDoc ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* MIDDLE COLUMN: CURRENT CONSULTATION CARD */}
          <div className="lg:col-span-2 space-y-6">
            {/* Consultation Activity Panel */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-base font-black text-slate-900 border-b border-slate-100 pb-3.5 mb-5 flex items-center gap-2">
                <Stethoscope className="h-5 w-5 text-indigo-600" />
                Active Consultation Room
              </h2>

              {activeConsultation ? (
                <div className="space-y-4">
                  {/* Active Patient Details */}
                  <div className="rounded-2xl bg-indigo-50/40 border border-indigo-100 p-5 relative overflow-hidden">
                    <div className="absolute top-0 right-0 h-1.5 w-full bg-indigo-600"></div>
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <span className="text-[10px] font-black text-indigo-700 uppercase tracking-widest bg-indigo-100/50 rounded px-2.5 py-0.5">
                          Active In Room
                        </span>
                        <h3 className="text-lg font-black text-slate-900 mt-1.5">{activeConsultation.patientName}</h3>
                        <p className="text-xs text-gray-500 font-medium">Age: {activeConsultation.patientAge} | Gender: {activeConsultation.patientGender}</p>
                      </div>

                      <div className="text-right">
                        <span className="text-3xl font-black text-indigo-650 font-mono tracking-tight">{activeConsultation.tokenNumber}</span>
                        <p className="text-[10px] text-slate-400 font-mono block mt-0.5">Ticket Reference</p>
                      </div>
                    </div>

                    <div className="mt-3 text-xs border-t border-indigo-100/40 pt-2 text-slate-600">
                      <span className="font-extrabold text-slate-800">Presented Symptoms: </span>
                      "{activeConsultation.symptoms}"
                    </div>
                  </div>

                  {/* Consultation notes logger */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                      Clinical notes, prescriptions, & diagnoses
                    </label>
                    <textarea
                      rows={5}
                      value={clinicalNotes}
                      onChange={e => setClinicalNotes(e.target.value)}
                      placeholder="Specify diagnosis report directives, drug prescription items, and patient follow-up guidelines safely..."
                      className="w-full rounded-2xl border border-slate-200 p-4 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 leading-relaxed transition"
                    />
                  </div>

                  {/* Complete consult or No Show buttons */}
                  <div className="flex flex-wrap gap-2 justify-between">
                    <button
                      onClick={() => handleNoShow(activeConsultation.id)}
                      disabled={updatingAptId === activeConsultation.id}
                      className="rounded-2xl bg-slate-100 hover:bg-slate-200 px-5 py-3 text-xs font-black uppercase tracking-widest text-slate-600 transition cursor-pointer"
                    >
                      Patient No Show
                    </button>

                    <button
                      onClick={() => handleCompleteConsultation(activeConsultation.id)}
                      disabled={updatingAptId === activeConsultation.id}
                      className="rounded-2xl bg-indigo-600 hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-100 px-6 py-3 text-xs font-black uppercase tracking-widest text-white transition flex items-center gap-2 cursor-pointer shadow-md"
                    >
                      <CheckCircle className="h-4 w-4" />
                      Mark Consultation Completed
                    </button>
                  </div>
                </div>
              ) : (
                <div className="rounded-3xl border border-dashed border-slate-200 p-12 text-center text-slate-500 flex flex-col items-center justify-center space-y-4">
                  <div className="h-14 w-14 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200">
                    <UserCheck className="h-6 w-6 text-indigo-600" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-extrabold text-slate-850">Consultation Room Closed</h3>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                      Select your clinical slot inside 'Your Wait List' on the right rail and click "Call Patient" securely to begin.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Historical Consultation statistics */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
              <h3 className="text-xs font-black text-slate-900 tracking-widest uppercase pb-2 border-b border-indigo-100/50">Professional Stat Highlights</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="rounded-2xl bg-slate-50 border border-slate-150 p-5 text-center">
                  <p className="text-[10px] text-slate-400 uppercase font-extrabold tracking-wider">Today's Patients</p>
                  <p className="text-2xl font-black text-slate-900 mt-1">
                    {appointments.filter(a => a.doctorId === selectedDocId && a.status === "Completed").length}
                  </p>
                  <p className="text-[9px] text-emerald-600 font-bold uppercase tracking-wider mt-1">consults completed</p>
                </div>

                <div className="rounded-2xl bg-slate-50 border border-slate-150 p-5 text-center">
                  <p className="text-[10px] text-slate-400 uppercase font-extrabold tracking-wider">Line Waiting</p>
                  <p className="text-2xl font-black text-slate-900 mt-1">{sortedWaiting.length}</p>
                  <p className="text-[9px] text-amber-600 font-bold uppercase tracking-wider mt-1">in queue list</p>
                </div>

                <div className="rounded-2xl bg-slate-50 border border-slate-150 p-5 text-center col-span-2 sm:col-span-1">
                  <p className="text-[10px] text-slate-400 uppercase font-extrabold tracking-wider">Consult Speed</p>
                  <p className="text-2xl font-black text-slate-900 mt-1">{activeDoc.avgDuration}</p>
                  <p className="text-[9px] text-indigo-600 font-bold uppercase tracking-wider mt-1 font-sans">avg mins / patient</p>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: DOCTOR ASSIGNED QUEUE */}
          <div className="space-y-6">
            {/* Availability controller card */}
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-3.5">
              <h3 className="text-xs font-black text-slate-900 tracking-widest uppercase">Practitioner Status Slider</h3>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => handleUpdateAvailability("Online")}
                  className={`rounded-2xl px-2.5 py-2.5 text-[10px] font-extrabold border transition cursor-pointer ${
                    activeDoc.availability === "Online"
                      ? "bg-emerald-50 text-emerald-800 border-emerald-300 shadow-xs"
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  🟢 Online
                </button>
                <button
                  onClick={() => handleUpdateAvailability("In Consultation")}
                  className={`rounded-2xl px-2.5 py-2.5 text-[10px] font-extrabold border transition cursor-pointer ${
                    activeDoc.availability === "In Consultation"
                      ? "bg-indigo-50 text-indigo-800 border-indigo-300 shadow-xs"
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  🔵 Busy
                </button>
                <button
                  onClick={() => handleUpdateAvailability("Offline")}
                  className={`rounded-2xl px-2.5 py-2.5 text-[10px] font-extrabold border transition cursor-pointer ${
                    activeDoc.availability === "Offline"
                      ? "bg-rose-50 text-rose-800 border-rose-300 shadow-xs"
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  🔴 Offline
                </button>
              </div>
            </div>

            {/* Waiting line */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3.5">
                <h3 className="text-xs font-black text-slate-900 tracking-widest uppercase flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-indigo-600" />
                  Your Wait List ({sortedWaiting.length})
                </h3>
                <button
                  onClick={onRefresh}
                  className="p-1 hover:bg-slate-100 rounded text-gray-400 hover:text-gray-600 transition"
                  title="Reload Queue"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </button>
              </div>

              {sortedWaiting.length > 0 ? (
                <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                  {sortedWaiting.map((apt, idx) => (
                    <div
                      key={apt.id}
                      className={`rounded-2xl border p-4 flex flex-col relative transition-all ${
                        apt.isEmergency || apt.priority === "Critical"
                          ? "border-rose-200 bg-rose-50/40 hover:bg-rose-50"
                          : "border-slate-200 bg-slate-50/40 hover:bg-slate-100/50"
                      }`}
                    >
                      {/* Emergency Top Badge */}
                      {(apt.isEmergency || apt.priority === "Critical") && (
                        <span className="absolute top-2 right-2 flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                        </span>
                      )}

                      <div className="flex justify-between items-start mb-2 pr-4">
                        <div>
                          <span className="text-sm font-black text-slate-900 font-mono">{apt.tokenNumber}</span>
                          <h4 className="text-xs font-black text-slate-800 mt-0.5">{apt.patientName} ({apt.patientAge}y)</h4>
                          <span className={`inline-block mt-1 rounded-full px-2 py-0.5 text-[8px] font-black uppercase tracking-wider ${
                            apt.priority === "Critical" ? "bg-rose-500 text-white" :
                            apt.priority === "High" ? "bg-amber-500 text-white" :
                            apt.priority === "Medium" ? "bg-indigo-650 text-white" : "bg-slate-400 text-white"
                          }`}>
                            {apt.priority}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[9px] text-gray-500 block">Slot {idx + 1}</span>
                          <span className="text-[9.5px] text-indigo-650 font-extrabold uppercase tracking-widest block">{apt.estimatedWaitTime} min wait</span>
                        </div>
                      </div>

                      <p className="text-[10px] text-slate-500 line-clamp-2 border-t border-slate-150 pt-2 mb-3">
                        <span className="font-extrabold text-slate-700">Symptoms:</span> "{apt.symptoms}"
                      </p>

                      {/* Action trigger row */}
                      <div className="flex items-center gap-1.5 justify-end">
                        <button
                          onClick={() => handleEmergencyOverride(apt.id)}
                          className="rounded-xl bg-white hover:bg-rose-50 border border-slate-200 px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-widest text-rose-600 transition flex items-center gap-0.5 hover:border-rose-200 cursor-pointer"
                          title="Manually prioritize to clinical Emergency"
                        >
                          <AlertTriangle className="h-3 w-3" />
                          Escalate
                        </button>

                        <button
                          onClick={() => handleCallNext(apt.id)}
                          disabled={activeConsultation !== undefined || updatingAptId !== null}
                          className="rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-100 disabled:text-slate-400 text-white font-extrabold px-3 py-1 text-[9px] transition flex items-center gap-0.5 shadow-xs cursor-pointer uppercase tracking-wider"
                        >
                          <Play className="h-2.5 w-2.5" />
                          Call Patient
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center p-6 text-gray-400 text-xs">
                  All patients cleared. Doctor queue list is empty.
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-slate-205 py-20 px-10 text-center text-slate-500 flex flex-col items-center justify-center space-y-5 bg-white shadow-sm max-w-2xl mx-auto">
          <div className="h-16 w-16 bg-indigo-50 border border-indigo-100 rounded-full flex items-center justify-center text-indigo-600 animate-bounce">
            <Stethoscope className="h-8 w-8" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-base font-black text-slate-900 uppercase tracking-widest">Clinical Profile Required</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
              Select your name from the <strong>Clinical Profile</strong> dropdown selection block in the header to access live consultation boards, active patient files, and queue override systems.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
