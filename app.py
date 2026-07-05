"""
╔══════════════════════════════════════════════════════════════════╗
║               NutriMind — Main Flask Application                 ║
║            AI-Powered Nutrition Agent with IBM Watsonx           ║
╚══════════════════════════════════════════════════════════════════╝

Entry point:  python app.py
Production (Windows):  waitress-serve --port=5000 app:app
Production (Linux):    gunicorn -w 4 -b 0.0.0.0:5000 app:app
"""

import os
import json
import logging
from datetime import datetime
from flask import Flask, render_template, request, jsonify, session
from flask_cors import CORS
from dotenv import load_dotenv

# ── Load environment variables ─────────────────────────────────────
load_dotenv()

# ── IBM Watsonx.ai SDK ─────────────────────────────────────────────
try:
    from ibm_watsonx_ai import Credentials
    from ibm_watsonx_ai.foundation_models import ModelInference
    from ibm_watsonx_ai.metanames import GenTextParamsMetaNames as GenParams
    WATSONX_AVAILABLE = True
except ImportError:
    WATSONX_AVAILABLE = False
    logging.warning("ibm-watsonx-ai not installed. Using fallback demo mode.")

# ── Local modules ──────────────────────────────────────────────────
from modules.agent_instructions import (
    build_system_prompt,
    calculate_bmi,
    calculate_bmr,
    calculate_tdee,
    AGENT_NAME,
)

# ══════════════════════════════════════════════════════════════════
#  Flask App Initialization
# ══════════════════════════════════════════════════════════════════
app = Flask(__name__)
app.secret_key = os.getenv("FLASK_SECRET_KEY", "nutrimind_secret_key_change_in_prod")
CORS(app)

# ── Logging ────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

# ══════════════════════════════════════════════════════════════════
#  IBM Watsonx.ai Client Initialization
# ══════════════════════════════════════════════════════════════════
watsonx_model = None

def initialize_watsonx():
    """Initialize the IBM Watsonx.ai Granite model client."""
    global watsonx_model

    if not WATSONX_AVAILABLE:
        logger.warning("Watsonx SDK not available — running in demo mode.")
        return False

    api_key = os.getenv("IBM_API_KEY")
    project_id = os.getenv("WATSONX_PROJECT_ID")
    url = os.getenv("WATSONX_URL", "https://us-south.ml.cloud.ibm.com")
    model_id = os.getenv("WATSONX_MODEL_ID", "ibm/granite-3-3-8b-instruct")

    if not api_key or api_key == "your_ibm_cloud_api_key_here":
        logger.warning("IBM_API_KEY not configured — running in demo mode.")
        return False

    if not project_id or project_id == "your_watsonx_project_id_here":
        logger.warning("WATSONX_PROJECT_ID not configured — running in demo mode.")
        return False

    try:
        credentials = Credentials(url=url, api_key=api_key)
        watsonx_model = ModelInference(
            model_id=model_id,
            credentials=credentials,
            project_id=project_id,
            params={
                GenParams.MAX_NEW_TOKENS: int(os.getenv("MAX_TOKENS", 1500)),
                GenParams.TEMPERATURE: float(os.getenv("TEMPERATURE", 0.7)),
                GenParams.TOP_P: 0.9,
                GenParams.TOP_K: 50,
                GenParams.REPETITION_PENALTY: 1.1,
            },
        )
        logger.info(f"✅ Watsonx.ai initialized with model: {model_id}")
        return True
    except Exception as e:
        logger.error(f"❌ Watsonx initialization failed: {e}")
        return False


# Initialize on startup
watsonx_ready = initialize_watsonx()


