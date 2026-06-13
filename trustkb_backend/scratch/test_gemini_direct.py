import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.config import settings
import google.generativeai as genai

def test_gemini():
    print(f"Gemini API Key: {settings.gemini_api_key}")
    print(f"Gemini Model: {settings.gemini_model}")
    
    try:
        genai.configure(api_key=settings.gemini_api_key)
        model_obj = genai.GenerativeModel(
            model_name="models/gemini-2.0-flash",
            generation_config={"temperature": 0.1},
        )
        print("Sending generate_content request...")
        result = model_obj.generate_content("Hello, this is a test. Answer with one word: 'Success'.")
        print("Request finished.")
        print(f"Result text: {getattr(result, 'text', None)}")
    except Exception as e:
        import traceback
        print("EXCEPTION RAISED:")
        traceback.print_exc()

if __name__ == "__main__":
    test_gemini()
