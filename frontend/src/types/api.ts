export interface HealthResponse {
  status: string;
  app: string;
  message: string;
}

export interface DashboardStats {
  total_documents: number;
  total_chunks: number;
  total_faqs: number;
  total_tags: number;
  questions_answered: number;
  low_confidence_queries: number;
  pending_reviews: number;
}

export interface UploadDiagnostics {
  extracted_text_length: number;
  chunks_created: number;
  indexed: boolean;
  sample_extracted_text: string;
  warning: string | null;
}

export interface UploadResponse {
  document_id: string;
  document: string;
  status: string;
  summary: string;
  generated_faqs: string[];
  generated_tags: string[];
  chunks_created: number;
  vector_status: string;
  structured_log: string;
  message: string;
  diagnostics?: UploadDiagnostics;
  duplicate_detected?: boolean;
  existing_document_id?: string;
}

export interface SourceCitation {
  document_id: string;
  document: string;
  page: number;
  page_number?: number | null;
  chunk_id: string;
  similarity_score: number;
  evidence: string;
  citation_relevance_score?: number;
  citation_support_summary?: string;
  download_url?: string;
  section_heading?: string | null;
  line_start?: number | null;
  line_end?: number | null;
  evidence_match_score?: number | null;
  quoted_evidence?: string | null;
  citation_type?: string | null;
  can_download?: boolean;
}

export interface AskResponse {
  question: string;
  answer: string;
  answer_type: string;
  confidence: 'High' | 'Medium' | 'Low';
  confidence_score: number;
  reasoning_summary: string;
  sources: SourceCitation[];
  related_faqs: string[];
  status: string;
  answer_mode?: string;
  primary_document_id?: string;
  primary_document?: string;
  download_url?: string;
  exact_match_found?: boolean;
  related_documents?: { document_id: string; document: string; download_url?: string }[];
  missing_source?: boolean;
  reliability_warning?: string | null;
  query_intent?: string | null;
  answer_status?: string | null;
  reliability_score?: number | null;
  supporting_citations?: SourceCitation[];
  related_sources?: SourceCitation[];
  evidence_line_ranges?: string[];
  section_found?: string | null;
  can_download_document?: boolean;
}

export interface DocumentItem {
  document_id: string;
  document: string;
  uploaded_at?: string;
  chunks_count?: number;
  chunks_created?: number;
  download_url?: string;
  status?: string;
  
  // Enterprise Metadata
  department?: string;
  document_type?: string;
  owner?: string;
  authority_level?: string;
  version?: string;
  review_status?: string;
  source_of_truth_score?: number;
  knowledge_health_score?: number;
  duplicate_candidates?: string[];
  conflict_candidates?: string[];
  last_reviewed_at?: string | null;
  expiry_warning?: string | null;
  owner_user_id?: string;
  owner_username?: string;
  visibility?: string;
  allowed_departments?: string[];
  allowed_groups?: string[];
  allow_download?: boolean;
  download_allowed_roles?: string[];
  rejection_reason?: string | null;
}

export interface DocumentsListResponse {
  documents: DocumentItem[];
  count: number;
}

export interface FAQItem {
  document_id: string;
  document: string;
  faq: string;
}

export interface FAQsListResponse {
  faqs: FAQItem[];
  count: number;
}

export interface TagItem {
  document_id: string;
  document: string;
  tag: string;
}

export interface TagsListResponse {
  tags: TagItem[];
  count: number;
}

export interface ReviewItem {
  review_id: string;
  question: string;
  answer: string;
  confidence: 'High' | 'Medium' | 'Low';
  confidence_score: number;
  reason: string;
  retrieved_sources: SourceCitation[];
  status: string;
  created_at: string;
}

export interface ReviewsListResponse {
  reviews: ReviewItem[];
  count: number;
}

export interface LogItem {
  timestamp: string;
  event_type: string;
  message: string;
  payload: Record<string, unknown>;
}

export interface LogsListResponse {
  logs: LogItem[];
  count: number;
}

export interface StructuredLogItem {
  document_id: string;
  document: string;
  structured_log: string;
}

export interface StructuredLogsListResponse {
  structured_logs: StructuredLogItem[];
  count: number;
}

export interface ProcessedSyncDocument {
  document_id: string;
  document: string;
  status: string;
  summary: string;
  generated_faqs: string[];
  generated_tags: string[];
  chunks_created: number;
  vector_status: string;
  diagnostics: UploadDiagnostics;
}

export interface SkippedSyncDocument {
  document: string;
  reason: string;
}

export interface FailedSyncDocument {
  document: string;
  error: string;
}

