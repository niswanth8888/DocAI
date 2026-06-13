from typing import Any, Literal
from pydantic import BaseModel, Field


class AskRequest(BaseModel):
    question: str = Field(..., min_length=2, max_length=2000)
    top_k: int = Field(default=5, ge=1, le=10)
    answer_mode: str = Field(default="detailed")
    selected_document_id: str | None = Field(default=None)


class SourceCitation(BaseModel):
    document_id: str
    document: str
    document_name: str | None = None
    page_number: int | None = None
    page: int | None = None
    chunk_id: str
    similarity_score: float
    evidence: str
    quoted_evidence: str | None = None
    citation_relevance_score: float | None = None
    citation_support_summary: str | None = None
    download_url: str | None = None
    section_heading: str | None = None
    line_start: int | None = None
    line_end: int | None = None
    evidence_match_score: float | None = None
    citation_type: str | None = None
    can_download: bool | None = None


class AskResponse(BaseModel):
    question: str
    answer: str
    answer_type: str
    confidence: Literal["High", "Medium", "Low"]
    confidence_score: float
    reasoning_summary: str
    sources: list[SourceCitation]
    related_faqs: list[str] = []
    status: str
    question_intent: str | None = None
    evidence_answers_question: bool | None = None
    grounding_confidence: float | None = None
    answer_mode: str | None = None
    primary_document_id: str | None = None
    primary_document: str | None = None
    download_url: str | None = None
    exact_match_found: bool | None = None
    related_documents: list[dict[str, Any]] = []
    missing_source: bool | None = None
    reliability_warning: str | None = None
    query_intent: str | None = None
    answer_status: str | None = None
    reliability_score: float | None = None
    supporting_citations: list[SourceCitation] = []
    related_sources: list[SourceCitation] = []
    evidence_line_ranges: list[str] = []
    section_found: str | None = None
    can_download_document: bool | None = None



class UploadDiagnostics(BaseModel):
    extracted_text_length: int
    chunks_created: int
    indexed: bool
    sample_extracted_text: str
    warning: str | None = None


class UploadResponse(BaseModel):
    document_id: str
    document: str
    status: str
    summary: str
    generated_faqs: list[str]
    generated_tags: list[str]
    chunks_created: int
    vector_status: str
    structured_log: str
    message: str
    diagnostics: UploadDiagnostics | None = None
    duplicate_detected: bool | None = False
    existing_document_id: str | None = None


class ReviewItem(BaseModel):
    review_id: str
    question: str
    answer: str
    confidence: str
    confidence_score: float
    reason: str
    retrieved_sources: list[dict[str, Any]]
    status: str = "Needs Review"
    created_at: str


class DocumentMetadataPatch(BaseModel):
    department: str | None = None
    document_type: str | None = None
    owner: str | None = None
    authority_level: str | None = None
    version: str | None = None
    status: str | None = None
    review_status: str | None = None
    # Enterprise Access Control fields
    visibility: str | None = None
    allowed_departments: list[str] | None = None
    allowed_groups: list[str] | None = None
    allow_download: bool | None = None
    download_allowed_roles: list[str] | None = None
    rejection_reason: str | None = None


class ApproveDocumentRequest(BaseModel):
    visibility: str
    allowed_departments: list[str] = []
    allowed_groups: list[str] = []
    allow_download: bool = False
    download_allowed_roles: list[str] = []


class RejectDocumentRequest(BaseModel):
    rejection_reason: str


class SignupRequest(BaseModel):
    username: str = Field(..., min_length=2, max_length=100)
    email: str = Field(..., min_length=5, max_length=150)
    password: str = Field(..., min_length=6, max_length=100)
    full_name: str | None = Field(default=None, min_length=2, max_length=100)
    department: str = Field(..., min_length=2, max_length=100)
    title: str | None = Field(default=None, min_length=2, max_length=100)
    access_groups: list[str] = []
    
    # Compat
    name: str | None = Field(default=None, min_length=2, max_length=100)
    designation: str | None = Field(default=None, min_length=2, max_length=100)
    confirm_password: str | None = Field(default=None)


class LoginRequest(BaseModel):
    email: str | None = None
    identifier: str | None = None
    password: str


class AdminLoginRequest(BaseModel):
    username: str
    password: str


class UserResponseItem(BaseModel):
    user_id: str
    name: str
    full_name: str | None = None
    username: str
    email: str | None = ""
    role: str
    department: str
    designation: str
    title: str | None = None
    status: str
    is_active: bool | None = None
    created_at: str
    updated_at: str
    last_login_at: str | None = None
    last_login: str | None = None
    must_change_password: bool | None = None
    avatar_initials: str
    access_groups: list[str] = []


class AuthTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponseItem


class ProfileUpdateRequest(BaseModel):
    name: str | None = None
    username: str | None = None
    email: str | None = None
    department: str | None = None
    designation: str | None = None


class PasswordChangeRequest(BaseModel):
    old_password: str
    new_password: str


class AdminUserPatch(BaseModel):
    name: str | None = None
    full_name: str | None = None
    username: str | None = None
    email: str | None = None
    department: str | None = None
    designation: str | None = None
    title: str | None = None
    role: str | None = None
    status: str | None = None
    is_active: bool | None = None


class AdminResetPasswordRequest(BaseModel):
    new_password: str = Field(..., min_length=6, max_length=100)
    must_change_password: bool = True


class UserCredentialsUpdateRequest(BaseModel):
    username: str | None = None
    email: str | None = None
    current_password: str | None = None
    new_password: str | None = None


class SystemSettingsResponse(BaseModel):
    selected_model: str
    temperature: float
    chunk_size: int
    chunk_overlap: int
    updated_at: str | None = None
    updated_by: str | None = None


class SystemSettingsPatch(BaseModel):
    selected_model: str | None = None
    temperature: float | None = None
    chunk_size: int | None = None
    chunk_overlap: int | None = None


