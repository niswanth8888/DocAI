import axios from 'axios';
import {
  HealthResponse,
  DashboardStats,
  UploadResponse,
  AskResponse,
  DocumentsListResponse,
  FAQsListResponse,
  TagsListResponse,
  ReviewsListResponse,
  LogsListResponse,
  StructuredLogsListResponse,
  SyncUploadsResponse,
  QualityDashboardResponse,
  SourceOfTruthResponse,
  DuplicatesResponse,
  ConflictsResponse,
  KnowledgeGapsResponse,
  UserProfile,
  AuthResponse,
  SearchHistoryResponse,
  SearchHistoryItem,
  DownloadHistoryItem,
  UserActivityItem,
  AdminDashboardStats,
  AdminAnalyticsResponse,
  SystemSettings
} from '../types/api';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

console.log("DocAI API Base URL:", API_BASE_URL);

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 180000,
  headers: {
    "ngrok-skip-browser-warning": "true",
  },
});

let isBackendOnline = false;

export function getBackendHealthStatus(): boolean {
  return isBackendOnline;
}

export function setBackendHealthStatus(status: boolean): void {
  isBackendOnline = status;
}

// Global request interceptor to attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('docai_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    config.headers["ngrok-skip-browser-warning"] = "true";
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Global response interceptor to monitor connectivity & handle auth expiration
api.interceptors.response.use(
  (response) => {
    isBackendOnline = true;
    return response;
  },
  (error) => {
    if (!error.response) {
      isBackendOnline = false;
    }
    // Only automatically redirect/log out when the /auth/me endpoint specifically returns 401 or 403
    if (error.config && error.config.url && error.config.url.includes('/auth/me')) {
      if (error.response && (error.response.status === 401 || error.response.status === 403)) {
        const isPublicPage = ['/', '/login', '/signup', '/admin/login'].includes(window.location.pathname);
        if (!isPublicPage) {
          localStorage.removeItem('docai_token');
          localStorage.removeItem('docai_user');
          window.location.href = '/login?expired=true';
        }
      }
    }
    return Promise.reject(error);
  }
);

// Cache-busting helper
const withNoCache = (url: string) => `${url}${url.includes('?') ? '&' : '?'}_t=${Date.now()}`;

const cacheHeaders = {
  'Cache-Control': 'no-cache, no-store, must-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0'
};

export async function getHealth(): Promise<HealthResponse> {
  const res = await api.get<HealthResponse>(withNoCache('/health'), { headers: cacheHeaders });
  return res.data;
}

export async function getDashboard(): Promise<DashboardStats> {
  const res = await api.get<DashboardStats>(withNoCache('/dashboard'), { headers: cacheHeaders });
  return res.data;
}

export async function uploadDocument(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await api.post<UploadResponse>("/upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
      "ngrok-skip-browser-warning": "true",
    },
    timeout: 180000,
  });

  return response.data;
}

export async function askQuestion(question: string, answerMode: string = 'detailed', selectedDocumentId: string | null = null): Promise<AskResponse> {
  const res = await api.post<AskResponse>('/ask', { question, top_k: 5, answer_mode: answerMode, selected_document_id: selectedDocumentId });
  return res.data;
}

export async function getDocuments(): Promise<DocumentsListResponse> {
  const res = await api.get<DocumentsListResponse>(withNoCache('/documents'), { headers: cacheHeaders });
  return res.data;
}

export async function getFAQs(): Promise<FAQsListResponse> {
  const res = await api.get<FAQsListResponse>(withNoCache('/faqs'), { headers: cacheHeaders });
  return res.data;
}

export async function getTags(): Promise<TagsListResponse> {
  const res = await api.get<TagsListResponse>(withNoCache('/tags'), { headers: cacheHeaders });
  return res.data;
}

export async function getReviews(): Promise<ReviewsListResponse> {
  const res = await api.get<ReviewsListResponse>(withNoCache('/reviews'), { headers: cacheHeaders });
  return res.data;
}

export async function getLogs(): Promise<LogsListResponse> {
  const res = await api.get<LogsListResponse>(withNoCache('/logs'), { headers: cacheHeaders });
  return res.data;
}

export async function getStructuredLogs(): Promise<StructuredLogsListResponse> {
  const res = await api.get<StructuredLogsListResponse>(withNoCache('/logs/structured'), { headers: cacheHeaders });
  return res.data;
}

export async function syncUploadsFolder(force: boolean = true): Promise<SyncUploadsResponse> {
  const res = await api.post<SyncUploadsResponse>(`/sync-uploads?force=${force}`);
  return res.data;
}

