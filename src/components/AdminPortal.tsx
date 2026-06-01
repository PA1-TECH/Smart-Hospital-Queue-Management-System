import React from "react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, PieChart, Pie, Cell 
} from "recharts";
import { 
  Users, TrendingUp, ShieldAlert, Clock, RefreshCw, Activity, 
  Trash2, UserCheck, Stethoscope, Landmark, Layers 
} from "lucide-react";
import { motion } from "motion/react";
import { Department, Doctor, Appointment } from "../types";

interface AdminPortalProps {
  departments: Department[];
  doctors: Doctor[];
  appointments: Appointment[];
  onRefresh: () => void;
  onReset: () => void;
}

export default function AdminPortal({ departments, doctors, appointments, onRefresh, onReset }: AdminPortalProps) {
  
  // Calculate analytics indexes
  const totalBooked = appointments.length;
  const activeWaitingCount = appointments.filter(a => a.status === "Waiting").length;
  const activeConsultingCount = appointments.filter(a => a.status === "Called").length;
  const completedCount = appointments.filter(a => a.status === "Completed").length;
  const emergencyCount = appointments.filter(a => a.isEmergency).length;

  const avgWaitTimeList = appointments.filter(a => a.status === "Completed" || a.status === "Waiting");
  const avgWaitTime = avgWaitTimeList.length > 0 
    ? Math.round(avgWaitTimeList.reduce((acc, curr) => acc + (curr.estimatedWaitTime || 0), 0) / avgWaitTimeList.length)
    : 12;

  // 1. Chart: Daily Patients by Department
  const departmentChartData = departments.map(d => {
    const totalDeptApts = appointments.filter(a => a.departmentId === d.id);
    return {
      name: d.name,
      Waiting: totalDeptApts.filter(a => a.status === "Waiting").length,
      Consulted: totalDeptApts.filter(a => a.status === "Completed").length,
      Emergency: totalDeptApts.filter(a => a.isEmergency).length,
    };
  });

  // 2. Chart: Average waiting times per clinical sector
  const deptWaitTimeData = departments.map(d => {
    const matching = appointments.filter(a => a.departmentId === d.id);
    const avg = matching.length > 0
      ? Math.round(matching.reduce((acc, curr) => acc + (curr.estimatedWaitTime || 0), 0) / matching.length)
      : d.avgPreConsultationTime * 1.5;
    return {
      name: d.name,
      "Average Wait (mins)": avg
    };
  });

  // 3. Chart: Department Traffic ratio (Pie chart)
  const trafficData = departments.map(d => {
    const count = appointments.filter(a => a.departmentId === d.id && a.status === "Waiting").length;
    return {
      name: d.name,
      value: count || 1 // Avoid blank pies
    };
  });

  // 4. Chart: Doctor performances speeds & assignments count
  const doctorPerfData = doctors.map(dr => {
    const completedForDr = appointments.filter(a => a.doctorId === dr.id && a.status === "Completed").length;
    return {
      name: dr.name.replace("Dr. ", ""),
      "Completed Consults": completedForDr,
      "Assigned Wait List": appointments.filter(a => a.doctorId === dr.id && a.status === "Waiting").length,
      Speed: dr.avgDuration // average minutes
    };
  });

  // 5. Chart: Emergency vs Standard cases
  const ratioData = [
    { name: "Emergency Cases", value: emergencyCount || 1, color: "#ef4444" },
    { name: "Regular Patients", value: (totalBooked - emergencyCount) || 1, color: "#3b82f6" }
  ];

  const PIE_COLORS = ["#3b82f6", "#6366f1", "#a855f7", "#ec4899", "#f59e0b"];

  return (
    <div className="mx-auto max-w-6xl p-4 font-sans text-slate-800 space-y-6">
      
      {/* Admin Action Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-6 text-white gap-4 border border-slate-700/50 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-indigo-500/15 border border-indigo-500/20 p-3.5 text-indigo-400">
            <Activity className="h-6 w-6 animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-widest uppercase">Superintendent Analytics</h1>
            <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">Review clinical congestion rates, analyze performance indexes, and reset sandbox database thresholds.</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={onRefresh}
            className="rounded-2xl bg-slate-800 hover:bg-slate-700 hover:shadow-lg border border-slate-700 px-5 py-3 text-xs font-black uppercase tracking-wider text-white transition flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh Feed
          </button>

          <button
            onClick={() => {
              if (confirm("Reset hospital queue state back to standard defaults? This terminates all dynamic bookings.")) {
                onReset();
              }
            }}
            className="rounded-2xl bg-indigo-600 hover:bg-indigo-700 border border-indigo-505/10 px-5 py-3 text-xs font-black uppercase tracking-wider text-white transition flex items-center gap-1.5 cursor-pointer shadow-md hover:shadow-indigo-100"
            title="Wipe dynamic bookings and start fresh"
          >
            <Trash2 className="h-4 w-4" />
            Reset State Defaults
          </button>
        </div>
      </div>

      {/* BIG FOUR METRICS CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
        {/* Total Booked */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[9.5px] font-black uppercase tracking-wider text-slate-500">Total Bookings Today</span>
            <Users className="h-5 w-5 text-indigo-600" />
          </div>
          <p className="text-3xl font-black text-slate-900 mt-2 tracking-tight">{totalBooked}</p>
          <span className="text-[9px] text-emerald-650 font-black block mt-2 uppercase tracking-wide">▲ up 12% vs yesterday</span>
        </div>

        {/* Active waiting */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[9.5px] font-black uppercase tracking-wider text-slate-500">Active Wait Lines</span>
            <Clock className="h-5 w-5 text-amber-500" />
          </div>
          <p className="text-3xl font-black text-slate-900 mt-2 tracking-tight">{activeWaitingCount}</p>
          <span className="text-[9px] text-slate-400 block mt-2"><b>{activeConsultingCount}</b> in consulting room</span>
        </div>

        {/* Average wait time */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[9.5px] font-black uppercase tracking-wider text-slate-500">Average Wait Speed</span>
            <TrendingUp className="h-5 w-5 text-indigo-500" />
          </div>
          <p className="text-3xl font-black text-slate-900 mt-2 tracking-tight">{avgWaitTime} <span className="text-xs font-normal text-slate-500">mins</span></p>
          <span className="text-[9px] text-indigo-600 font-extrabold block mt-2 uppercase tracking-wide">Congestion Speed Model</span>
        </div>

        {/* Emergency count */}
        <div className="rounded-3xl border border-rose-150 bg-rose-50/15 p-6 shadow-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[9.5px] font-black uppercase tracking-wider text-rose-600">Emergency Overrides</span>
            <ShieldAlert className="h-5 w-5 text-rose-550 animate-pulse" />
          </div>
          <p className="text-3xl font-black text-rose-600 mt-2 tracking-tight">{emergencyCount}</p>
          <span className="text-[9px] text-rose-500 font-black block mt-2 uppercase tracking-widest">Urgent Code active</span>
        </div>
      </div>

      {/* ANALYTICS CHARTS SECTION GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Daily Patients & Wait Times per Department (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Chart 1: Daily patient flow by department */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <div>
              <h3 className="text-xs font-black tracking-widest text-slate-900 uppercase">Department Roster Flow</h3>
              <p className="text-[11px] text-slate-400 font-sans mt-0.5">Breakdown of waiting, completed and emergency patients by clinical sector.</p>
            </div>
            
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={departmentChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 16, border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(99, 102, 241, 0.05)' }} />
                  <Legend wrapperStyle={{ fontSize: 11, marginTop: 10 }} />
                  <Bar dataKey="Waiting" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Consulted" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Emergency" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Average Wait Time compares */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <div>
              <h3 className="text-xs font-black tracking-widest text-slate-900 uppercase">Average Waiting Time (Minutes)</h3>
              <p className="text-[11px] text-slate-400 font-sans mt-0.5">Direct sector wait congestion indexing based on patient volumes.</p>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deptWaitTimeData} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 16, border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(99, 102, 241, 0.05)' }} />
                  <Bar dataKey="Average Wait (mins)" fill="#6366f1" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Right Column: Traffic shares and emergency counts (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
                   {/* Chart 3: Department Traffic Pie */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <div>
              <h3 className="text-xs font-black tracking-widest text-slate-900 uppercase">Wait Line Ratios</h3>
              <p className="text-[11px] text-slate-400 font-sans mt-0.5">Total active waiting concentration share.</p>
            </div>

            <div className="h-56 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={trafficData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {trafficData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 16, border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(99, 102, 241, 0.05)' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Labels legends custom */}
            <div className="space-y-1 pt-1 border-t border-gray-100">
              {trafficData.map((dept, idx) => (
                <div key={idx} className="flex justify-between items-center text-xs">
                  <span className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}></span>
                    <span className="font-medium text-gray-700">{dept.name}</span>
                  </span>
                  <span className="text-gray-500 font-bold font-mono">{dept.value} checking</span>
                </div>
              ))}
            </div>
          </div>

          {/* Chart 4: Emergency vs Standard cases */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <div>
              <h3 className="text-xs font-black tracking-widest text-slate-900 uppercase">Case Classification Ratio</h3>
              <p className="text-[11px] text-slate-400 font-sans mt-0.5">Ratio highlighting emergency priorities against standard regular consults.</p>
            </div>

            <div className="h-52 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={ratioData}
                    cx="50%"
                    cy="50%"
                    innerRadius={0}
                    outerRadius={75}
                    dataKey="value"
                  >
                    {ratioData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 16, border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(99, 102, 241, 0.05)' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="flex justify-around pt-3.5 border-t border-slate-100 text-[10px] font-black uppercase tracking-wider">
              <span className="text-rose-600 flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-500"></span>
                Emergency ({emergencyCount})
              </span>
              <span className="text-indigo-650 flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-indigo-505"></span>
                Standard ({totalBooked - emergencyCount})
              </span>
            </div>
          </div>
        </div>
      </div>      {/* DOCTORS PERFORMANCE STAT PANEL (ROSTER MONITOR) */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <div>
          <h3 className="text-xs font-black tracking-widest text-slate-900 uppercase flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-indigo-600" />
            Practitioner Speed & Status Logs
          </h3>
          <p className="text-[11px] text-slate-400 font-sans mt-0.5">Total completed consultations, current active wait list assigned, and standard medical speed (duration).</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-150 text-slate-500 uppercase font-black tracking-wider text-[10px]">
                <th className="pb-3 text-slate-700">Practitioner</th>
                <th className="pb-3 text-slate-700">Department</th>
                <th className="pb-3 text-slate-700">Current availability</th>
                <th className="pb-3 text-center text-slate-700">Consults completed</th>
                <th className="pb-3 text-center text-slate-700">Active Waiting list</th>
                <th className="pb-3 text-center text-slate-700">Average Duration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {doctors.map(dr => (
                <tr key={dr.id} className="hover:bg-slate-50/50 transition">
                  <td className="py-3 font-black text-slate-900 text-[12.5px]">{dr.name}</td>
                  <td className="py-3 text-slate-600 font-medium">{dr.departmentName}</td>
                  <td className="py-3">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-wider border ${
                      dr.availability === "Online" ? "bg-emerald-50 text-emerald-800 border-emerald-200/50" :
                      dr.availability === "In Consultation" ? "bg-amber-50 text-amber-800 border-amber-200/50" :
                      "bg-slate-55 text-slate-600 border-slate-200/60"
                    }`}>
                      {dr.availability}
                    </span>
                  </td>
                  <td className="py-3 text-center font-extrabold text-slate-900">
                    {appointments.filter(a => a.doctorId === dr.id && a.status === "Completed").length}
                  </td>
                  <td className="py-3 text-center font-black text-indigo-650">
                    {appointments.filter(a => a.doctorId === dr.id && a.status === "Waiting").length}
                  </td>
                  <td className="py-3 text-center font-mono font-bold text-slate-800">{dr.avgDuration} mins</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
