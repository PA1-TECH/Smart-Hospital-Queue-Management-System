import React, { useState, useEffect } from "react";
import { 
  Activity, Users, ShieldAlert, BookOpen, Stethoscope, 
  Landmark, RefreshCw, UserPlus, FileText, CheckSquare 
} from "lucide-react";
import { Role, Department, Doctor, Appointment } from "./types";
import PatientPortal from "./components/PatientPortal";
import DoctorPortal from "./components/DoctorPortal";
import ReceptionistPortal from "./components/ReceptionistPortal";
import AdminPortal from "./components/AdminPortal";
import AiChatBubble from "./components/AiChatBubble";

export default function App() {
  const [currentRole, setCurrentRole] = useState<Role>("patient");
  const [departments, setDepartments] = useState<Department[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch full state from full-stack backend
  const fetchState = async () => {
    try {
      const res = await fetch("/api/state");
      if (!res.ok) throw new Error("Could not construct clinical status feed.");
      const data = await res.json();
      setDepartments(data.departments || []);
      setDoctors(data.doctors || []);
      setAppointments(data.appointments || []);
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError("🔌 Offline - Connecting to Care Desk...");
    } finally {
      setIsLoading(false);
    }
  };

  // Poll state every 4 seconds to simulate active queue pacing
  useEffect(() => {
    fetchState();
    const interval = setInterval(() => {
      fetchState();
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // System-wide reset back to defaults (for assessment runs)
  const handleSystemReset = async () => {
    try {
      const res = await fetch("/api/reset-state", { method: "POST" });
      if (res.ok) {
        fetchState();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans antialiased text-slate-800 flex flex-col selection:bg-indigo-100">
      
      {/* GLOBAL HOSPITAL HEADER */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          {/* Brand/Title */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-100">
              <Activity className="h-5.5 w-5.5 animate-pulse" />
            </div>
            <div>
              <h1 className="text-sm font-black tracking-tight text-slate-900 uppercase">
                Metropolitan <span className="text-indigo-600">Care</span>
              </h1>
              <p className="text-[10px] font-extrabold text-indigo-505 tracking-widest uppercase opacity-75">
                AI Queue Terminal
              </p>
            </div>
          </div>

          {/* Role selection tab deck */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-full border border-slate-200/50">
            <button
              onClick={() => setCurrentRole("patient")}
              className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                currentRole === "patient"
                  ? "bg-white text-indigo-600 shadow-sm"
                  : "text-slate-500 hover:text-indigo-600"
              }`}
            >
              <UserPlus className="h-3.5 w-3.5" />
              Patient
            </button>
            <button
              onClick={() => setCurrentRole("doctor")}
              className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                currentRole === "doctor"
                  ? "bg-white text-indigo-600 shadow-sm"
                  : "text-slate-500 hover:text-indigo-600"
              }`}
            >
              <Stethoscope className="h-3.5 w-3.5" />
              Practitioner
            </button>
            <button
              onClick={() => setCurrentRole("receptionist")}
              className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                currentRole === "receptionist"
                  ? "bg-white text-indigo-600 shadow-sm"
                  : "text-slate-500 hover:text-indigo-600"
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              Receptionist
            </button>
            <button
              onClick={() => setCurrentRole("admin")}
              className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                currentRole === "admin"
                  ? "bg-white text-indigo-600 shadow-sm"
                  : "text-slate-500 hover:text-indigo-600"
              }`}
            >
              <Landmark className="h-3.5 w-3.5" />
              Admin
            </button>
          </div>
        </div>
      </header>

      {/* OFFLINE/ERROR BANNER */}
      {error && (
        <div className="bg-amber-550 text-white text-xs text-center py-2 font-bold animate-pulse">
          {error}
        </div>
      )}

      {/* CORE PORTAL VIEWPORTS */}
      <main className="flex-1 py-8 px-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-20 space-y-4">
            <div className="h-10 w-10 border-4 border-indigo-600 border-t-transparent animate-spin rounded-full"></div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Syncing Care Dashboard...</p>
          </div>
        ) : (
          <div className="transition-all duration-300">
            {currentRole === "patient" && (
              <PatientPortal 
                departments={departments}
                doctors={doctors}
                appointments={appointments}
                onRefresh={fetchState}
              />
            )}
            {currentRole === "doctor" && (
              <DoctorPortal 
                doctors={doctors}
                appointments={appointments}
                onRefresh={fetchState}
              />
            )}
            {currentRole === "receptionist" && (
              <ReceptionistPortal 
                departments={departments}
                doctors={doctors}
                appointments={appointments}
                onRefresh={fetchState}
              />
            )}
            {currentRole === "admin" && (
              <AdminPortal 
                departments={departments}
                doctors={doctors}
                appointments={appointments}
                onRefresh={fetchState}
                onReset={handleSystemReset}
              />
            )}
          </div>
        )}
      </main>

      {/* FOOTER COOPERATIVE FOOTPRINT */}
      <footer className="border-t border-gray-150 py-4.5 bg-white text-center text-[10px] text-gray-400 font-medium tracking-wide">
        🏥 Smart Hospital (Metropolitan Care) Queue Management Terminal • AI-Powered predicting services
      </footer>

      {/* FLOATING CHAT COMPANION */}
      <AiChatBubble currentRole={currentRole} />
    </div>
  );
}