// Enterprise Quality Endpoints
export async function getQualityDashboard(): Promise<QualityDashboardResponse> {
  try {
    const res = await api.get<QualityDashboardResponse>(withNoCache('/quality/dashboard'), { headers: cacheHeaders });
    return res.data;
  } catch (error) {
    console.warn("Quality Dashboard API failed, using fallback mock data.", error);
    return {
      total_documents: 3,
      indexed_documents: 3,
      average_knowledge_health: 0.82,
      official_documents: 1,
      outdated_documents: 1,
      duplicate_candidates: 1,
      conflict_candidates: 1,
      knowledge_gaps: 1,
      low_confidence_questions: 1,
      documents_with_extraction_warnings: 0,
      top_risk_documents: [
        {
          document_id: "doc_mock_1",
          document: "Leave Policy 2024.pdf",
          knowledge_health_score: 0.45,
          issue: "Outdated version"
        }
      ]
    };
  }
}

export async function getQualitySourceOfTruth(): Promise<SourceOfTruthResponse> {
  try {
    const res = await api.get<SourceOfTruthResponse>(withNoCache('/quality/source-of-truth'), { headers: cacheHeaders });
    return res.data;
  } catch (error) {
    console.warn("Source of Truth API failed, using fallback mock data.", error);
    return {
      source_of_truth_documents: [
        {
          document_id: "doc_mock_2",
          document: "Leave Policy 2026.pdf",
          department: "HR",
          document_type: "Policy",
          authority_level: "official",
          status: "active",
          review_status: "approved",
          source_of_truth_score: 0.94,
          knowledge_health_score: 0.90,
          reason: "Official, Active, Approved, health: 90%."
        },
        {
          document_id: "doc_mock_1",
          document: "Leave Policy 2024.pdf",
          department: "HR",
          document_type: "Policy",
          authority_level: "standard",
          status: "outdated",
          review_status: "pending",
          source_of_truth_score: 0.35,
          knowledge_health_score: 0.45,
          reason: "Standard, Outdated, Pending, health: 45%."
        }
      ]
    };
  }
}

export async function getQualityDuplicates(): Promise<DuplicatesResponse> {
  try {
    const res = await api.get<DuplicatesResponse>(withNoCache('/quality/duplicates'), { headers: cacheHeaders });
    return res.data;
  } catch (error) {
    console.warn("Duplicates API failed, using fallback mock data.", error);
    return {
      duplicates: [
        {
          document_a: { document_id: "doc_mock_1", document: "Leave Policy 2024.pdf" },
          document_b: { document_id: "doc_mock_2", document: "Leave Policy 2026.pdf" },
          similarity_score: 0.88,
          recommendation: "Possible duplicate or new version. Review whether one should be archived."
        }
      ],
      count: 1
    };
  }
}

export async function getQualityConflicts(): Promise<ConflictsResponse> {
  try {
    const res = await api.get<ConflictsResponse>(withNoCache('/quality/conflicts'), { headers: cacheHeaders });
    return res.data;
  } catch (error) {
    console.warn("Conflicts API failed, using fallback mock data.", error);
    return {
      conflicts: [
        {
          topic: "leave approval notice period",
          documents: [
            { document_id: "doc_mock_1", document: "Leave Policy 2024.pdf", claim: "Leave must be applied 3 days before." },
            { document_id: "doc_mock_2", document: "Leave Policy 2026.pdf", claim: "Leave must be applied 7 days before." }
          ],
          severity: "medium",
          recommendation: "Review policy inconsistency and mark the latest official document as source of truth."
        }
      ],
      count: 1
    };
  }
}

export async function getQualityKnowledgeGaps(): Promise<KnowledgeGapsResponse> {
  try {
    const res = await api.get<KnowledgeGapsResponse>(withNoCache('/quality/knowledge-gaps'), { headers: cacheHeaders });
    return res.data;
  } catch (error) {
    console.warn("Knowledge Gaps API failed, using fallback mock data.", error);
    return {
      knowledge_gaps: [
        {
          topic: "remote internship policy",
          questions: ["Can interns work remotely?", "Is remote internship allowed?"],
          frequency: 4,
          last_asked_at: new Date().toISOString(),
          recommendation: "Create or upload a remote internship policy document."
        }
      ],
      count: 1
    };
  }
}

export async function patchDocumentMetadata(
  documentId: string,
  metadata: {
    department?: string;
    document_type?: string;
    owner?: string;
    authority_level?: string;
    version?: string;
    status?: string;
    review_status?: string;
  }
): Promise<any> {
  const res = await api.patch(`/documents/${documentId}/metadata`, metadata);
  return res.data;
}


// ==========================================
// AUTH & PROFILE API METHODS
// ==========================================

export async function signup(payload: any): Promise<AuthResponse> {
  const res = await api.post<AuthResponse>('/auth/signup', payload);
  return res.data;
}