# ══════════════════════════════════════════════════════════════════
#  Watsonx Chat Engine
# ══════════════════════════════════════════════════════════════════
def chat_with_watsonx(user_message: str, conversation_history: list, user_profile: dict) -> str:
    """
    Send a message to the Watsonx Granite model and return the response.
    Falls back to a helpful demo response if Watsonx is not configured.
    """
    global watsonx_model

    if not watsonx_model:
        return generate_demo_response(user_message, user_profile)

    try:
        system_prompt = build_system_prompt(user_profile)

        # Build conversation context (last 6 exchanges to stay within token limits)
        history_text = ""
        recent_history = conversation_history[-12:] if len(conversation_history) > 12 else conversation_history
        for msg in recent_history:
            role = "User" if msg["role"] == "user" else "NutriMind"
            history_text += f"\n{role}: {msg['content']}"

        # Construct the full prompt
        full_prompt = f"""<|system|>
{system_prompt}
<|user|>
{history_text}
User: {user_message}
<|assistant|>
NutriMind:"""

        response = watsonx_model.generate_text(prompt=full_prompt)

        if response:
            # Clean up the response
            clean_response = response.strip()
            if clean_response.startswith("NutriMind:"):
                clean_response = clean_response[len("NutriMind:"):].strip()
            return clean_response
        else:
            return "I'm sorry, I couldn't generate a response. Please try again."

    except Exception as e:
        logger.error(f"Watsonx chat error: {e}")
        return f"⚠️ I encountered an issue connecting to the AI service. Please check your configuration.\n\nError: {str(e)}"


def generate_demo_response(user_message: str, user_profile: dict) -> str:
    """
    Generate a helpful demo response when Watsonx is not configured.
    This shows what the real AI would respond with.
    """
    name = user_profile.get("name", "there")
    message_lower = user_message.lower()

    if any(word in message_lower for word in ["bmi", "weight", "height"]):
        return f"""👋 Hi {name}! I'm NutriMind in **demo mode** (configure your IBM API key for full AI responses).

**BMI Information:**
• BMI = Weight (kg) ÷ Height² (m)
• Normal range: 18.5 – 24.9
• For South Asians, health risks increase at BMI ≥ 23

Use the BMI Calculator tab above for a detailed analysis! 📊

*⚠️ Demo Mode: Add your IBM_API_KEY to .env for real AI-powered responses.*"""

    elif any(word in message_lower for word in ["meal", "plan", "diet", "food", "eat"]):
        return f"""🥗 **Sample Indian Nutrition Plan** (Demo Mode)

**Breakfast (7-9 AM):**
• 2 idlis + sambar + coconut chutney (~280 kcal)
• 1 glass warm milk or green tea

**Lunch (12-2 PM):**
• 2 rotis + 1 cup dal + 1 cup sabzi + curd (~450 kcal)
• Small bowl salad with cucumber & tomato

**Evening Snack (4-6 PM):**
• Handful of roasted chana + buttermilk (~150 kcal)

**Dinner (7-8 PM):**
• 1-2 rotis + light sabzi + soup (~350 kcal)

💡 **Tip:** Configure your IBM API key for a fully personalized meal plan based on your profile!

*⚠️ Demo Mode: Add your IBM_API_KEY to .env for real AI-powered responses.*"""

    elif any(word in message_lower for word in ["calorie", "calori", "kcal"]):
        return f"""🔥 **Common Indian Food Calories** (Demo Mode)

| Food Item | Calories |
|-----------|----------|
| 1 Roti (medium) | 70 kcal |
| 1 Cup cooked rice | 200 kcal |
| 1 Cup dal | 150 kcal |
| 1 Idli | 40 kcal |
| 1 Plain dosa | 120 kcal |
| 1 Cup paneer | 265 kcal |
| 1 Tbsp ghee | 112 kcal |
| 1 Medium banana | 89 kcal |

*⚠️ Demo Mode: Add your IBM_API_KEY to .env for real AI-powered calorie analysis.*"""

    else:
        return f"""👋 Namaste {name}! I'm **NutriMind**, your AI Nutrition Coach!

I'm currently running in **demo mode**. To unlock full AI-powered nutrition guidance:

1. Get your IBM Cloud API Key from [cloud.ibm.com](https://cloud.ibm.com)
2. Create a Watsonx.ai project and get the Project ID
3. Add both to your `.env` file
4. Restart the application

**What I can help you with (once configured):**
• 🥗 Personalized meal plans for Indian & global cuisine
• 🔥 Calorie analysis and macro tracking
• 📊 BMI calculation and health assessment
• 👨‍👩‍👧‍👦 Family nutrition planning
• 💪 Diet plans for weight loss/gain/muscle building
• 🩺 Diet support for diabetes, PCOS, heart health & more

Ask me anything about nutrition! 😊

*⚠️ Demo Mode Active — Configure IBM_API_KEY for full functionality.*"""


