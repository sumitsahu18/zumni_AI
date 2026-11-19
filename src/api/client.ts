/**
 * Centralized API Client for Zunme AI
 * Full-featured client connecting frontend to backend-zumni Express API
 */

// Live Railway Production Backend URL
const LIVE_BACKEND_URL = 'https://zumni-ai-jonny-new-backend-production.up.railway.app/api';
// Local Backend URL (Commented out)
// const LOCAL_BACKEND_URL = 'http://localhost:5000/api';

const BASE_URL =
  ((import.meta as any).env && (import.meta as any).env.VITE_API_URL) ||
  LIVE_BACKEND_URL;

export function getOrCreateClientId(): string {
  if (typeof window === 'undefined') return 'user_default';
  try {
    let clientId = localStorage.getItem('zunme_client_id');
    if (!clientId) {
      clientId = 'usr_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36);
      localStorage.setItem('zunme_client_id', clientId);
    }
    return clientId;
  } catch {
    return 'user_default';
  }
}

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('zunme_auth_token') || null;
}

export function setAuthToken(token: string | null): void {
  if (typeof window === 'undefined') return;
  if (token) {
    localStorage.setItem('zunme_auth_token', token);
  } else {
    localStorage.removeItem('zunme_auth_token');
  }
}

export function getStoredUser(): any {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('zunme_auth_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setStoredUser(user: any): void {
  if (typeof window === 'undefined') return;
  if (user) {
    localStorage.setItem('zunme_auth_user', JSON.stringify(user));
  } else {
    localStorage.removeItem('zunme_auth_user');
  }
}

interface RequestOptions extends RequestInit {
  headers?: Record<string, string>;
}

async function request(endpoint: string, options: RequestOptions = {}): Promise<any> {
  const url = `${BASE_URL}${endpoint}`;
  const token = getAuthToken();

  const headers: Record<string, string> = {
    ...options.headers
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  } else if (!endpoint.startsWith('/auth/')) {
    headers['X-User-Id'] = getOrCreateClientId();
  }

  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(url, {
    ...options,
    headers
  });

  if (!response.ok) {
    let errMessage = `HTTP ${response.status}: ${response.statusText}`;
    try {
      const errData = await response.json();
      if (errData.error) errMessage = errData.error;
    } catch {}
    const error = new Error(errMessage) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }

  return response.json();
}

export interface SendMessageParams {
  conversationId: string;
  content: string;
  model?: string;
  stream?: boolean;
  webSearch?: boolean;
  attachmentIds?: string[];
  history?: any[];
  onChunk?: (delta: string) => void;
  signal?: AbortSignal;
}

export const apiClient = {
  // Authentication
  login: async (email: string, password: string) => {
    const res = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    if (res.token) {
      setAuthToken(res.token);
      setStoredUser(res.user);
    }
    return res;
  },

  register: async (name: string, email: string, password: string) => {
    const res = await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password })
    });
    if (res.token) {
      setAuthToken(res.token);
      setStoredUser(res.user);
    }
    return res;
  },

  getMe: () => request('/auth/me'),

  logout: () => {
    setAuthToken(null);
    setStoredUser(null);
  },

  // Health & Models
  getHealth: () => request('/health'),
  getModels: () => request('/models'),

  // Conversations
  getConversations: () => request('/conversations'),
  getConversation: (id: string) => request(`/conversations/${id}`),
  createConversation: (data: { id?: string; title?: string; model?: string }) =>
    request('/conversations', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  renameConversation: (id: string, title: string) =>
    request(`/conversations/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ title })
    }),
  deleteConversation: (id: string) =>
    request(`/conversations/${id}`, {
      method: 'DELETE'
    }),
  clearMessages: (conversationId: string) =>
    request(`/conversations/${conversationId}/messages`, {
      method: 'DELETE'
    }),

  // Message Sending with SSE Streaming Support
  sendMessage: async ({
    conversationId,
    content,
    model,
    stream = true,
    webSearch = false,
    attachmentIds = [],
    history = [],
    onChunk,
    signal
  }: SendMessageParams): Promise<{ userMessage: any; assistantMessage: any }> => {
    const url = `${BASE_URL}/conversations/${conversationId}/messages`;
    const token = getAuthToken();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    } else {
      headers['X-User-Id'] = getOrCreateClientId();
    }

    if (!stream) {
      return request(`/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ content, model, stream: false, webSearch, attachmentIds, history }),
        signal
      });
    }

    // SSE Streaming
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ content, model, stream: true, webSearch, attachmentIds, history }),
      signal
    });

    if (!response.ok) {
      let errMessage = `Generation failed (${response.status})`;
      try {
        const errData = await response.json();
        if (errData.error) errMessage = errData.error;
      } catch {}
      throw new Error(errMessage);
    }

    if (!response.body) {
      throw new Error('Streaming response body is unavailable.');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    const result: { userMessage: any; assistantMessage: any } = { userMessage: null, assistantMessage: null };

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split('\n\n');
      buffer = events.pop() || '';

      for (const eventStr of events) {
        const lines = eventStr.split('\n');
        let eventName = 'message';
        let eventData = '';

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            eventName = line.slice(7).trim();
          } else if (line.startsWith('data: ')) {
            eventData = line.slice(6);
          }
        }

        if (!eventData) continue;

        try {
          const parsed = JSON.parse(eventData);
          if (eventName === 'user_message') {
            result.userMessage = parsed;
          } else if (eventName === 'chunk') {
            if (onChunk && parsed.delta) {
              onChunk(parsed.delta);
            }
          } else if (eventName === 'done') {
            result.assistantMessage = parsed.message;
          } else if (eventName === 'error') {
            throw new Error(parsed.error || 'AI generation encountered an error.');
          }
        } catch (e: any) {
          if (e.message?.includes('AI generation') || e.message?.includes('Ollama') || e.message?.includes('xAI')) {
            throw e;
          }
        }
      }
    }

    return result;
  },

  regenerateMessage: (conversationId: string, model?: string, history: any[] = []) =>
    request(`/conversations/${conversationId}/regenerate`, {
      method: 'POST',
      body: JSON.stringify({ model, history })
    }),

  // File Attachments
  uploadFiles: (conversationId: string, files: File[]) => {
    const formData = new FormData();
    for (const file of files) {
      formData.append('files', file);
    }
    formData.append('conversationId', conversationId);
    return request('/attachments/upload', {
      method: 'POST',
      body: formData
    });
  },

  deleteAttachment: (id: string) =>
    request(`/attachments/${id}`, {
      method: 'DELETE'
    }),

  // Multimodal Vision Inspection
  analyzeImage: (file: File, prompt?: string) => {
    const formData = new FormData();
    if (file instanceof File) formData.append('image', file);
    if (prompt) formData.append('prompt', prompt);
    return request('/ai/image/analyze', { method: 'POST', body: formData });
  },

  // Image Generation
  generateImage: (prompt: string, conversationId?: string, options: Record<string, any> = {}) =>
    request('/images/generate', {
      method: 'POST',
      body: JSON.stringify({ prompt, conversationId, ...options })
    }),

  getComfyUIHealth: () => request('/images/health'),

  // Universal Live AI Generation (Content Studio, Dev Studio, SEO, Agents, Spreadsheets)
  aiGenerate: (data: {
    prompt: string;
    systemPrompt?: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
    webSearch?: boolean;
  }): Promise<{ success: boolean; content: string; wordCount: number; model: string; timestamp: string }> =>
    request('/ai/generate', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  // Live Web Search with Tavily and Grok AI Synthesis
  webSearch: (query: string, searchWeb: boolean = true): Promise<any> =>
    request(`/search?q=${encodeURIComponent(query)}&web=${searchWeb ? 'true' : 'false'}`),

  // Live SEO Diagnostic Crawler
  crawlUrl: (url: string, device: 'desktop' | 'smartphone' = 'desktop'): Promise<any> =>
    request('/seo/crawl', {
      method: 'POST',
      body: JSON.stringify({ url, device })
    }),

  // User Feedback
  submitFeedback: (data: { messageId?: string; rating: number; feedback?: string }): Promise<any> =>
    request('/feedback', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  // Admin Governance, Real Metrics & Software Integrations
  getAdminMetrics: (): Promise<any> => request('/admin/metrics'),
  getAdminUsers: (): Promise<any> => request('/admin/users'),
  updateAdminUser: (id: string, updates: { status?: 'ACTIVE' | 'SUSPENDED'; role?: string }): Promise<any> =>
    request(`/admin/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates)
    }),
  getAuditLogs: (): Promise<any> => request('/admin/audit-logs'),
  getIntegrations: (): Promise<any> => request('/integration/list'),

  // Dynamic Notifications System (MySQL Database)
  getNotifications: (): Promise<any> => request('/notifications'),
  createNotification: (data: { userId?: string; role?: string; title: string; message: string; category?: string; priority?: string; iconType?: string }): Promise<any> =>
    request('/notifications', { method: 'POST', body: JSON.stringify(data) }),
  markNotificationRead: (id: string): Promise<any> =>
    request('/notifications/' + id + '/read', { method: 'PATCH' }),
  markAllNotificationsRead: (): Promise<any> =>
    request('/notifications/mark-all-read', { method: 'POST' }),
  deleteNotification: (id: string): Promise<any> =>
    request('/notifications/' + id, { method: 'DELETE' }),
  clearAllNotifications: (): Promise<any> =>
    request('/notifications/clear-all', { method: 'DELETE' }),

  // 1. Global Platform Settings
  getPlatformSettings: (): Promise<any> => request('/admin/settings'),
  updatePlatformSettings: (updates: Record<string, any>): Promise<any> =>
    request('/admin/settings', { method: 'PATCH', body: JSON.stringify(updates) }),

  // 2. Saved Library (MySQL Database)
  getLibraryItems: (category?: string, search?: string): Promise<any> => {
    let url = '/library';
    const params: string[] = [];
    if (category && category !== 'ALL') params.push('category=' + encodeURIComponent(category));
    if (search) params.push('search=' + encodeURIComponent(search));
    if (params.length) url += '?' + params.join('&');
    return request(url);
  },
  getLibraryItem: (id: string): Promise<any> => request('/library/' + id),
  saveLibraryItem: (data: {
    title: string;
    contentType?: string;
    content: string;
    previewText?: string;
    sourceMetadata?: any;
    tags?: string[];
    folderId?: string;
  }): Promise<any> =>
    request('/library', { method: 'POST', body: JSON.stringify(data) }),
  updateLibraryItem: (id: string, updates: any): Promise<any> =>
    request('/library/' + id, { method: 'PATCH', body: JSON.stringify(updates) }),
  deleteLibraryItem: (id: string): Promise<any> =>
    request('/library/' + id, { method: 'DELETE' }),
  getLibraryFolders: (): Promise<any> => request('/library/folders'),
  createLibraryFolder: (name: string, color?: string): Promise<any> =>
    request('/library/folders', { method: 'POST', body: JSON.stringify({ name, color }) }),

  // 3. Pricing Plans & Subscriptions
  getPlans: (): Promise<any> => request('/admin/plans'),
  createPlan: (plan: any): Promise<any> =>
    request('/admin/plans', { method: 'POST', body: JSON.stringify(plan) }),
  updatePlan: (id: string, plan: any): Promise<any> =>
    request('/admin/plans/' + id, { method: 'PATCH', body: JSON.stringify(plan) }),
  deletePlan: (id: string): Promise<any> =>
    request('/admin/plans/' + id, { method: 'DELETE' }),
  getMySubscription: (): Promise<any> => request('/subscriptions/me'),
  assignPlan: (userId: string, planId: string, planName: string): Promise<any> =>
    request('/admin/users/' + userId + '/assign-plan', { method: 'POST', body: JSON.stringify({ planId, planName }) }),

  // 4. User Usage & Quotas
  getMyUsage: (): Promise<any> => request('/usage/me'),
  getUsageHistory: (): Promise<any> => request('/usage/history'),
  getAdminUsage: (): Promise<any> => request('/admin/usage'),

  // 5. AI Warehouse Templates
  getWarehouseTemplates: (category?: string, search?: string, includeAll: boolean = false): Promise<any> => {
    let url = '/warehouse/templates';
    const params: string[] = [];
    if (category && category !== 'ALL') params.push('category=' + encodeURIComponent(category));
    if (search) params.push('search=' + encodeURIComponent(search));
    if (includeAll) params.push('includeAll=true');
    if (params.length) url += '?' + params.join('&');
    return request(url);
  },
  getWarehouseTemplate: (id: string): Promise<any> => request('/warehouse/templates/' + id),
  createWarehouseTemplate: (template: any): Promise<any> =>
    request('/warehouse/templates', { method: 'POST', body: JSON.stringify(template) }),
  updateWarehouseTemplate: (id: string, updates: any): Promise<any> =>
    request('/warehouse/templates/' + id, { method: 'PATCH', body: JSON.stringify(updates) }),
  deleteWarehouseTemplate: (id: string): Promise<any> =>
    request('/warehouse/templates/' + id, { method: 'DELETE' }),
  deployWarehouseTemplate: (id: string, targetEnvironment?: string): Promise<any> =>
    request('/warehouse/templates/' + id + '/deploy', { method: 'POST', body: JSON.stringify({ targetEnvironment }) }),
  getWarehouseDeployments: (): Promise<any> => request('/warehouse/deployments'),
  getWarehouseCategories: (): Promise<any> => request('/warehouse/categories'),

  // 6. Creator Studio
  getCreatorProfile: (): Promise<any> => request('/creator/profile'),
  updateCreatorProfile: (profile: any): Promise<any> =>
    request('/creator/profile', { method: 'PATCH', body: JSON.stringify(profile) }),
  getCreatorSubmissions: (): Promise<any> => request('/creator/submissions'),
  createCreatorSubmission: (data: { title: string; type?: string; category: string }): Promise<any> =>
    request('/creator/submissions', { method: 'POST', body: JSON.stringify(data) }),
  getCreatorEarnings: (): Promise<any> => request('/creator/earnings'),
  getCreatorPayouts: (): Promise<any> => request('/creator/payouts'),
  requestCreatorPayout: (amount: number, payoutMethod?: string): Promise<any> =>
    request('/creator/payouts', { method: 'POST', body: JSON.stringify({ amount, payoutMethod }) }),
  adminGetCreatorSubmissions: (): Promise<any> => request('/admin/creator/submissions'),
  adminReviewCreatorSubmission: (id: string, status: string, feedback?: string): Promise<any> =>
    request('/admin/creator/submissions/' + id + '/review', { method: 'PATCH', body: JSON.stringify({ status, feedback }) }),

  // 7. Support & Moderation
  getSupportTickets: (): Promise<any> => request('/support/tickets'),
  createSupportTicket: (ticket: { subject: string; category?: string; message: string; priority?: string }): Promise<any> =>
    request('/support/tickets', { method: 'POST', body: JSON.stringify(ticket) }),
  getSupportTicket: (id: string): Promise<any> => request('/support/tickets/' + id),
  sendSupportMessage: (ticketId: string, message: string): Promise<any> =>
    request('/support/tickets/' + ticketId + '/messages', { method: 'POST', body: JSON.stringify({ message }) }),
  adminGetSupportTickets: (status?: string, category?: string, search?: string): Promise<any> => {
    let url = '/admin/support/tickets';
    const p: string[] = [];
    if (status && status !== 'ALL') p.push('status=' + encodeURIComponent(status));
    if (category && category !== 'ALL') p.push('category=' + encodeURIComponent(category));
    if (search) p.push('search=' + encodeURIComponent(search));
    if (p.length) url += '?' + p.join('&');
    return request(url);
  },
  adminUpdateSupportTicket: (id: string, updates: { status?: string; priority?: string }): Promise<any> =>
    request('/admin/support/tickets/' + id, { method: 'PATCH', body: JSON.stringify(updates) }),

  // AI Content Tools Governance
  getAdminTools: (): Promise<any> => request('/admin/tools'),
  updateAdminTool: (id: string, updates: any): Promise<any> =>
    request('/admin/tools/' + id, { method: 'PATCH', body: JSON.stringify(updates) }),

  // 8. Admin Reports & Analytics
  getReportsOverview: (): Promise<any> => request('/admin/reports/overview'),
  getReportsExportUrl: (): string => BASE_URL + '/admin/reports/export',

  // 9. SEO Marketing
  getSeoKeywords: (): Promise<any> => request('/seo/keywords'),
  createSeoKeyword: (keyword: any): Promise<any> =>
    request('/seo/keywords', { method: 'POST', body: JSON.stringify(keyword) }),
  updateSeoKeyword: (id: string, updates: any): Promise<any> =>
    request('/seo/keywords/' + id, { method: 'PATCH', body: JSON.stringify(updates) }),
  deleteSeoKeyword: (id: string): Promise<any> =>
    request('/seo/keywords/' + id, { method: 'DELETE' }),
  getSeoProjects: (): Promise<any> => request('/seo/projects'),
  createSeoProject: (project: any): Promise<any> =>
    request('/seo/projects', { method: 'POST', body: JSON.stringify(project) }),

  // 10. Ads Manager
  getAdCampaigns: (): Promise<any> => request('/ads/campaigns'),
  createAdCampaign: (campaign: any): Promise<any> =>
    request('/ads/campaigns', { method: 'POST', body: JSON.stringify(campaign) }),
  getAdCampaign: (id: string): Promise<any> => request('/ads/campaigns/' + id),
  updateAdCampaign: (id: string, updates: any): Promise<any> =>
    request('/ads/campaigns/' + id, { method: 'PATCH', body: JSON.stringify(updates) }),
  deleteAdCampaign: (id: string): Promise<any> =>
    request('/ads/campaigns/' + id, { method: 'DELETE' }),

  // 11. Social Scheduler
  getSocialAccounts: (): Promise<any> => request('/social/accounts'),
  connectSocialAccount: (data: { platform: string; accountHandle: string; avatarUrl?: string }): Promise<any> =>
    request('/social/accounts/connect', { method: 'POST', body: JSON.stringify(data) }),
  disconnectSocialAccount: (id: string): Promise<any> =>
    request('/social/accounts/' + id, { method: 'DELETE' }),
  getSocialPosts: (): Promise<any> => request('/social/posts'),
  createSocialPost: (post: any): Promise<any> =>
    request('/social/posts', { method: 'POST', body: JSON.stringify(post) }),
  updateSocialPost: (id: string, updates: any): Promise<any> =>
    request('/social/posts/' + id, { method: 'PATCH', body: JSON.stringify(updates) }),
  deleteSocialPost: (id: string): Promise<any> =>
    request('/social/posts/' + id, { method: 'DELETE' }),
  getSocialCalendar: (): Promise<any> => request('/social/calendar'),

  // 12. Zunme Store
  getStoreProducts: (category?: string, search?: string): Promise<any> => {
    let url = '/store/products';
    const p: string[] = [];
    if (category && category !== 'ALL') p.push('category=' + encodeURIComponent(category));
    if (search) p.push('search=' + encodeURIComponent(search));
    if (p.length) url += '?' + p.join('&');
    return request(url);
  },
  createStoreProduct: (product: any): Promise<any> =>
    request('/store/products', { method: 'POST', body: JSON.stringify(product) }),
  updateStoreProduct: (id: string, updates: any): Promise<any> =>
    request('/store/products/' + id, { method: 'PATCH', body: JSON.stringify(updates) }),
  deleteStoreProduct: (id: string): Promise<any> =>
    request('/store/products/' + id, { method: 'DELETE' }),
  getStoreCategories: (): Promise<any> => request('/store/categories'),
  createStoreOrder: (orderData: { items: any[]; totalAmount: number }): Promise<any> =>
    request('/store/orders', { method: 'POST', body: JSON.stringify(orderData) }),
  getStoreOrders: (): Promise<any> => request('/store/orders'),

  // 12c. Custom AI Agents
  getCustomAgents: (): Promise<any> => request('/agents'),
  createCustomAgent: (agent: any): Promise<any> =>
    request('/agents', { method: 'POST', body: JSON.stringify(agent) }),
  deleteCustomAgent: (id: string): Promise<any> =>
    request('/agents/' + id, { method: 'DELETE' }),

  // 13. zBox Webmail
  getMailAccounts: (): Promise<any> => request('/mail/accounts'),
  getMailFolders: (): Promise<any> => request('/mail/folders'),
  getMailMessages: (folder?: string): Promise<any> => {
    const url = folder ? '/mail/inbox?folder=' + encodeURIComponent(folder) : '/mail/inbox';
    return request(url);
  },
  sendMailMessage: (message: { toAddress: string; subject: string; body: string }): Promise<any> =>
    request('/mail/send', { method: 'POST', body: JSON.stringify(message) }),

  // 14. Password Recovery
  forgotPassword: (email: string): Promise<any> =>
    request('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
  resetPassword: (token: string, newPassword: string): Promise<any> =>
    request('/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, newPassword }) })

};