export async function login(payload: any): Promise<AuthResponse> {
  const res = await api.post<AuthResponse>('/auth/login', payload);
  return res.data;
}

export async function adminLogin(payload: any): Promise<AuthResponse> {
  const res = await api.post<AuthResponse>('/auth/admin-login', payload);
  return res.data;
}

export async function getProfile(): Promise<UserProfile> {
  const res = await api.get<UserProfile>(withNoCache('/profile'), { headers: cacheHeaders });
  return res.data;
}

export async function getAuthMe(): Promise<UserProfile> {
  const res = await api.get<UserProfile>(withNoCache('/auth/me'), { headers: cacheHeaders });
  return res.data;
}

export async function patchProfile(payload: any): Promise<UserProfile> {
  const res = await api.patch<UserProfile>('/profile', payload);
  return res.data;
}

export async function changePassword(payload: any): Promise<any> {
  const res = await api.patch('/profile/change-password', payload);
  return res.data;
}

export async function patchProfileCredentials(payload: any): Promise<UserProfile> {
  const res = await api.patch<UserProfile>('/profile/credentials', payload);
  return res.data;
}

export async function getSearchHistory(params: any = {}): Promise<SearchHistoryResponse> {
  try {
    const res = await api.get<SearchHistoryResponse>(withNoCache('/profile/search-history'), {
      params,
      headers: cacheHeaders
    });
    return res.data;
  } catch (error) {
    console.warn("Search History API failed, returning mock search history.");
    return {
      history: [
        {
          search_id: "search_mock_1",
          user_id: "user_mock",
          user_name: "Mock User",
          question: "What is the company leave policy?",
          answer: "Employees are eligible for paid leave after completing the probation period. All leave requests must be submitted through the HR portal.",
          answer_mode: "detailed",
          selected_document_id: null,
          selected_document: "Leave Policy.pdf",
          primary_document_id: "doc_mock_1",
          primary_document: "Leave Policy.pdf",
          confidence: "High",
          confidence_score: 0.92,
          answer_type: "directly_supported",
          status: "answered_with_reasoning",
          sources: [],
          created_at: new Date().toISOString()
        }
      ],
      count: 1
    };
  }
}

export async function deleteSearchHistory(searchId: string): Promise<any> {
  const res = await api.delete(`/profile/search-history/${searchId}`);
  return res.data;
}

// ==========================================
// ADMIN PORTAL API METHODS
// ==========================================

export async function getAdminDashboard(): Promise<AdminDashboardStats> {
  try {
    const res = await api.get<AdminDashboardStats>(withNoCache('/admin/dashboard'), { headers: cacheHeaders });
    return res.data;
  } catch (error) {
    console.warn("Admin Dashboard API failed, returning mock dashboard statistics.");
    return {
      total_users: 4,
      active_users: 3,
      total_searches: 8,
      searches_today: 2,
      total_downloads: 3,
      low_confidence_searches: 1,
      pending_reviews: 1,
      total_documents: 2,
      top_questions: [{ question: "what is in the BIOSYNC IEEE paper?", count: 4 }],
      top_documents: [{ document: "BIOSYNC IEEE PAPER COPY.pdf", count: 6 }],
      top_users: [{ username: "Niswanth", count: 8 }],
      recent_activity: [
        {
          activity_id: "act_mock_1",
          timestamp: new Date().toISOString(),
          user_id: "user_admin",
          username: "System Administrator",
          activity_type: "admin_login",
          message: "Administrator logged in successfully",
          payload: {}
        }
      ]
    };
  }
}

export async function getAdminUsers(): Promise<{ users: UserProfile[]; count: number }> {
  try {
    const res = await api.get<{ users: UserProfile[]; count: number }>(withNoCache('/admin/users'), { headers: cacheHeaders });
    return res.data;
  } catch (error) {
    console.warn("Admin Users API failed, returning mock users.");
    return {
      users: [
        {
          user_id: "user_admin",
          name: "System Administrator",
          username: "DocAIadmin",
          email: "admin@docai.local",
          role: "admin",
          department: "IT / Administration",
          designation: "System Admin",
          status: "active",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          last_login_at: new Date().toISOString(),
          avatar_initials: "SA"
        },
        {
          user_id: "user_niswanth",
          name: "Niswanth",
          username: "niswanth",
          email: "niswanth@example.com",
          role: "user",
          department: "Engineering",
          designation: "AI Intern",
          status: "active",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          last_login_at: new Date().toISOString(),
          avatar_initials: "NS"
        }
      ],
      count: 2
    };
  }
}

export async function patchAdminUser(userId: string, payload: any): Promise<any> {
  const res = await api.patch(`/admin/users/${userId}`, payload);
  return res.data;
}

