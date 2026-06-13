import re
from typing import Any

from app.utils import new_id, short_evidence


def split_text(text: str, chunk_size: int = 1200, overlap: int = 200) -> list[str]:
    """
    Chunk text while trying to preserve sentence boundaries (Fallback/Utility).
    """
    text = re.sub(r"\s+", " ", text).strip()
    if not text:
        return []

    sentences = re.split(r"(?<=[.!?])\s+", text)
    chunks: list[str] = []
    current = ""

    for sentence in sentences:
        sentence = sentence.strip()
        if not sentence:
            continue

        if len(current) + len(sentence) + 1 <= chunk_size:
            current = f"{current} {sentence}".strip()
        else:
            if current:
                chunks.append(current)
            if len(sentence) > chunk_size:
                for i in range(0, len(sentence), chunk_size - overlap):
                    chunks.append(sentence[i:i + chunk_size])
                current = ""
            else:
                tail = current[-overlap:] if overlap and current else ""
                current = f"{tail} {sentence}".strip()

    if current:
        chunks.append(current)

    return [c.strip() for c in chunks if len(c.strip()) > 40]


def build_chunks(document_id: str, document_name: str, pages: list[dict[str, Any]]) -> list[dict[str, Any]]:
    # Load system settings
    from app.storage import read_system_settings
    settings = read_system_settings()
    chunk_size = settings.get("chunk_size", 1000)
    chunk_overlap = settings.get("chunk_overlap", 200)

    chunks: list[dict[str, Any]] = []
    
    # 1. Gather all text units from all pages
    all_units = []
    for page in pages:
        all_units.extend(page.get("text_units", []))
        
    if not all_units:
        # Fallback to simple split_text chunking if text_units is empty
        for page in pages:
            page_number = int(page["page"])
            for index, chunk_text in enumerate(split_text(page["text"], chunk_size=chunk_size, overlap=chunk_overlap), start=1):
                chunk_id = new_id("chunk")
                chunks.append({
                    "chunk_id": chunk_id,
                    "document_id": document_id,
                    "document": document_name,
                    "page": page_number,
                    "chunk_index": index,
                    "text": chunk_text,
                    "preview": short_evidence(chunk_text, 220),
                    "chunk_type": "medium",
                    "section_heading": "General",
                    "line_start": 1,
                    "line_end": 1,
                    "paragraph_start": 1,
                    "paragraph_end": 1,
                    "original_exact_text": chunk_text
                })
        return chunks

    # 2. Build Small Chunks (~250 chars) for exact matching and line-level citation
    current_small = []
    current_len = 0
    small_idx = 1
    for unit in all_units:
        text = unit["exact_text"]
        if not text:
            continue
        current_small.append(unit)
        current_len += len(text)
        if current_len >= 250:
            chunk_text = " ".join(u["exact_text"] for u in current_small)
            chunks.append({
                "chunk_id": f"chunk_s_{new_id('c')}",
                "document_id": document_id,
                "document": document_name,
                "page": current_small[0]["page_number"],
                "chunk_index": small_idx,
                "text": chunk_text,
                "preview": short_evidence(chunk_text, 220),
                "chunk_type": "small",
                "section_heading": current_small[0]["section_heading"],
                "line_start": current_small[0]["line_start"],
                "line_end": current_small[-1]["line_end"],
                "paragraph_start": current_small[0]["paragraph_index"],
                "paragraph_end": current_small[-1]["paragraph_index"],
                "original_exact_text": chunk_text
            })
            current_small = []
            current_len = 0
            small_idx += 1
            
    if current_small:
        chunk_text = " ".join(u["exact_text"] for u in current_small)
        chunks.append({
            "chunk_id": f"chunk_s_{new_id('c')}",
            "document_id": document_id,
            "document": document_name,
            "page": current_small[0]["page_number"],
            "chunk_index": small_idx,
            "text": chunk_text,
            "preview": short_evidence(chunk_text, 220),
            "chunk_type": "small",
            "section_heading": current_small[0]["section_heading"],
            "line_start": current_small[0]["line_start"],
            "line_end": current_small[-1]["line_end"],
            "paragraph_start": current_small[0]["paragraph_index"],
            "paragraph_end": current_small[-1]["paragraph_index"],
            "original_exact_text": chunk_text
        })

    # 3. Build Medium Chunks for semantic/vector retrieval (using dynamic chunk_size and chunk_overlap)
    current_medium = []
    current_len = 0
    medium_idx = 1
    for unit in all_units:
        text = unit["exact_text"]
        if not text:
            continue
        current_medium.append(unit)
        current_len += len(text)
        if current_len >= chunk_size:
            chunk_text = " ".join(u["exact_text"] for u in current_medium)
            chunks.append({
                "chunk_id": f"chunk_m_{new_id('c')}",
                "document_id": document_id,
                "document": document_name,
                "page": current_medium[0]["page_number"],
                "chunk_index": medium_idx,
                "text": chunk_text,
                "preview": short_evidence(chunk_text, 220),
                "chunk_type": "medium",
                "section_heading": current_medium[0]["section_heading"],
                "line_start": current_medium[0]["line_start"],
                "line_end": current_medium[-1]["line_end"],
                "paragraph_start": current_medium[0]["paragraph_index"],
                "paragraph_end": current_medium[-1]["paragraph_index"],
                "original_exact_text": chunk_text
            })
            
            # Apply dynamic chunk overlap by keeping units at the end of current_medium up to chunk_overlap size
            overlap_units = []
            overlap_len = 0
            for u in reversed(current_medium):
                u_len = len(u.get("exact_text", ""))
                if overlap_len + u_len <= chunk_overlap:
                    overlap_units.insert(0, u)
                    overlap_len += u_len
                else:
                    break
            current_medium = overlap_units
            current_len = overlap_len
            medium_idx += 1
            
    if current_medium:
        chunk_text = " ".join(u["exact_text"] for u in current_medium)
        chunks.append({
            "chunk_id": f"chunk_m_{new_id('c')}",
            "document_id": document_id,
            "document": document_name,
            "page": current_medium[0]["page_number"],
            "chunk_index": medium_idx,
            "text": chunk_text,
            "preview": short_evidence(chunk_text, 220),
            "chunk_type": "medium",
            "section_heading": current_medium[0]["section_heading"],
            "line_start": current_medium[0]["line_start"],
            "line_end": current_medium[-1]["line_end"],
            "paragraph_start": current_medium[0]["paragraph_index"],
            "paragraph_end": current_medium[-1]["paragraph_index"],
            "original_exact_text": chunk_text
        })

    # 4. Build Large (Section Summary) Chunks for map-reduce tasks
    sections_map = {}
    for unit in all_units:
        heading = unit["section_heading"]
        if heading not in sections_map:
            sections_map[heading] = []
        sections_map[heading].append(unit)
        
    large_idx = 1
    for heading, u_list in sections_map.items():
        section_text = " ".join(u["exact_text"] for u in u_list)
        # Summarize or take first portion of section to represent summary
        summary_text = f"Section Summary of {heading}: " + section_text[:300] + "..." if len(section_text) > 300 else section_text
        
        chunks.append({
            "chunk_id": f"chunk_l_{new_id('c')}",
            "document_id": document_id,
            "document": document_name,
            "page": u_list[0]["page_number"],
            "chunk_index": large_idx,
            "text": summary_text,
            "preview": short_evidence(summary_text, 220),
            "chunk_type": "large",
            "section_heading": heading,
            "line_start": u_list[0]["line_start"],
            "line_end": u_list[-1]["line_end"],
            "paragraph_start": u_list[0]["paragraph_index"],
            "paragraph_end": u_list[-1]["paragraph_index"],
            "original_exact_text": section_text
        })
        large_idx += 1
        
    return chunks
