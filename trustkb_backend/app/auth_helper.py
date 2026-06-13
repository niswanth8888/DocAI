from __future__ import annotations

import re
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from app.utils import hash_password, verify_password

from app.storage import storage

SECRET_KEY = "docai_enterprise_secret_key_change_me_in_production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 480  # 8 hours

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login", auto_error=False)


def create_access_token(data: dict[str, Any], expires_delta: timedelta | None = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> dict[str, Any] | None:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None


def get_user_by_email(email: str) -> dict[str, Any] | None:
    users = storage.read_users()
    email_clean = email.lower().strip()
    for user in users:
        if user.get("email") and user.get("email", "").lower().strip() == email_clean:
            return user
    return None


def get_user_by_username(username: str) -> dict[str, Any] | None:
    users = storage.read_users()
    username_clean = username.lower().strip()
    for user in users:
        if user.get("username", "").lower().strip() == username_clean:
            return user
    return None


def get_user_by_identifier(identifier: str) -> dict[str, Any] | None:
    user = get_user_by_username(identifier)
    if user:
        return user
    return get_user_by_email(identifier)


def get_user_by_id(user_id: str) -> dict[str, Any] | None:
    users = storage.read_users()
    for user in users:
        if user.get("user_id") == user_id:
            return user
    return None


def get_current_user(token: str | None = Depends(oauth2_scheme)) -> dict[str, Any]:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception
    user_id: str | None = payload.get("sub")
    if user_id is None:
        raise credentials_exception
    user = get_user_by_id(user_id)
    if user is None:
        raise credentials_exception
    if user.get("status") != "active" or not user.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is disabled. Contact administrator."
        )
    return user


def get_current_admin(current_user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrative privileges required"
        )
    return current_user


def get_optional_user(request: Request) -> dict[str, Any] | None:
    """
    Optional user parser to enable anonymous API requests if token is missing/invalid.
    Ensures backward compatibility with pre-existing scripts/tests.
    """
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        # Check query parameters as fallback
        token = request.query_params.get("token")
        if not token:
            return None
    else:
        token = auth_header.split(" ")[1]

    payload = decode_access_token(token)
    if payload is None:
        return None
    user_id = payload.get("sub")
    if user_id is None:
        return None
    user = get_user_by_id(user_id)
    if user and user.get("status") == "active" and user.get("is_active", True):
        return user
    return None


def can_view_document(user: dict[str, Any], doc: dict[str, Any]) -> bool:
    if user.get("role") == "admin":
        return True
        
    status = doc.get("status")
    visibility = doc.get("visibility")
    owner_user_id = doc.get("owner_user_id")
    owner_username = doc.get("owner_username")
    user_id = user.get("user_id")
    username = user.get("username")
    
    is_owner = (user_id == owner_user_id) or (username and owner_username and username == owner_username)
    
    if status == "archived" or visibility == "archived":
        return False
        
    if visibility == "admin_only":
        return False
        
    if visibility == "private":
        return is_owner
        
    if status in ["pending", "rejected"]:
        return is_owner
        
    if status == "approved":
        if visibility == "public":
            return True
            
        elif visibility == "department":
            user_dept = user.get("department")
            allowed_depts = doc.get("allowed_departments", [])
            if user_dept and allowed_depts:
                return any(d.lower().strip() == user_dept.lower().strip() for d in allowed_depts)
            return False
            
        elif visibility == "restricted_groups":
            user_groups = user.get("access_groups", [])
            allowed_groups = doc.get("allowed_groups", [])
            if user_groups and allowed_groups:
                return len(set(g.lower().strip() for g in user_groups) & set(g.lower().strip() for g in allowed_groups)) > 0
            return False
            
    return False


def can_ask_document(user: dict[str, Any], doc: dict[str, Any]) -> bool:
    if user.get("role") == "admin":
        return True
        
    if doc.get("status") != "approved":
        return False
        
    visibility = doc.get("visibility")
    if visibility in ["private", "admin_only", "archived"]:
        return False
        
    return can_view_document(user, doc)


def can_download_document(user: dict[str, Any], doc: dict[str, Any]) -> bool:
    if user.get("role") == "admin":
        return True
        
    status = doc.get("status")
    visibility = doc.get("visibility")
    owner_user_id = doc.get("owner_user_id")
    owner_username = doc.get("owner_username")
    user_id = user.get("user_id")
    username = user.get("username")
    
    is_owner = (user_id == owner_user_id) or (username and owner_username and username == owner_username)
    
    if status in ["rejected", "pending"] or visibility in ["private", "admin_only", "archived"]:
        return is_owner
        
    if not doc.get("allow_download", False):
        return is_owner
        
    if is_owner:
        return True
        
    download_allowed_roles = doc.get("download_allowed_roles", [])
    if not download_allowed_roles:
        return False
        
    roles_clean = [r.lower().strip() for r in download_allowed_roles]
    has_role_permission = any(r in ["employee", "all"] for r in roles_clean)
    if not has_role_permission:
        return False
        
    if visibility == "public":
        return True
        
    elif visibility == "department":
        user_dept = user.get("department")
        allowed_depts = doc.get("allowed_departments", [])
        if user_dept and allowed_depts:
            return any(d.lower().strip() == user_dept.lower().strip() for d in allowed_depts)
        return False
        
    elif visibility == "restricted_groups":
        user_groups = user.get("access_groups", [])
        allowed_groups = doc.get("allowed_groups", [])
        if user_groups and allowed_groups:
            return len(set(g.lower().strip() for g in user_groups) & set(g.lower().strip() for g in allowed_groups)) > 0
        return False
        
    return False


def can_edit_document(user: dict[str, Any], doc: dict[str, Any]) -> bool:
    return user.get("role") == "admin"


def can_delete_document(user: dict[str, Any], doc: dict[str, Any]) -> bool:
    if user.get("role") == "admin":
        return True
        
    status = doc.get("status")
    owner_user_id = doc.get("owner_user_id")
    owner_username = doc.get("owner_username")
    user_id = user.get("user_id")
    username = user.get("username")
    
    is_owner = (user_id == owner_user_id) or (username and owner_username and username == owner_username)
    
    if is_owner and status == "pending":
        return True
        
    return False


def require_admin(user: dict[str, Any]) -> None:
    if user.get("role") != "admin":
        raise HTTPException(
            status_code=403,
            detail="Admin access required"
        )
