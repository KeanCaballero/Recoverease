import 'dotenv/config';
import bcrypt from 'bcryptjs';
import prisma from './lib/prisma';

async function main() {
  console.log('🌱 Seeding RecoverEase database...');

  // ─── Admin ──────────────────────────────────────────────────────────────────
  const adminHash = await bcrypt.hash('Admin@123', 12);
  const adminUser = await prisma.userAccount.upsert({
    where: { userEmail: 'admin@recoverease.app' },
    update: {},
    create: { userEmail: 'admin@recoverease.app', userPasswordHash: adminHash, userRole: 'admin' },
  });
  await prisma.admin.upsert({
    where: { userId: adminUser.userId },
    update: {},
    create: { userId: adminUser.userId, adminFirstName: 'System', adminLastName: 'Administrator' },
  });

  // Default system settings
  const adminRecord = await prisma.admin.findUnique({ where: { userId: adminUser.userId } });
  if (adminRecord) {
    const defaultSettings = [
      { key: 'clinic_name', value: 'RecoverEase Outpatient Clinic' },
      { key: 'clinic_address', value: 'Cebu City, Philippines' },
      { key: 'clinic_contact', value: '+63 32 000 0000' },
      { key: 'chatbot_system_prompt', value: '' }, // Empty = uses default in controller
    ];
    for (const s of defaultSettings) {
      await prisma.systemSetting.upsert({
        where: { systemSettingKey: s.key },
        update: {},
        create: { systemSettingKey: s.key, systemSettingValue: s.value, adminId: adminRecord.adminId },
      });
    }
  }

  // ─── Doctor ──────────────────────────────────────────────────────────────────
  const docHash = await bcrypt.hash('Doctor@123', 12);
  const docUser = await prisma.userAccount.upsert({
    where: { userEmail: 'dr.santos@recoverease.app' },
    update: {},
    create: { userEmail: 'dr.santos@recoverease.app', userPasswordHash: docHash, userRole: 'doctor' },
  });
  const doctor = await prisma.doctor.upsert({
    where: { userId: docUser.userId },
    update: {},
    create: {
      userId: docUser.userId,
      docFirstName: 'Maria',
      docLastName: 'Santos',
      docSpecialization: 'Internal Medicine',
      docLicenseNo: 'PRC-2024-001234',
      docContactNo: '+63 917 555 0001',
    },
  });

  // ─── Patient ──────────────────────────────────────────────────────────────────
  const patHash = await bcrypt.hash('Patient@123', 12);
  const patUser = await prisma.userAccount.upsert({
    where: { userEmail: 'juan.dela.cruz@email.com' },
    update: {},
    create: { userEmail: 'juan.dela.cruz@email.com', userPasswordHash: patHash, userRole: 'patient' },
  });
  const patient = await prisma.patient.upsert({
    where: { userId: patUser.userId },
    update: {},
    create: {
      userId: patUser.userId,
      docId: doctor.docId,
      patFirstName: 'Juan',
      patLastName: 'Dela Cruz',
      patBirthDate: new Date('1985-03-15'),
      patGender: 'male',
      patContactNo: '+63 917 555 0002',
      patAddress: 'Cebu City, Cebu',
      patConsentAt: new Date(),
      patStatus: 'active',
    },
  });

  // ─── Treatment Plan ───────────────────────────────────────────────────────────
  const plan = await prisma.treatmentPlan.create({
    data: {
      patId: patient.patId,
      docId: doctor.docId,
      treatmentPlanTitle: 'Post-Hypertension Management',
      treatmentPlanDescription: 'Structured recovery plan for hypertension management including medication adherence, lifestyle modifications, and regular monitoring.',
      treatmentPlanStartDate: new Date(),
      treatmentPlanEndDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
      treatmentGoals: {
        create: [
          { treatmentGoalDescription: 'Maintain blood pressure below 130/80 mmHg', treatmentGoalTargetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
          { treatmentGoalDescription: 'Take all prescribed medications on schedule', treatmentGoalTargetDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) },
          { treatmentGoalDescription: 'Walk 30 minutes daily for 5 days per week', treatmentGoalTargetDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000) },
        ],
      },
    },
  });

  // ─── Prescription & Medication ────────────────────────────────────────────────
  await prisma.prescription.create({
    data: {
      patId: patient.patId,
      docId: doctor.docId,
      prescriptionIssuedDate: new Date(),
      prescriptionNotes: 'Take medications with food. Monitor blood pressure daily. Return for follow-up in 2 weeks.',
      medicationSchedules: {
        create: [
          {
            medicationScheduleName: 'Amlodipine',
            medicationScheduleDosage: '5mg',
            medicationScheduleFrequency: 1,
            medicationScheduleTimes: '08:00',
            medicationScheduleStartDate: new Date(),
            medicationScheduleEndDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
          },
          {
            medicationScheduleName: 'Losartan',
            medicationScheduleDosage: '50mg',
            medicationScheduleFrequency: 2,
            medicationScheduleTimes: '08:00,20:00',
            medicationScheduleStartDate: new Date(),
            medicationScheduleEndDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
          },
        ],
      },
    },
  });

  // ─── Appointment ──────────────────────────────────────────────────────────────
  const followUpDate = new Date();
  followUpDate.setDate(followUpDate.getDate() + 14);
  followUpDate.setHours(10, 0, 0, 0);
  await prisma.appointment.create({
    data: {
      patId: patient.patId,
      docId: doctor.docId,
      appointmentDate: followUpDate,
      appointmentStatus: 'scheduled',
    },
  });

  // ─── Recovery Logs (last 5 days) ──────────────────────────────────────────────
  const moods = [7, 6, 8, 7, 8];
  const notes = [
    'Feeling better today. Blood pressure was 128/79 this morning.',
    'Had a slight headache in the afternoon. Took medication on time.',
    'Great day! Walked 35 minutes. BP measured 125/78.',
    'Slept well. Morning BP 127/80. Feeling energetic.',
    'Morning walk done. Took all medications. BP 124/79.',
  ];
  for (let i = 4; i >= 0; i--) {
    const logDate = new Date();
    logDate.setDate(logDate.getDate() - i);
    logDate.setHours(0, 0, 0, 0);
    await prisma.recoveryLog.upsert({
      where: { patId_recoveryLogDate: { patId: patient.patId, recoveryLogDate: logDate } },
      update: {},
      create: {
        patId: patient.patId,
        recoveryLogDate: logDate,
        recoveryLogNotes: notes[4 - i],
        recoveryLogMoodRating: moods[4 - i],
      },
    });
  }

  // ─── Doctor Note ──────────────────────────────────────────────────────────────
  await prisma.doctorNote.create({
    data: {
      patId: patient.patId,
      docId: doctor.docId,
      doctorNoteText: 'Patient is responding well to the prescribed medications. Blood pressure readings have improved significantly. Continue current regimen and reinforce lifestyle modifications.',
    },
  });

  // ─── Announcement ─────────────────────────────────────────────────────────────
  const adminRec = await prisma.admin.findFirst();
  if (adminRec) {
    await prisma.announcement.create({
      data: {
        adminId: adminRec.adminId,
        announcementTitle: 'Welcome to RecoverEase!',
        announcementContent: 'We are pleased to launch the RecoverEase post-treatment care platform. This system is designed to support your recovery journey with medication reminders, progress tracking, and AI-assisted guidance. Please explore the features and contact your healthcare provider if you have any questions.',
        announcementPublishedAt: new Date(),
      },
    });
  }

  console.log('✅ Seed complete!');
  console.log('');
  console.log('📋 Test Credentials:');
  console.log('  Admin:   admin@recoverease.app   / Admin@123');
  console.log('  Doctor:  dr.santos@recoverease.app / Doctor@123');
  console.log('  Patient: juan.dela.cruz@email.com  / Patient@123');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
