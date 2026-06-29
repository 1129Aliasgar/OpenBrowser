import { beforeEach, describe, expect, it } from 'vitest';
import {
  claimPendingSession,
  clearSessions,
  completeSession,
  createSession,
  failSession,
  getSession,
  tryClaimSession,
} from './session-store.js';

describe('session-store', () => {
  beforeEach(() => {
    clearSessions();
  });

  it('queues and claims pending sessions in order', () => {
    createSession({
      mode: 'ask',
      prompt: 'hello',
      systemPrompt: 'sys',
      message: 'full message',
      conversationId: '11111111-1111-4111-8111-111111111111',
    });

    const claimed = claimPendingSession();
    expect(claimed?.status).toBe('claimed');
    expect(claimed?.prompt).toBe('hello');
    expect(claimPendingSession()).toBeNull();
  });

  it('completes and fails sessions', () => {
    createSession({
      mode: 'agent',
      prompt: 'task',
      systemPrompt: 'sys',
      message: 'full message',
      conversationId: '22222222-2222-4222-8222-222222222222',
    });

    const claimed = claimPendingSession();
    expect(claimed).toBeTruthy();

    completeSession(claimed!.id, 'answer text');
    expect(getSession(claimed!.id)?.status).toBe('complete');
    expect(getSession(claimed!.id)?.response).toBe('answer text');

    failSession('missing', 'nope');
    expect(getSession('missing')).toBeUndefined();
  });

  it('claims a specific pending session once', () => {
    createSession({
      mode: 'ask',
      prompt: 'hello',
      systemPrompt: 'sys',
      message: 'full message',
      conversationId: '33333333-3333-4333-8333-333333333333',
    });

    const first = tryClaimSession('33333333-3333-4333-8333-333333333333');
    const second = tryClaimSession('33333333-3333-4333-8333-333333333333');

    expect(first?.status).toBe('claimed');
    expect(second).toBeNull();
  });
});
