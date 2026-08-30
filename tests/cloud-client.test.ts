import { afterEach, describe, expect, it, vi } from 'vitest';
import { signIn, upsertRemoteState } from '../src/cloud/client';
import type { CloudSession, SyncSnapshot } from '../src/types';

const config = {
  url: 'https://example.supabase.co',
  anonKey: 'public-anon-key',
  origin: 'https://example.supabase.co'
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Supabase cloud client', () => {
  it('maps a password sign-in response to a stored session shape', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      access_token: 'access',
      refresh_token: 'refresh',
      expires_in: 3600,
      user: { id: 'user-1', email: 'person@example.com' }
    }), { status: 200, headers: { 'content-type': 'application/json' } })));

    const session = await signIn(config, 'person@example.com', 'password123');
    expect(session.user.email).toBe('person@example.com');
    expect(session.accessToken).toBe('access');
    expect(session.expiresAt).toBeGreaterThan(Date.now());
  });

  it('surfaces a bounded provider error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: 'Invalid login credentials' }), {
      status: 400,
      headers: { 'content-type': 'application/json' }
    })));

    await expect(signIn(config, 'person@example.com', 'wrong-password')).rejects.toThrow('Invalid login credentials');
  });

  it('writes state only for the authenticated user', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);
    const session: CloudSession = {
      accessToken: 'access',
      refreshToken: 'refresh',
      expiresAt: Date.now() + 3600_000,
      user: { id: 'user-1', email: 'person@example.com' }
    };
    const snapshot = {
      version: 1,
      updatedAt: 123,
      settings: {
        threshold: 55,
        mode: 'collapse',
        hideAds: true,
        jobTreatment: 'show',
        debug: false,
        ai: { enabled: false, preset: 'custom', baseUrl: '', model: '', vision: false },
        weights: { relevance: 0.3, infoDensity: 0.2, actionability: 0.15, originality: 0.1, evidence: 0.1, techDepth: 0.05, careerValue: 0.1 }
      },
      profile: { role: 'Engineer', industries: [], skills: [], interests: [], careerGoals: [], companies: [], desiredRoles: [], topicsToAvoid: [], followedPeople: [], mutedPeople: [] },
      signals: { positive: {}, negative: {} },
      overrides: {},
      stats: []
    } satisfies SyncSnapshot;

    await upsertRemoteState(config, session, snapshot);
    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(String(options.body))).toMatchObject({ user_id: 'user-1', data: snapshot });
    expect((options.headers as Record<string, string>).Authorization).toBe('Bearer access');
  });
});