# ══════════════════════════════════════════════════════════════════
#  Routes — Pages
# ══════════════════════════════════════════════════════════════════
@app.route("/")
def index():
    """Main application page."""
    if "conversation" not in session:
        session["conversation"] = []
    if "user_profile" not in session:
        session["user_profile"] = {}
    if "family_members" not in session:
        session["family_members"] = []
    return render_template(
        "index.html",
        app_name=AGENT_NAME,
        watsonx_ready=watsonx_ready,
        current_year=datetime.now().year,
    )


# ══════════════════════════════════════════════════════════════════
#  Routes — API Endpoints
# ══════════════════════════════════════════════════════════════════
@app.route("/api/chat", methods=["POST"])
def chat():
    """Handle chat messages with the NutriMind AI agent."""
    try:
        data = request.get_json()
        if not data or "message" not in data:
            return jsonify({"error": "No message provided"}), 400

        user_message = data.get("message", "").strip()
        if not user_message:
            return jsonify({"error": "Empty message"}), 400

        if len(user_message) > 2000:
            return jsonify({"error": "Message too long (max 2000 characters)"}), 400

        # Get conversation history and user profile from session
        if "conversation" not in session:
            session["conversation"] = []
        if "user_profile" not in session:
            session["user_profile"] = {}

        user_profile = session.get("user_profile", {})
        conversation = session.get("conversation", [])

        # Add user message to history
        conversation.append({
            "role": "user",
            "content": user_message,
            "timestamp": datetime.now().isoformat(),
        })

        # Get AI response
        ai_response = chat_with_watsonx(user_message, conversation, user_profile)

        # Add AI response to history
        conversation.append({
            "role": "assistant",
            "content": ai_response,
            "timestamp": datetime.now().isoformat(),
        })

        # Keep conversation history manageable (last 50 messages)
        if len(conversation) > 50:
            conversation = conversation[-50:]

        session["conversation"] = conversation
        session.modified = True

        return jsonify({
            "response": ai_response,
            "timestamp": datetime.now().strftime("%I:%M %p"),
            "model": os.getenv("WATSONX_MODEL_ID", "ibm/granite-3-3-8b-instruct"),
            "demo_mode": not watsonx_ready,
        })

    except Exception as e:
        logger.error(f"Chat error: {e}")
        return jsonify({"error": "An error occurred. Please try again."}), 500


