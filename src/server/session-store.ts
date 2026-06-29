import crypto from 'node:crypto';

export type SessionMode = 'ask' | 'agent';

export type SessionStatus =
  | 'pending'
  | 'claimed'
  | 'complete'
  | 'error';

export interface PromptSession {
  id: string;
  mode: SessionMode;
  prompt: string;
  systemPrompt: string;
  message: string;
  conversationId: string;
  status: SessionStatus;
  response?: string;
  partialText?: string;
  error?: string;
  createdAt: string;
  claimedAt?: string;
  completedAt?: string;
}

export interface CreateSessionInput {
  mode: SessionMode;
  prompt: string;
  systemPrompt: string;
  message: string;
  conversationId: string;
}

const sessions = new Map<string, PromptSession>();

export function createSession(input: CreateSessionInput): PromptSession {
  const session: PromptSession = {
    id: crypto.randomUUID(),
    mode: input.mode,
    prompt: input.prompt,
    systemPrompt: input.systemPrompt,
    message: input.message,
    conversationId: input.conversationId,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  sessions.set(session.id, session);
  return session;
}

export function claimPendingSession(): PromptSession | null {
  for (const session of sessions.values()) {
    if (session.status !== 'pending') {
      continue;
    }

    session.status = 'claimed';
    session.claimedAt = new Date().toISOString();
    return session;
  }

  return null;
}

export function tryClaimSession(sessionId: string): PromptSession | null {
  const session = sessions.get(sessionId);
  if (!session || session.status !== 'pending') {
    return null;
  }

  session.status = 'claimed';
  session.claimedAt = new Date().toISOString();
  return session;
}

export function releaseClaim(sessionId: string): PromptSession | undefined {
  const session = sessions.get(sessionId);
  if (!session || session.status !== 'claimed') {
    return session;
  }

  session.status = 'pending';
  session.claimedAt = undefined;
  return session;
}

export function getSession(sessionId: string): PromptSession | undefined {
  return sessions.get(sessionId);
}

export function updateSessionPartial(
  sessionId: string,
  partialText: string,
): PromptSession | undefined {
  const session = sessions.get(sessionId);
  if (!session) {
    return undefined;
  }

  session.partialText = partialText;
  return session;
}

export function completeSession(sessionId: string, response: string): PromptSession | undefined {
  const session = sessions.get(sessionId);
  if (!session) {
    return undefined;
  }

  session.status = 'complete';
  session.response = response;
  session.completedAt = new Date().toISOString();
  return session;
}

export function failSession(sessionId: string, error: string): PromptSession | undefined {
  const session = sessions.get(sessionId);
  if (!session) {
    return undefined;
  }

  session.status = 'error';
  session.error = error;
  session.completedAt = new Date().toISOString();
  return session;
}

export function clearSessions(): void {
  sessions.clear();
}
