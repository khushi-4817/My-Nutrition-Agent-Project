# 🌿 NutriMind — AI-Powered Nutrition Agent

> **AI-Powered Nutrition Coach** built with Python Flask + IBM Watsonx.ai (Granite models)

[![Python](https://img.shields.io/badge/Python-3.10+-blue.svg)](https://python.org)
[![Flask](https://img.shields.io/badge/Flask-3.0.3-green.svg)](https://flask.palletsprojects.com)
[![IBM Watsonx](https://img.shields.io/badge/IBM-Watsonx.ai-1192E8.svg)](https://www.ibm.com/watsonx)
[![Bootstrap](https://img.shields.io/badge/Bootstrap-5.3-purple.svg)](https://getbootstrap.com)

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🤖 **AI Chat** | Real-time nutrition advice powered by IBM Granite models |
| 📊 **Nutrition Dashboard** | Macro distribution, calorie targets, food reference tables |
| 🗓️ **Meal Planner** | AI-generated personalized meal plans (1–7 days) |
| ⚖️ **BMI Calculator** | BMI, BMR, TDEE, macro breakdown with Asian guidelines |
| 👨‍👩‍👧‍👦 **Family Profiles** | Multi-member nutrition tracking with individual plans |
| 🇮🇳 **Indian Food Focus** | Deep knowledge of regional Indian cuisine and superfoods |
| 🌙 **Dark Mode** | Full light/dark theme with system preference detection |
| 📱 **Responsive Design** | Works on mobile, tablet, and desktop |
| 🔧 **Customizable Agent** | Edit `modules/agent_instructions.py` to change behavior |

---

## 🏗️ Project Structure

```
NutriMind/
├── app.py                          # Flask backend + API routes
├── requirements.txt                # Python dependencies
├── .env                            # Environment variables (your secrets)
├── .env.example                    # Template for .env (safe to commit)
├── .gitignore                      # Git ignore file
│
├── modules/
│   ├── __init__.py
│   └── agent_instructions.py       # ← CUSTOMIZE THE AGENT HERE
│
├── templates/
│   └── index.html                  # Main HTML page (all tabs)
│
└── static/
    ├── css/
    │   └── style.css               # Full stylesheet with dark mode
    └── js/
        └── app.js                  # Frontend JavaScript
```

---

## 🚀 Quick Start

### Prerequisites
- Python 3.10 or higher
- IBM Cloud account (free tier available)
- IBM Watsonx.ai project

### Step 1 — Clone / Download

```bash
cd NutriMind
```

### Step 2 — Create Virtual Environment

```bash
# Windows
python -m venv venv
venv\Scripts\activate

# macOS / Linux
python3 -m venv venv
source venv/bin/activate
```

### Step 3 — Install Dependencies

```bash
pip install -r requirements.txt
```

### Step 4 — Configure IBM Credentials

1. Go to [IBM Cloud IAM](https://cloud.ibm.com/iam/apikeys) → Create an API key
2. Go to [IBM Watsonx.ai](https://dataplatform.cloud.ibm.com/projects/) → Create a project → Copy the Project ID
3. Edit your `.env` file:

```env
IBM_API_KEY=your_actual_ibm_cloud_api_key
WATSONX_PROJECT_ID=your_actual_project_id
WATSONX_URL=https://us-south.ml.cloud.ibm.com
FLASK_SECRET_KEY=your_random_32_char_secret_string
```

> ⚠️ **Never commit the real `.env` file to version control!**

### Step 5 — Run the Application

```bash
python app.py
```

Open your browser at: **http://localhost:5000**

---

## 🔧 Customizing the Agent

Edit [`modules/agent_instructions.py`](modules/agent_instructions.py) to customize:

### Section 1 — Agent Persona & Tone
```python
AGENT_PERSONA = """
You are NutriMind... change the tone, name, or personality here.
"""
```

### Section 2 — Diet Specializations
```python
DIET_SPECIALIZATIONS = [
    "Weight Management",
    "Add your own specialization here",
    ...
]
```

### Section 3 — Indian Food Knowledge
```python
INDIAN_FOOD_KNOWLEDGE = """
Add regional cuisines, local superfoods, seasonal foods, etc.
"""
```

### Section 4 — Safety Rules
```python
SAFETY_RULES = """
Modify safety guidelines, medical disclaimers, and restrictions.
"""
```

### Section 5 — Response Format
```python
RESPONSE_FORMAT = """
Change how the AI structures its responses — format, length, style.
"""
```

### Section 6 — Family Nutrition Rules
```python
FAMILY_NUTRITION_RULES = """
Modify rules for different age groups, pregnancy, elderly, etc.
"""
```

---

## 🌐 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET`  | `/` | Main application page |
| `POST` | `/api/chat` | Send message to AI agent |
| `POST` | `/api/profile` | Save user nutrition profile |
| `GET`  | `/api/profile` | Get current profile |
| `POST` | `/api/bmi` | Calculate BMI, BMR, TDEE |
| `GET`  | `/api/family` | Get all family members |
| `POST` | `/api/family` | Add family member |
| `DELETE` | `/api/family/<id>` | Remove family member |
| `POST` | `/api/meal-plan` | Generate AI meal plan |
| `POST` | `/api/clear-chat` | Clear conversation history |
| `GET`  | `/api/status` | App health check |

### Example: Chat API

```bash
curl -X POST http://localhost:5000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Create a 1200 calorie South Indian vegetarian meal plan"}'
```

### Example: BMI API

```bash
curl -X POST http://localhost:5000/api/bmi \
  -H "Content-Type: application/json" \
  -d '{"weight": 70, "height": 170, "age": 28, "gender": "female", "activity_level": "moderately_active"}'
```

---

## 🐳 Docker Deployment

### Create Dockerfile

```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 5000
CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:5000", "--timeout", "120", "app:app"]
```

### Build and Run

```bash
docker build -t nutrimind .
docker run -p 5000:5000 --env-file .env nutrimind
```

---

## ☁️ IBM Cloud Deployment (Code Engine)

```bash
# Install IBM Cloud CLI
# https://cloud.ibm.com/docs/cli

# Login
ibmcloud login --sso

# Target Code Engine project
ibmcloud ce project create --name nutrimind-project
ibmcloud ce project select --name nutrimind-project

# Deploy (build from local source)
ibmcloud ce app create \
  --name nutrimind \
  --src . \
  --str buildpacks \
  --port 5000 \
  --env IBM_API_KEY=your_key \
  --env WATSONX_PROJECT_ID=your_project_id \
  --env FLASK_SECRET_KEY=your_secret
```

---

## 🌐 Heroku Deployment

Create `Procfile`:
```
web: gunicorn -w 2 -b 0.0.0.0:$PORT --timeout 120 app:app
```

```bash
heroku create nutrimind-app
heroku config:set IBM_API_KEY=your_key
heroku config:set WATSONX_PROJECT_ID=your_id
heroku config:set FLASK_SECRET_KEY=your_secret
git push heroku main
```

---

## 🔐 Security Notes

1. **Never commit `.env`** — it's in `.gitignore`
2. **Rotate API keys** regularly at [IBM Cloud IAM](https://cloud.ibm.com/iam/apikeys)
3. **Set a strong `FLASK_SECRET_KEY`** — use `python -c "import secrets; print(secrets.token_hex(32))"`
4. In production, set `FLASK_DEBUG=False`
5. Consider adding rate limiting for public deployments

---

## 🧠 IBM Granite Model Options

Change `WATSONX_MODEL_ID` in `.env` to use a different model:

| Model ID | Description |
|----------|-------------|
| `ibm/granite-3-3-8b-instruct` | **Recommended** — Best balance of speed and quality |
| `ibm/granite-3-8b-instruct` | Stable, reliable instruction following |
| `ibm/granite-13b-instruct-v2` | Higher capacity for complex plans |
| `ibm/granite-3-2b-instruct` | Faster, lightweight responses |

---

## 📋 Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `IBM_API_KEY` | ✅ Yes | — | IBM Cloud API key |
| `WATSONX_PROJECT_ID` | ✅ Yes | — | Watsonx.ai project ID |
| `WATSONX_URL` | No | `https://us-south.ml.cloud.ibm.com` | API endpoint |
| `WATSONX_MODEL_ID` | No | `ibm/granite-3-3-8b-instruct` | Granite model |
| `FLASK_SECRET_KEY` | ✅ Yes | — | Flask session encryption key |
| `FLASK_DEBUG` | No | `True` | Debug mode (set `False` in prod) |
| `FLASK_HOST` | No | `0.0.0.0` | Bind host |
| `FLASK_PORT` | No | `5000` | Bind port |
| `MAX_TOKENS` | No | `1500` | Max response tokens |
| `TEMPERATURE` | No | `0.7` | Model creativity (0.0–1.0) |

---

## 🐛 Troubleshooting

### "Demo Mode" badge shown
→ Configure `IBM_API_KEY` and `WATSONX_PROJECT_ID` in `.env`

### `ModuleNotFoundError: ibm_watsonx_ai`
```bash
pip install ibm-watsonx-ai==1.1.2
```

### `401 Unauthorized` from Watsonx
→ Check your `IBM_API_KEY` is valid and not expired

### `404 Project not found`
→ Check `WATSONX_PROJECT_ID` matches your project in the correct region

### Slow responses
→ Reduce `MAX_TOKENS` in `.env` or switch to `granite-3-2b-instruct`

---

## 📄 License

MIT License — feel free to use, modify, and distribute.

---

## 🙏 Acknowledgments

- **IBM Watsonx.ai** — Enterprise AI platform
- **IBM Granite** — Open-source foundation models
- **Bootstrap 5** — Responsive UI framework
- **Flask** — Lightweight Python web framework

---

<div align="center">
  <strong>Made with ❤️ and 🥗 by NutriMind</strong><br>
  <em>Powered by IBM Watsonx Granite AI</em>
</div>