@app.route("/api/profile", methods=["POST"])
def save_profile():
    """Save or update the user's nutrition profile."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400

        # Validate and sanitize inputs
        profile = {
            "name": str(data.get("name", "User"))[:50],
            "age": int(data.get("age", 25)) if data.get("age") else 25,
            "gender": str(data.get("gender", ""))[:10],
            "weight": float(data.get("weight", 0)) if data.get("weight") else 0,
            "height": float(data.get("height", 0)) if data.get("height") else 0,
            "goal": str(data.get("goal", "General health"))[:100],
            "diet_type": str(data.get("diet_type", "No restriction"))[:50],
            "health_conditions": str(data.get("health_conditions", "None"))[:200],
            "activity_level": str(data.get("activity_level", "moderately_active"))[:30],
            "cuisine_preference": str(data.get("cuisine_preference", "Indian"))[:50],
        }

        # Calculate BMI and TDEE if weight/height provided
        if profile["weight"] > 0 and profile["height"] > 0:
            bmi_data = calculate_bmi(profile["weight"], profile["height"])
            bmr = calculate_bmr(profile["weight"], profile["height"],
                                profile["age"], profile["gender"])
            tdee = calculate_tdee(bmr, profile["activity_level"])
            profile["bmi"] = bmi_data["bmi"]
            profile["bmi_category"] = bmi_data["category"]
            profile["bmr"] = round(bmr)
            profile["tdee"] = tdee

        session["user_profile"] = profile
        session.modified = True

        return jsonify({
            "success": True,
            "profile": profile,
            "message": f"Profile saved for {profile['name']}! 🎉",
        })

    except (ValueError, TypeError) as e:
        return jsonify({"error": f"Invalid data: {str(e)}"}), 400
    except Exception as e:
        logger.error(f"Profile save error: {e}")
        return jsonify({"error": "Failed to save profile"}), 500


@app.route("/api/profile", methods=["GET"])
def get_profile():
    """Get the current user profile."""
    return jsonify(session.get("user_profile", {}))


@app.route("/api/bmi", methods=["POST"])
def calculate_bmi_api():
    """Calculate BMI and return detailed results."""
    try:
        data = request.get_json()
        weight = float(data.get("weight", 0))
        height = float(data.get("height", 0))
        age = int(data.get("age", 25))
        gender = str(data.get("gender", "male"))
        activity_level = str(data.get("activity_level", "moderately_active"))

        if weight <= 0 or height <= 0:
            return jsonify({"error": "Invalid weight or height"}), 400
        if weight > 500 or height > 300:
            return jsonify({"error": "Please enter realistic values"}), 400

        bmi_data = calculate_bmi(weight, height)
        bmr = calculate_bmr(weight, height, age, gender)
        tdee = calculate_tdee(bmr, activity_level)

        # Calculate goal-based calorie targets
        calorie_targets = {
            "weight_loss": round(tdee - 500),       # ~0.5 kg/week loss
            "weight_loss_fast": round(tdee - 750),  # ~0.75 kg/week loss
            "maintenance": tdee,
            "weight_gain": round(tdee + 300),       # Lean bulk
            "weight_gain_fast": round(tdee + 500),  # Standard bulk
        }

        # Macro recommendations (maintenance)
        macros = {
            "protein_g": round(weight * 1.6),       # 1.6g per kg body weight
            "carbs_g": round((tdee * 0.45) / 4),    # 45% calories from carbs
            "fat_g": round((tdee * 0.30) / 9),      # 30% calories from fat
        }

        return jsonify({
            "bmi": bmi_data["bmi"],
            "category": bmi_data["category"],
            "color": bmi_data["color"],
            "advice": bmi_data["advice"],
            "asian_category": bmi_data.get("asian_category"),
            "bmr": round(bmr),
            "tdee": tdee,
            "calorie_targets": calorie_targets,
            "macros": macros,
            "weight": weight,
            "height": height,
        })

    except (ValueError, TypeError) as e:
        return jsonify({"error": f"Invalid input: {str(e)}"}), 400
    except Exception as e:
        logger.error(f"BMI calculation error: {e}")
        return jsonify({"error": "Calculation failed"}), 500


@app.route("/api/family", methods=["GET"])
def get_family():
    """Get all family members."""
    return jsonify(session.get("family_members", []))


@app.route("/api/family", methods=["POST"])
def add_family_member():
    """Add a new family member profile."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400

        if "family_members" not in session:
            session["family_members"] = []

        family_members = session["family_members"]

        # Limit family size
        if len(family_members) >= 10:
            return jsonify({"error": "Maximum 10 family members allowed"}), 400

        member = {
            "id": datetime.now().timestamp(),
            "name": str(data.get("name", "Member"))[:50],
            "age": int(data.get("age", 25)) if data.get("age") else 25,
            "gender": str(data.get("gender", ""))[:10],
            "weight": float(data.get("weight", 0)) if data.get("weight") else 0,
            "height": float(data.get("height", 0)) if data.get("height") else 0,
            "goal": str(data.get("goal", "General health"))[:100],
            "diet_type": str(data.get("diet_type", "No restriction"))[:50],
            "health_conditions": str(data.get("health_conditions", "None"))[:200],
            "activity_level": str(data.get("activity_level", "moderately_active"))[:30],
            "relationship": str(data.get("relationship", "Family Member"))[:30],
            "added_at": datetime.now().isoformat(),
        }

        # Calculate BMI for member if data available
        if member["weight"] > 0 and member["height"] > 0:
            bmi_data = calculate_bmi(member["weight"], member["height"])
            member["bmi"] = bmi_data["bmi"]
            member["bmi_category"] = bmi_data["category"]

        family_members.append(member)
        session["family_members"] = family_members
        session.modified = True

        return jsonify({
            "success": True,
            "member": member,
            "total_members": len(family_members),
            "message": f"Added {member['name']} to family profile! 👨‍👩‍👧‍👦",
        })

    except Exception as e:
        logger.error(f"Add family member error: {e}")
        return jsonify({"error": "Failed to add family member"}), 500


