// ─── Auth ─────────────────────────────────────────────────────────────────────
export type UserRole = 'admin' | 'doctor' | 'patient';

export interface AuthUser {
  userId: number;
  role: UserRole;
  profileId: number;
  name: string;
  email: string;
  needsConsent?: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

// ─── Doctor ───────────────────────────────────────────────────────────────────
export interface Doctor {
  docId: number;
  userId: number;
  docFirstName: string;
  docLastName: string;
  docSpecialization: string | null;
  docLicenseNo: string;
  docContactNo: string | null;
  docIsActive: boolean;
  docCreatedAt: string;
  user?: { userEmail: string };
  _count?: { patients: number };
}

// ─── Patient ──────────────────────────────────────────────────────────────────
export type PatientGender = 'male' | 'female' | 'other';
export type PatientStatus = 'active' | 'inactive' | 'discharged';

export interface Patient {
  patId: number;
  userId: number;
  docId: number;
  patFirstName: string;
  patLastName: string;
  patBirthDate: string;
  patGender: PatientGender | null;
  patContactNo: string | null;
  patAddress: string | null;
  patConsentAt: string | null;
  patCreatedAt: string;
  patStatus: PatientStatus;
  patReminderPreferredTime: string | null;
  patReminderIsEnabled: boolean;
  user?: { userEmail: string };
  doctor?: Pick<Doctor, 'docFirstName' | 'docLastName' | 'docSpecialization'>;
  treatmentPlans?: TreatmentPlan[];
  appointments?: Appointment[];
}

// ─── Treatment ────────────────────────────────────────────────────────────────
export type TreatmentPlanStatus = 'active' | 'completed' | 'discontinued';
export type TreatmentGoalStatus = 'pending' | 'achieved' | 'missed';

export interface TreatmentGoal {
  treatmentGoalId: number;
  treatmentPlanId: number;
  treatmentGoalDescription: string;
  treatmentGoalTargetDate: string | null;
  treatmentGoalStatus: TreatmentGoalStatus;
}

export interface TreatmentPlan {
  treatmentPlanId: number;
  patId: number;
  docId: number;
  treatmentPlanTitle: string;
  treatmentPlanDescription: string | null;
  treatmentPlanStartDate: string;
  treatmentPlanEndDate: string | null;
  treatmentPlanStatus: TreatmentPlanStatus;
  treatmentPlanCreatedAt: string;
  treatmentGoals: TreatmentGoal[];
  doctor?: Pick<Doctor, 'docFirstName' | 'docLastName' | 'docSpecialization' | 'docLicenseNo'>;
  patient?: Pick<Patient, 'patFirstName' | 'patLastName' | 'patBirthDate'>;
}

// ─── Medication ───────────────────────────────────────────────────────────────
export type MedicationLogStatus = 'pending' | 'taken' | 'missed';

export interface MedicationSchedule {
  medicationScheduleId: number;
  prescriptionId: number;
  medicationScheduleName: string;
  medicationScheduleDosage: string;
  medicationScheduleFrequency: number;
  medicationScheduleTimes: string;
  medicationScheduleStartDate: string;
  medicationScheduleEndDate: string | null;
  medicationLogs?: MedicationLog[];
}

export interface MedicationLog {
  medicationLogId: number;
  medicationScheduleId: number;
  medicationLogScheduledAt: string;
  medicationLogTakenAt: string | null;
  medicationLogStatus: MedicationLogStatus;
  medicationSchedule?: Pick<MedicationSchedule, 'medicationScheduleName' | 'medicationScheduleDosage'>;
}

export interface Prescription {
  prescriptionId: number;
  patId: number;
  docId: number;
  prescriptionIssuedDate: string;
  prescriptionNotes: string | null;
  prescriptionCreatedAt: string;
  medicationSchedules: MedicationSchedule[];
  doctor?: Pick<Doctor, 'docFirstName' | 'docLastName'>;
}

// ─── Recovery ─────────────────────────────────────────────────────────────────
export interface RecoveryLog {
  recoveryLogId: number;
  patId: number;
  recoveryLogDate: string;
  recoveryLogNotes: string | null;
  recoveryLogMoodRating: number | null;
  recoveryLogCreatedAt: string;
}

export interface DoctorNote {
  doctorNoteId: number;
  patId: number;
  docId: number;
  doctorNoteText: string;
  doctorNoteCreatedAt: string;
  doctor?: Pick<Doctor, 'docFirstName' | 'docLastName'>;
}

// ─── Appointments ─────────────────────────────────────────────────────────────
export type AppointmentStatus = 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'rescheduled';
export type RescheduleStatus = 'pending' | 'approved' | 'declined';

export interface RescheduleRequest {
  rescheduleRequestId: number;
  appointmentId: number;
  userId: number;
  rescheduleRequestDate: string;
  rescheduleRequestReason: string | null;
  rescheduleRequestStatus: RescheduleStatus;
  rescheduleRequestRespondedAt: string | null;
}

export interface Appointment {
  appointmentId: number;
  patId: number;
  docId: number;
  appointmentDate: string;
  appointmentStatus: AppointmentStatus;
  appointmentCreatedAt: string;
  patient?: Pick<Patient, 'patFirstName' | 'patLastName'>;
  doctor?: Pick<Doctor, 'docFirstName' | 'docLastName' | 'docSpecialization'>;
  rescheduleRequests?: RescheduleRequest[];
}

// ─── Notifications ────────────────────────────────────────────────────────────
export interface Notification {
  notificationId: number;
  userId: number;
  chatSessionId: number | null;
  notificationType: string;
  notificationMessage: string;
  notificationIsRead: boolean;
  notificationCreatedAt: string;
}

export interface Announcement {
  announcementId: number;
  adminId: number;
  announcementTitle: string;
  announcementContent: string;
  announcementPublishedAt: string | null;
  announcementCreatedAt: string;
  admin?: { adminFirstName: string; adminLastName: string };
}

// ─── Chat ─────────────────────────────────────────────────────────────────────
export type MessageRole = 'user' | 'assistant';

export interface ChatMessage {
  chatMessageId: number;
  chatSessionId: number;
  role: MessageRole;
  content: string;
  createdAt: string;
}

export interface ChatSession {
  chatSessionId: number;
  patId: number;
  chatSessionStartedAt: string;
  chatSessionEndedAt: string | null;
  chatSessionHasCriticalFlag: boolean;
  chatSessionSummary: string | null;
  chatMessages: ChatMessage[];
  patient?: Pick<Patient, 'patFirstName' | 'patLastName'>;
}

// ─── Admin / Audit ────────────────────────────────────────────────────────────
export interface AuditLog {
  auditLogId: number;
  userId: number;
  auditLogAction: string;
  auditLogEntity: string;
  auditLogEntityId: number | null;
  auditLogTimestamp: string;
  auditLogDetails: string | null;
  user?: { userEmail: string; userRole: string };
}

// ─── Dashboard payloads ───────────────────────────────────────────────────────
export interface DoctorDashboard {
  totalPatients: number;
  activePatients: number;
  criticalAlerts: number;
  upcomingAppointments: Appointment[];
  recentNotes: DoctorNote[];
}

export interface PatientDashboard {
  patient: Patient;
  activePlan: TreatmentPlan | null;
  recentLogs: RecoveryLog[];
  adherenceData: { total: number; taken: number; rate: number };
  nextAppointment: Appointment | null;
  todayLogs: MedicationLog[];
  streak: number;
}

export interface AdminDashboard {
  doctorCount: number;
  patientCount: number;
  activePatients: number;
  chatSessions: number;
  criticalAlerts: number;
  recentAudit: AuditLog[];
}

// ─── API wrapper ──────────────────────────────────────────────────────────────
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

// Extend DoctorNote with patient relation used in doctor dashboard
export interface DoctorNoteWithPatient extends DoctorNote {
  patient?: Pick<Patient, 'patFirstName' | 'patLastName'>;
}
