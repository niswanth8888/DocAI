from __future__ import annotations

from app.config import settings


class LLMClient:
    """
    Uses Gemini if GEMINI_API_KEY is available.
    Uses OpenAI if OPENAI_API_KEY is available.
    If no key exists or the provider fails, returns None so fallback logic can run.
    """

    def __init__(self) -> None:
        self.provider = "fallback"

    def generate(self, prompt: str, temperature: float = 0.1, model: str | None = None) -> str | None:
        gemini_key = settings.gemini_api_key.strip() if settings.gemini_api_key else ""
        if gemini_key and (gemini_key.startswith("AIzaSy") or gemini_key.startswith("AQ.")):
            response = self._generate_gemini(prompt, temperature, model)
            if response:
                return response

        if settings.openai_api_key and settings.openai_api_key.strip().startswith("sk-"):
            response = self._generate_openai(prompt, temperature, model)
            if response:
                return response

        return None

    def _generate_gemini(self, prompt: str, temperature: float, model: str | None = None) -> str | None:
        try:
            import google.generativeai as genai

            genai.configure(api_key=settings.gemini_api_key)
            model_name = model or settings.gemini_model
            model_obj = genai.GenerativeModel(
                model_name=model_name,
                generation_config={"temperature": temperature},
            )
            result = model_obj.generate_content(prompt, request_options={"timeout": 5.0})
            return getattr(result, "text", None)
        except Exception:
            return None

    def _generate_openai(self, prompt: str, temperature: float, model: str | None = None) -> str | None:
        try:
            from openai import OpenAI

            client = OpenAI(api_key=settings.openai_api_key)
            model_name = model or settings.openai_model
            response = client.chat.completions.create(
                model=model_name,
                temperature=temperature,
                timeout=5.0,
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "You are DocAI Engine, a document-grounded reasoning system. "
                            "Use only the supplied evidence. You may make logical inferences from evidence, "
                            "but never invent company policy."
                        ),
                    },
                    {"role": "user", "content": prompt},
                ],
            )
            return response.choices[0].message.content
        except Exception:
            return None


llm_client = LLMClient()