export async function resetAdminUserPassword(userId: string, payload: any): Promise<any> {
  const res = await api.patch(`/admin/users/${userId}/password`, payload);
  return res.data;
}

export async function getAdminSearches(params: any = {}): Promise<{ searches: SearchHistoryItem[]; count: number }> {
  try {
    const res = await api.get<{ searches: SearchHistoryItem[]; count: number }>(withNoCache('/admin/searches'), {
      params,
      headers: cacheHeaders
    });
    return res.data;
  } catch (error) {
    console.warn("Admin Searches API failed, returning mock searches.");
    return {
      searches: [],
      count: 0
    };
  }
}

export async function getAdminDownloads(): Promise<{ downloads: DownloadHistoryItem[]; count: number }> {
  try {
    const res = await api.get<{ downloads: DownloadHistoryItem[]; count: number }>(withNoCache('/admin/downloads'), { headers: cacheHeaders });
    return res.data;
  } catch (error) {
    return { downloads: [], count: 0 };
  }
}

export async function getAdminActivity(): Promise<{ activity: UserActivityItem[]; count: number }> {
  try {
    const res = await api.get<{ activity: UserActivityItem[]; count: number }>(withNoCache('/admin/activity'), { headers: cacheHeaders });
    return res.data;
  } catch (error) {
    return { activity: [], count: 0 };
  }
}

export async function getAdminAnalytics(): Promise<AdminAnalyticsResponse> {
  try {
    const res = await api.get<AdminAnalyticsResponse>(withNoCache('/admin/analytics'), { headers: cacheHeaders });
    return res.data;
  } catch (error) {
    console.warn("Admin Analytics API failed, returning mock analytics.");
    return {
      search_volume_by_day: [
        { date: new Date().toISOString().substring(0, 10), count: 2 }
      ],
      confidence_distribution: { High: 5, Medium: 2, Low: 1 },
      most_searched_topics: [{ topic: "leave policy", count: 3 }],
      most_used_documents: [{ document: "Leave Policy.pdf", count: 4 }],
      users_by_department: [{ department: "Engineering", count: 2 }],
      review_queue_stats: { pending: 1, approved: 1, dismissed: 0 }
    };
  }
}

export async function deleteDocument(documentId: string): Promise<{ status: string; message: string }> {
  const res = await api.delete<{ status: string; message: string }>(`/documents/${documentId}`);
  return res.data;
}

export async function deleteFAQs(documentId: string): Promise<{ status: string; message: string }> {
  const res = await api.delete<{ status: string; message: string }>(`/faqs/${documentId}`);
  return res.data;
}

export async function deleteTags(documentId: string): Promise<{ status: string; message: string }> {
  const res = await api.delete<{ status: string; message: string }>(`/tags/${documentId}`);
  return res.data;
}

export async function cleanupDuplicates(): Promise<{
  status: string;
  message: string;
  deleted_count: number;
  deleted_documents: { document_id: string; document: string }[];
}> {
  const res = await api.post<{
    status: string;
    message: string;
    deleted_count: number;
    deleted_documents: { document_id: string; document: string }[];
  }>('/admin/cleanup-duplicates');
  return res.data;
}

export async function getSystemSettings(): Promise<SystemSettings> {
  try {
    const res = await api.get<SystemSettings>('/admin/settings');
    return res.data;
  } catch (error) {
    console.warn("Get system settings API failed, returning local storage defaults.");
    const savedModel = localStorage.getItem('docai_selected_model') || 'gemini-1.5-flash';
    const savedTemp = parseFloat(localStorage.getItem('docai_model_temperature') || '0.2');
    const savedSize = parseInt(localStorage.getItem('docai_chunk_size') || '1000');
    const savedOverlap = parseInt(localStorage.getItem('docai_chunk_overlap') || '200');
    return {
      selected_model: savedModel,
      temperature: savedTemp,
      chunk_size: savedSize,
      chunk_overlap: savedOverlap
    };
  }
}

export async function patchSystemSettings(payload: Partial<SystemSettings>): Promise<SystemSettings> {
  const res = await api.patch<SystemSettings>('/admin/settings', payload);
  // Also save to localStorage as a fallback sync
  if (res.data.selected_model) localStorage.setItem('docai_selected_model', res.data.selected_model);
  if (res.data.temperature !== undefined) localStorage.setItem('docai_model_temperature', res.data.temperature.toString());
  if (res.data.chunk_size !== undefined) localStorage.setItem('docai_chunk_size', res.data.chunk_size.toString());
  if (res.data.chunk_overlap !== undefined) localStorage.setItem('docai_chunk_overlap', res.data.chunk_overlap.toString());
  return res.data;
}