@app.route("/api/family/<int:member_id>", methods=["DELETE"])
def remove_family_member(member_id):
    """Remove a family member by index."""
    try:
        if "family_members" not in session:
            return jsonify({"error": "No family members found"}), 404

        family_members = session["family_members"]
        if member_id < 0 or member_id >= len(family_members):
            return jsonify({"error": "Member not found"}), 404

        removed = family_members.pop(member_id)
        session["family_members"] = family_members
        session.modified = True

        return jsonify({
            "success": True,
            "message": f"Removed {removed['name']} from family profile",
        })

    except Exception as e:
        logger.error(f"Remove family member error: {e}")
        return jsonify({"error": "Failed to remove member"}), 500


@app.route("/api/meal-plan", methods=["POST"])
def generate_meal_plan():
    """Generate a quick meal plan based on profile."""
    try:
        data = request.get_json()
        profile = session.get("user_profile", {})
        
        # Override with request data if provided
        goal = data.get("goal", profile.get("goal", "weight_loss"))
        diet_type = data.get("diet_type", profile.get("diet_type", "vegetarian"))
        calories = data.get("calories", profile.get("tdee", 1800))
        days = min(int(data.get("days", 7)), 7)

        # Build a targeted prompt for meal plan generation
        meal_prompt = f"""Generate a {days}-day Indian meal plan for:
Goal: {goal}
Diet type: {diet_type}
Daily calories: {calories} kcal
Format: Day-wise with Breakfast, Lunch, Snack, Dinner with calorie counts.
Include variety and use common Indian ingredients."""

        meal_plan_response = chat_with_watsonx(
            meal_prompt,
            [],
            profile
        )

        return jsonify({
            "success": True,
            "meal_plan": meal_plan_response,
            "days": days,
            "goal": goal,
            "calories": calories,
        })

    except Exception as e:
        logger.error(f"Meal plan error: {e}")
        return jsonify({"error": "Failed to generate meal plan"}), 500


@app.route("/api/status", methods=["GET"])
def status():
    """Application status endpoint."""
    return jsonify({
        "app": AGENT_NAME,
        "version": os.getenv("APP_VERSION", "1.0.0"),
        "watsonx_ready": watsonx_ready,
        "model": os.getenv("WATSONX_MODEL_ID", "ibm/granite-3-3-8b-instruct"),
        "demo_mode": not watsonx_ready,
        "timestamp": datetime.now().isoformat(),
    })


@app.route("/api/clear-chat", methods=["POST"])
def clear_chat():
    """Clear conversation history."""
    session["conversation"] = []
    session.modified = True
    return jsonify({"success": True, "message": "Chat cleared"})


# ══════════════════════════════════════════════════════════════════
#  Error Handlers
# ══════════════════════════════════════════════════════════════════
@app.errorhandler(404)
def not_found(e):
    return jsonify({"error": "Endpoint not found"}), 404


@app.errorhandler(500)
def server_error(e):
    return jsonify({"error": "Internal server error"}), 500


# ══════════════════════════════════════════════════════════════════
#  Application Entry Point
# ══════════════════════════════════════════════════════════════════
if __name__ == "__main__":
    host = os.getenv("FLASK_HOST", "0.0.0.0")
    port = int(os.getenv("FLASK_PORT", 5000))
    debug = os.getenv("FLASK_DEBUG", "True").lower() == "true"

    logger.info(f"🌿 Starting {AGENT_NAME} on http://{host}:{port}")
    logger.info(f"   Watsonx.ai: {'✅ Connected' if watsonx_ready else '⚠️  Demo mode (configure .env)'}")
    logger.info(f"   Model: {os.getenv('WATSONX_MODEL_ID', 'ibm/granite-3-3-8b-instruct')}")

    app.run(host=host, port=port, debug=debug)
