export type Role = 'patient' | 'doctor' | 'receptionist' | 'admin';

export interface Department {
  id: string;
  name: string;
  description: string;
  avgPreConsultationTime: number; // in mins
}

export interface Doctor {
  id: string;
  name: string;
  departmentId: string;
  departmentName: string;
  availability: 'Online' | 'Offline' | 'In Consultation';
  avgDuration: number; // average consultation duration in minutes
  assignedQueueCount: number;
}

export type PriorityLevel = 'Critical' | 'High' | 'Medium' | 'Normal';

export interface Appointment {
  id: string;
  tokenNumber: string;
  patientName: string;
  patientAge: number;
  patientGender: string;
  symptoms: string;
  priority: PriorityLevel;
  departmentId: string;
  departmentName: string;
  doctorId: string;
  doctorName: string;
  status: 'Waiting' | 'Called' | 'Completed' | 'No Show';
  isEmergency: boolean;
  estimatedWaitTime: number; // in minutes
  confidencePercentage: number;
  createdAt: string; // ISO string
  calledAt?: string;
  completedAt?: string;
  notes?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  createdAt: string;
}

export interface QueueState {
  departments: Department[];
  doctors: Doctor[];
  appointments: Appointment[];
}