export interface SyncUploadsResponse {
  status: string;
  processed_count: number;
  skipped_count: number;
  failed_count: number;
  processed_documents: ProcessedSyncDocument[];
  skipped_documents: SkippedSyncDocument[];
  failed_documents: FailedSyncDocument[];
}

export interface QualityDashboardResponse {
  total_documents: number;
  indexed_documents: number;
  average_knowledge_health: number;
  official_documents: number;
  outdated_documents: number;
  duplicate_candidates: number;
  conflict_candidates: number;
  knowledge_gaps: number;
  low_confidence_questions: number;
  documents_with_extraction_warnings: number;
  top_risk_documents: {
    document_id: string;
    document: string;
    knowledge_health_score: number;
    issue: string;
  }[];
}

export interface SourceOfTruthDocument {
  document_id: string;
  document: string;
  department: string;
  document_type: string;
  authority_level: string;
  status: string;
  review_status: string;
  source_of_truth_score: number;
  knowledge_health_score: number;
  reason: string;
}

export interface SourceOfTruthResponse {
  source_of_truth_documents: SourceOfTruthDocument[];
}

export interface DuplicateCandidate {
  document_a: {
    document_id: string;
    document: string;
  };
  document_b: {
    document_id: string;
    document: string;
  };
  similarity_score: number;
  recommendation: string;
}

export interface DuplicatesResponse {
  duplicates: DuplicateCandidate[];
  count: number;
}

export interface ConflictDocument {
  document_id: string;
  document: string;
  claim: string;
}

export interface PolicyConflict {
  topic: string;
  documents: ConflictDocument[];
  severity: 'low' | 'medium' | 'high';
  recommendation: string;
}

export interface ConflictsResponse {
  conflicts: PolicyConflict[];
  count: number;
}

export interface KnowledgeGap {
  topic: string;
  questions: string[];
  frequency: number;
  last_asked_at: string;
  recommendation: string;
}

export interface KnowledgeGapsResponse {
  knowledge_gaps: KnowledgeGap[];
  count: number;
}


// Enterprise Auth & Admin Types
export interface UserProfile {
  user_id: string;
  name: string;
  full_name?: string;
  username: string;
  email: string;
  role: 'user' | 'admin';
  department: string;
  designation: string;
  title?: string;
  status: 'active' | 'disabled';
  is_active?: boolean;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
  last_login?: string | null;
  must_change_password?: boolean;
  avatar_initials: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: UserProfile;
}

export interface SearchHistoryItem {
  search_id: string;
  user_id: string;
  user_name: string;
  question: string;
  answer: string;
  answer_mode: string;
  selected_document_id: string | null;
  selected_document: string;
  primary_document_id: string;
  primary_document: string;
  confidence: 'High' | 'Medium' | 'Low';
  confidence_score: number;
  answer_type: string;
  status: string;
  sources: SourceCitation[];
  created_at: string;
}

export interface SearchHistoryResponse {
  history: SearchHistoryItem[];
  count: number;
}

export interface DownloadHistoryItem {
  download_id: string;
  user_id: string;
  user_name: string;
  document_id: string;
  document: string;
  downloaded_at: string;
}

export interface DownloadHistoryResponse {
  downloads: DownloadHistoryItem[];
  count: number;
}

export interface UserActivityItem {
  activity_id: string;
  timestamp: string;
  user_id: string;
  username: string;
  activity_type: string;
  message: string;
  payload: Record<string, unknown>;
}

export interface UserActivityResponse {
  activity: UserActivityItem[];
  count: number;
}

export interface AdminDashboardStats {
  total_users: number;
  active_users: number;
  total_searches: number;
  searches_today: number;
  total_downloads: number;
  low_confidence_searches: number;
  pending_reviews: number;
  total_documents: number;
  top_questions: { question: string; count: number }[];
  top_documents: { document: string; count: number }[];
  top_users: { username: string; count: number }[];
  recent_activity: UserActivityItem[];
}

export interface AdminAnalyticsResponse {
  search_volume_by_day: { date: string; count: number }[];
  confidence_distribution: {
    High: number;
    Medium: number;
    Low: number;
  };
  most_searched_topics: { topic: string; count: number }[];
  most_used_documents: { document: string; count: number }[];
  users_by_department: { department: string; count: number }[];
  review_queue_stats: {
    pending: number;
    approved: number;
    dismissed: number;
  };
}

export interface SystemSettings {
  selected_model: string;
  temperature: number;
  chunk_size: number;
  chunk_overlap: number;
  updated_at?: string | null;
  updated_by?: string | null;
}

