(() => {
  const settings = {
    threshold: 55,
    mode: 'collapse',
    hideAds: true,
    jobTreatment: 'show',
    debug: false,
    ai: {
      enabled: false,
      preset: 'custom',
      baseUrl: '',
      model: '',
      apiKey: '',
      vision: false
    },
    weights: {
      relevance: 0.3,
      infoDensity: 0.2,
      actionability: 0.15,
      originality: 0.1,
      evidence: 0.1,
      techDepth: 0.05,
      careerValue: 0.1
    }
  };
  const profile = {
    role: 'Software Engineer',
    industries: ['AI', 'SaaS', 'Developer Tools'],
    skills: ['TypeScript', 'React', 'LLMs', 'Backend Systems'],
    interests: ['AI startups', 'Product building', 'Engineering'],
    careerGoals: ['Build useful products', 'Learn from experienced founders'],
    companies: ['OpenAI', 'Stripe'],
    desiredRoles: ['Founding Engineer'],
    topicsToAvoid: ['Generic motivation'],
    followedPeople: [],
    mutedPeople: []
  };
  const signals = { positive: { technical: 8, ai: 6, startup: 3 }, negative: { promotional: 4, 'engagement-bait': 7 } };
  const cloud = {
    configured: true,
    origin: 'https://example.supabase.co',
    signedIn: true,
    user: { id: 'demo-user', email: 'alex@example.com' },
    lastSyncedAt: Date.now() - 4 * 60 * 1000,
    pending: false
  };
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(Date.now() - index * 86400000).toISOString().slice(0, 10);
    const analyzed = [48, 62, 39, 71, 54, 44, 66][index];
    const hidden = [18, 25, 14, 31, 20, 17, 28][index];
    return {
      date,
      analyzed,
      shown: analyzed - hidden,
      hidden,
      adsHidden: [3, 4, 2, 5, 3, 2, 4][index],
      scoreShownSum: (analyzed - hidden) * 73,
      scoreHiddenSum: hidden * 26,
      categories: { technical: 14, ai: 11, startup: 8, 'career-advice': 5, promotional: 4, 'engagement-bait': 3 },
      reasonsHidden: { 'Low information density': 9, 'Not related to your interests': 6, 'Engagement bait': 4 }
    };
  });

  function response(message) {
    switch (message.type) {
      case 'bootstrap': return { settings, profile, signals, overrides: {} };
      case 'stats:getToday': return days[0];
      case 'stats:getHistory': return days.slice(0, message.days || 7);
      case 'cloud:status': return cloud;
      case 'setSetting': settings[message.key] = message.value; return settings;
      case 'setAi': Object.assign(settings.ai, message.value); return settings;
      case 'setProfile': Object.assign(profile, message.value); return profile;
      case 'cloud:sync': return cloud;
      case 'cloud:signout': return { ...cloud, signedIn: false, user: undefined };
      case 'data:export': return { version: 1, settings, profile, signals };
      case 'ai:test': return { ok: true };
      default: return true;
    }
  }

  const mock = {
    runtime: {
      lastError: undefined,
      getManifest: () => ({ version: '1.0.0' }),
      sendMessage: (message, callback) => queueMicrotask(() => callback({ ok: true, data: response(message) }))
    },
    permissions: {
      contains: async () => true,
      request: async () => true
    }
  };
  Object.assign(window.chrome, mock);
})();
