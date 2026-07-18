import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { ok, created, badRequest, notFound, serverError } from '../utils/response';

const CRITICAL_KEYWORDS = [
  'chest pain', 'can\'t breathe', 'cannot breathe', 'difficulty breathing',
  'severe pain', 'bleeding', 'unconscious', 'fainted', 'allergic reaction',
  'heart attack', 'stroke', 'emergency', 'overdose', 'suicidal', 'suicide',
  'dying', 'shortness of breath', 'swollen throat',
];

function detectCritical(message: string): boolean {
  const lower = message.toLowerCase();
  return CRITICAL_KEYWORDS.some(kw => lower.includes(kw));
}

async function callChatAI(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  systemContext: string,
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return 'AI chatbot is currently unavailable. Please contact your healthcare provider directly.';
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      system: systemContext,
      messages: messages.slice(-10), // Keep last 10 exchanges for context
    }),
  });

  if (!response.ok) {
    console.error('[chat/AI] API error:', response.status);
    return 'I\'m having trouble connecting right now. Please try again or contact your healthcare provider.';
  }

  const data = await response.json() as { content: Array<{ type: string; text: string }> };
  return data.content.find(b => b.type === 'text')?.text ?? 'No response';
}

// ─── Start or Continue Chat Session ──────────────────────────────────────────
export async function sendMessage(req: Request, res: Response): Promise<void> {
  try {
    const patId = req.user!.profileId;
    const userId = req.user!.userId;
    const { message, sessionId } = req.body as { message: string; sessionId?: number };

    if (!message?.trim()) {
      badRequest(res, 'Message is required');
      return;
    }

    // Get or create session
    let session = sessionId
      ? await prisma.chatSession.findFirst({ where: { chatSessionId: sessionId, patId } })
      : null;

    if (!session) {
      session = await prisma.chatSession.create({
        data: { patId },
      });
    }

    // Get patient context for the AI
    const patient = await prisma.patient.findUnique({
      where: { patId },
      include: {
        treatmentPlans: {
          where: { treatmentPlanStatus: 'active' },
          include: { treatmentGoals: true },
          take: 1,
        },
        prescriptions: {
          include: { medicationSchedules: true },
          orderBy: { prescriptionCreatedAt: 'desc' },
          take: 1,
        },
        doctor: { select: { docFirstName: true, docLastName: true, docSpecialization: true } },
      },
    });

    // Get custom system prompt from settings
    const systemSetting = await prisma.systemSetting.findUnique({ where: { systemSettingKey: 'chatbot_system_prompt' } }).catch(() => null);

    const activePlan = patient?.treatmentPlans[0];
    const latestPrescription = patient?.prescriptions[0];

    const systemPrompt = systemSetting?.systemSettingValue ?? `You are RecoverEase AI, a post-treatment care assistant for patients at an outpatient clinic.

Patient: ${patient?.patFirstName} ${patient?.patLastName}
Doctor: Dr. ${patient?.doctor?.docFirstName} ${patient?.doctor?.docLastName} (${patient?.doctor?.docSpecialization ?? 'General'})
${activePlan ? `Active Treatment Plan: ${activePlan.treatmentPlanTitle}\nGoals: ${activePlan.treatmentGoals.map(g => g.treatmentGoalDescription).join('; ')}` : ''}
${latestPrescription?.medicationSchedules.length ? `Current Medications: ${latestPrescription.medicationSchedules.map(m => `${m.medicationScheduleName} ${m.medicationScheduleDosage}`).join(', ')}` : ''}

IMPORTANT RULES:
- Provide helpful post-treatment guidance only
- Do NOT diagnose, prescribe, or modify medications
- For emergencies, always say: "This sounds serious. Please call emergency services (911) or go to the nearest ER immediately."
- Keep responses concise and clear (2-4 sentences)
- Always recommend consulting their doctor for medical decisions
- Be warm, supportive, and encouraging`;

    // Get previous messages in session
    const previousMessages = await prisma.chatMessage.findMany({
      where: { chatSessionId: session.chatSessionId },
      orderBy: { createdAt: 'asc' },
      select: { role: true, content: true },
    });

    // Save user message
    await prisma.chatMessage.create({
      data: { chatSessionId: session.chatSessionId, role: 'user', content: message },
    });

    // Check for critical concern
    const isCritical = detectCritical(message);

    // Get AI response
    const aiMessages = [
      ...previousMessages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      { role: 'user' as const, content: message },
    ];

    const aiResponse = await callChatAI(aiMessages, systemPrompt);

    // Save assistant response
    await prisma.chatMessage.create({
      data: { chatSessionId: session.chatSessionId, role: 'assistant', content: aiResponse },
    });

    // Handle critical flag
    if (isCritical && !session.chatSessionHasCriticalFlag) {
      await prisma.chatSession.update({
        where: { chatSessionId: session.chatSessionId },
        data: { chatSessionHasCriticalFlag: true },
      });

      // Notify doctor
      if (patient) {
        const doctor = await prisma.doctor.findUnique({ where: { docId: patient.docId } });
        if (doctor) {
          await prisma.notification.create({
            data: {
              userId: doctor.userId,
              chatSessionId: session.chatSessionId,
              notificationType: 'criticalAlert',
              notificationMessage: `⚠️ Critical concern detected in chat from patient ${patient.patFirstName} ${patient.patLastName}: "${message.slice(0, 100)}"`,
            },
          });
        }
      }
    }

    ok(res, {
      sessionId: session.chatSessionId,
      response: aiResponse,
      isCritical,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[chat/sendMessage]', err);
    serverError(res);
  }
}

// ─── Get Chat History ─────────────────────────────────────────────────────────
export async function getChatHistory(req: Request, res: Response): Promise<void> {
  try {
    const patId = req.user!.profileId;
    const role = req.user!.role;

    const viewPatId = role === 'patient' ? patId : parseInt(req.params.patId ?? '0');

    if (role === 'doctor') {
      const patient = await prisma.patient.findFirst({ where: { patId: viewPatId, docId: patId } });
      if (!patient) { notFound(res, 'Patient not found'); return; }
    }

    const sessions = await prisma.chatSession.findMany({
      where: { patId: viewPatId },
      include: {
        chatMessages: { orderBy: { createdAt: 'asc' } },
      },
      orderBy: { chatSessionStartedAt: 'desc' },
      take: 20,
    });

    ok(res, sessions);
  } catch (err) {
    console.error('[chat/history]', err);
    serverError(res);
  }
}

// ─── Get Single Session ───────────────────────────────────────────────────────
export async function getChatSession(req: Request, res: Response): Promise<void> {
  try {
    const sessionId = parseInt(req.params.sessionId);
    const role = req.user!.role;
    const profileId = req.user!.profileId;

    const session = await prisma.chatSession.findUnique({
      where: { chatSessionId: sessionId },
      include: {
        chatMessages: { orderBy: { createdAt: 'asc' } },
        patient: { select: { patFirstName: true, patLastName: true, docId: true } },
      },
    });

    if (!session) { notFound(res, 'Session not found'); return; }

    if (role === 'patient' && session.patId !== profileId) { notFound(res, 'Not found'); return; }
    if (role === 'doctor' && session.patient.docId !== profileId) { notFound(res, 'Not found'); return; }

    ok(res, session);
  } catch (err) {
    console.error('[chat/getSession]', err);
    serverError(res);
  }
}

// ─── Admin: Chatbot Usage Logs ────────────────────────────────────────────────
export async function getChatUsageLogs(req: Request, res: Response): Promise<void> {
  try {
    const { page = '1', limit = '20' } = req.query as { page?: string; limit?: string };
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [sessions, total] = await Promise.all([
      prisma.chatSession.findMany({
        include: {
          patient: { select: { patFirstName: true, patLastName: true } },
          _count: { select: { chatMessages: true } },
        },
        orderBy: { chatSessionStartedAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.chatSession.count(),
    ]);

    ok(res, { sessions, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error('[chat/usageLogs]', err);
    serverError(res);
  }
}
