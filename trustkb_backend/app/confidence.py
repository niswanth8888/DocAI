from app.config import settings


def classify_confidence(
    answer_type: str,
    top_vector_score: float,
    grounding_confidence: float | None = None,
    evidence_answers_question: bool = True,
    question: str = "",
    retrieved_chunks: list | None = None,
    citations_exist: bool = True,
    document_accessible: bool = True
) -> tuple[str, float]:
    """
    Returns confidence label and final confidence score (0.0 to 1.0) using a multi-factor formula.
    """
    import re

    # 1. Base Score
    base_score = grounding_confidence if grounding_confidence is not None else top_vector_score
    if base_score is None:
        base_score = 0.5

    # 2. Hard boundary overrides
    # If unsupported, or no evidence, or no citations, or document is not accessible
    answer_type_clean = (answer_type or "").lower()
    if (
        "unsupported" in answer_type_clean or 
        not evidence_answers_question or 
        not citations_exist or 
        not document_accessible
    ):
        return "Low", 0.20

    # 3. Factor Adjustments
    # Term overlap match boost: check query terms in retrieved chunk text
    term_match_ratio = 0.0
    if question and retrieved_chunks:
        stopwords = {
            "what", "who", "where", "when", "why", "how", "is", "are", "was", "were", 
            "in", "on", "at", "the", "a", "an", "and", "or", "for", "to", "of", "about", 
            "explain", "summarize", "tell", "me", "details", "document", "paper", "role", 
            "seeking", "internship", "java", "in", "a", "of", "the"
        }
        q_words = [w.lower() for w in re.findall(r"\b\w{3,}\b", question) if w.lower() not in stopwords]
        if q_words:
            matched_words = 0
            combined_text = " ".join(c.get("text", "").lower() for c in retrieved_chunks)
            for w in q_words:
                if w in combined_text:
                    matched_words += 1
            term_match_ratio = matched_words / len(q_words)

    # Similarity component
    sim_factor = max(0.0, min(1.0, top_vector_score))

    # Chunk count boost (more supporting evidence = higher confidence)
    chunk_count = len(retrieved_chunks) if retrieved_chunks else 0
    count_boost = min(0.10, chunk_count * 0.02) # Up to +0.10 boost for 5 chunks

    # Term match boost
    term_boost = term_match_ratio * 0.15 # Up to +0.15 boost

    # Combined formula
    computed_score = (base_score * 0.60) + (sim_factor * 0.40) + count_boost + term_boost

    # 4. Strict bounding by support category
    if "directly_supported" in answer_type_clean or "extracted_fact" in answer_type_clean or "direct_or_evidence_based" in answer_type_clean:
        clamped_score = max(0.85, min(computed_score, 0.95))
    elif "inferred" in answer_type_clean:
        clamped_score = max(0.70, min(computed_score, 0.84))
    elif "partial" in answer_type_clean:
        clamped_score = max(0.50, min(computed_score, 0.69))
    else:
        clamped_score = max(0.30, min(computed_score, 0.49))

    final_score = max(0.0, min(1.0, clamped_score))
    final_score = round(final_score, 2)

    # Determine qualitative confidence label
    if final_score >= 0.85:
        label = "High"
    elif final_score >= 0.50:
        label = "Medium"
    else:
        label = "Low"

    return label, final_score


def should_move_to_review(
    confidence: str,
    confidence_score: float,
    answer_type: str,
    evidence_answers_question: bool = True
) -> bool:
    """
    Determines if the generated answer requires human validation.
    """
    answer_type = (answer_type or "").lower()
    
    if confidence == "Low":
        return True
    if "unsupported" in answer_type:
        return True
    if not evidence_answers_question:
        return True
        
    return False

