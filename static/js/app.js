/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║           NutriMind — Frontend JavaScript                    ║
 * ║  Tab navigation, chat, BMI calculator, meal planner,        ║
 * ║  family profiles, dark mode, and profile management.        ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

"use strict";

// ════════════════════════════════════════════════════════════════
//  GLOBAL STATE
// ════════════════════════════════════════════════════════════════
const State = {
  currentTab: "chat",
  selectedDays: 1,
  isTyping: false,
  darkMode: false,
  familyMembers: [],
  profile: {},
  bmiResults: null,
  mealPlanText: "",
};

// ════════════════════════════════════════════════════════════════
//  NUTRITION TIPS (displayed in sidebar)
// ════════════════════════════════════════════════════════════════
const NUTRITION_TIPS = [
  { icon: "bi-droplet-fill", text: "Drink 8-10 glasses of water daily. Warm water in the morning helps digestion." },
  { icon: "bi-clock",        text: "Eat every 3-4 hours to maintain steady blood sugar and energy levels." },
  { icon: "bi-flower1",      text: "Turmeric (haldi) + black pepper together boost anti-inflammatory absorption 20x." },
  { icon: "bi-moon-stars",   text: "Try to finish dinner 2-3 hours before bedtime for better metabolism." },
  { icon: "bi-egg-fried",    text: "Add protein to every meal — it keeps you full and protects muscle mass." },
  { icon: "bi-basket2",      text: "Eat a rainbow of vegetables daily for diverse micronutrients and antioxidants." },
  { icon: "bi-heart",        text: "Amla (Indian gooseberry) has 20x more Vitamin C than an orange!" },
  { icon: "bi-lightning",    text: "Soaked almonds and walnuts are easier to digest and more nutritious." },
  { icon: "bi-sun",          text: "Ragi (finger millet) is one of the best calcium sources for vegetarians." },
  { icon: "bi-fire",         text: "Cooking in cast iron adds beneficial iron to your food naturally." },
  { icon: "bi-leaf",         text: "Curry leaves are rich in iron and work great with buttermilk for hair health." },
  { icon: "bi-award",        text: "Sattu (roasted gram flour) is an excellent high-protein, low-cost superfood." },
];

// ════════════════════════════════════════════════════════════════
//  INITIALIZATION
// ════════════════════════════════════════════════════════════════
document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  initChatInput();
  loadNutritionTips();
  loadProfileFromServer();
  checkAppStatus();

  // Show hero section briefly, then scroll hint
  setTimeout(() => {
    const heroSection = document.getElementById("heroSection");
    if (heroSection) heroSection.style.display = "block";
  }, 100);
});

// ════════════════════════════════════════════════════════════════
//  TAB NAVIGATION
// ════════════════════════════════════════════════════════════════
function showTab(tabName) {
  // Hide all tabs
  document.querySelectorAll(".tab-content").forEach(el => el.classList.remove("active"));
  document.querySelectorAll(".tab-btn").forEach(el => el.classList.remove("active"));

  // Show target tab
  const tab = document.getElementById(`tab-${tabName}`);
  if (tab) tab.classList.add("active");

  // Activate tab button
  document.querySelectorAll(`.tab-btn[data-tab="${tabName}"]`).forEach(btn => btn.classList.add("active"));

  State.currentTab = tabName;

  // Tab-specific initialization
  if (tabName === "dashboard") updateDashboard();
  if (tabName === "family") refreshFamilyList();
  if (tabName === "profile") loadProfileFields();

  // Update navbar active link
  document.querySelectorAll(".nutri-navbar .nav-link").forEach(link => {
    link.classList.remove("active");
    if (link.getAttribute("onclick")?.includes(tabName)) link.classList.add("active");
  });
}

function scrollToApp() {
  const appContainer = document.getElementById("appContainer");
  if (appContainer) {
    appContainer.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

// ════════════════════════════════════════════════════════════════
//  DARK MODE
// ════════════════════════════════════════════════════════════════
function initTheme() {
  const saved = localStorage.getItem("nutrimind_theme");
  if (saved === "dark") {
    applyTheme("dark");
  } else {
    applyTheme("light");
  }
}

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  State.darkMode = theme === "dark";
  const icon = document.getElementById("themeIcon");
  if (icon) {
    icon.className = theme === "dark" ? "bi bi-sun-fill" : "bi bi-moon-fill";
  }
  localStorage.setItem("nutrimind_theme", theme);
}

function toggleTheme() {
  applyTheme(State.darkMode ? "light" : "dark");
}

document.getElementById("themeToggle")?.addEventListener("click", toggleTheme);

// ════════════════════════════════════════════════════════════════
//  APP STATUS CHECK
// ════════════════════════════════════════════════════════════════
async function checkAppStatus() {
  try {
    const res = await fetch("/api/status");
    const data = await res.json();
    updateStatusBadge(data.watsonx_ready, data.model);
  } catch {
    updateStatusBadge(false);
  }
}

function updateStatusBadge(isReady, modelName) {
  const badge = document.getElementById("statusBadge");
  const text = badge?.querySelector(".status-text");
  if (!badge || !text) return;

  badge.className = `status-badge ${isReady ? "status-connected" : "status-demo"}`;
  text.textContent = isReady
    ? `Granite AI`
    : "Demo Mode";

  const subtitle = document.getElementById("chatSubtitle");
  if (subtitle) {
    subtitle.textContent = isReady
      ? `Connected to ${modelName || "IBM Granite"}`
      : "Demo mode — configure IBM_API_KEY for full AI";
  }
}

// ════════════════════════════════════════════════════════════════
//  NUTRITION TIPS
// ════════════════════════════════════════════════════════════════
function loadNutritionTips() {
  const container = document.getElementById("nutritionTips");
  if (!container) return;

  // Pick 4 random tips
  const shuffled = [...NUTRITION_TIPS].sort(() => 0.5 - Math.random()).slice(0, 4);
  container.innerHTML = shuffled.map((t, i) => `
    <div class="tip-item" style="animation-delay:${i * 0.08}s">
      <i class="bi ${t.icon}"></i>
      <span>${t.text}</span>
    </div>
  `).join("");
}

// ════════════════════════════════════════════════════════════════
//  CHAT SYSTEM
// ════════════════════════════════════════════════════════════════
function initChatInput() {
  const textarea = document.getElementById("chatInput");
  const charCount = document.getElementById("charCount");
  if (!textarea) return;

  textarea.addEventListener("input", () => {
    // Auto-resize
    textarea.style.height = "auto";
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + "px";

    // Character count
    const len = textarea.value.length;
    if (charCount) charCount.textContent = `${len}/2000`;
  });

  textarea.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
}

async function sendMessage() {
  if (State.isTyping) return;

  const textarea = document.getElementById("chatInput");
  const message = textarea?.value.trim();
  if (!message) return;

  // Clear input
  textarea.value = "";
  textarea.style.height = "auto";
  document.getElementById("charCount").textContent = "0/2000";

  // Hide suggestions after first message
  const suggestions = document.getElementById("quickSuggestions");
  if (suggestions) suggestions.style.display = "none";

  // Add user message
  appendMessage("user", message);

  // Show typing indicator
  showTypingIndicator();

  // Disable send button
  const sendBtn = document.getElementById("sendBtn");
  if (sendBtn) sendBtn.disabled = true;
  State.isTyping = true;

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });

    const data = await res.json();
    removeTypingIndicator();

    if (data.error) {
      appendMessage("bot", `⚠️ Error: ${data.error}`);
    } else {
      appendMessage("bot", data.response, data.timestamp);
    }
  } catch (err) {
    removeTypingIndicator();
    appendMessage("bot", "⚠️ Connection error. Please check your network and try again.");
  } finally {
    if (sendBtn) sendBtn.disabled = false;
    State.isTyping = false;
  }
}

function sendSuggestion(btn) {
  const text = btn.textContent.trim().replace(/^[^\w\s]+\s/, ""); // Remove leading emoji
  const textarea = document.getElementById("chatInput");
  if (textarea) {
    textarea.value = btn.textContent.trim();
    sendMessage();
  }
}

function appendMessage(role, content, time) {
  const container = document.getElementById("chatMessages");
  if (!container) return;

  const isBot = role === "bot" || role === "assistant";
  const timeStr = time || new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  const profileName = State.profile?.name || "You";
  const initials = profileName.slice(0, 1).toUpperCase();

  // Format content (basic markdown-like)
  const formattedContent = formatMessageContent(content);

  const msgEl = document.createElement("div");
  msgEl.className = `message ${isBot ? "bot-message" : "user-message"}`;
  msgEl.innerHTML = `
    <div class="message-avatar ${isBot ? "bot-avatar" : "user-avatar"}">
      ${isBot ? '<i class="bi bi-flower1"></i>' : initials}
    </div>
    <div class="message-bubble">
      <div class="message-content">${formattedContent}</div>
      <div class="message-time">${timeStr}</div>
    </div>
  `;

  container.appendChild(msgEl);
  container.scrollTop = container.scrollHeight;
}

function formatMessageContent(text) {
  if (!text) return "";

  return text
    // Bold: **text**
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    // Italic: *text*
    .replace(/\*([^*\n]+)\*/g, "<em>$1</em>")
    // Headers: ## text
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    // Bullet lists: - item or • item
    .replace(/^[-•]\s+(.+)$/gm, "<li>$1</li>")
    // Wrap consecutive li tags in ul
    .replace(/(<li>.*<\/li>\n?)+/gs, (m) => `<ul>${m}</ul>`)
    // Numbered lists: 1. item
    .replace(/^\d+\.\s+(.+)$/gm, "<li>$1</li>")
    // Horizontal rule: ---
    .replace(/^---+$/gm, "<hr>")
    // Line breaks
    .replace(/\n{2,}/g, "</p><p>")
    .replace(/\n/g, "<br>")
    // Wrap in paragraph
    .replace(/^(?!<[hup]|<li|<hr)(.+)$/, "<p>$1</p>");
}

function showTypingIndicator() {
  const container = document.getElementById("chatMessages");
  if (!container) return;

  const el = document.createElement("div");
  el.className = "message bot-message typing-indicator";
  el.id = "typingIndicator";
  el.innerHTML = `
    <div class="message-avatar bot-avatar"><i class="bi bi-flower1"></i></div>
    <div class="message-bubble">
      <div class="message-content">
        <div class="typing-dots">
          <span></span><span></span><span></span>
        </div>
      </div>
    </div>
  `;
  container.appendChild(el);
  container.scrollTop = container.scrollHeight;
}

function removeTypingIndicator() {
  document.getElementById("typingIndicator")?.remove();
}

async function clearChat() {
  if (!confirm("Clear conversation history?")) return;
  try {
    await fetch("/api/clear-chat", { method: "POST" });
  } catch {}

  const container = document.getElementById("chatMessages");
  if (!container) return;

  container.innerHTML = `
    <div class="message bot-message">
      <div class="message-avatar bot-avatar"><i class="bi bi-flower1"></i></div>
      <div class="message-bubble">
        <div class="message-content">
          <p>🌿 Chat cleared! How can I help you with your nutrition today?</p>
        </div>
        <div class="message-time">Just now</div>
      </div>
    </div>
  `;

  // Show suggestions again
  const suggestions = document.getElementById("quickSuggestions");
  if (suggestions) suggestions.style.display = "";

  showToast("Chat cleared", "success");
}

// ════════════════════════════════════════════════════════════════
//  BMI CALCULATOR
// ════════════════════════════════════════════════════════════════
async function calculateBMI() {
  const weight    = parseFloat(document.getElementById("bmiWeight")?.value);
  const height    = parseFloat(document.getElementById("bmiHeight")?.value);
  const age       = parseInt(document.getElementById("bmiAge")?.value) || 25;
  const gender    = document.getElementById("bmiGender")?.value || "male";
  const activity  = document.getElementById("bmiActivity")?.value || "moderately_active";

  if (!weight || !height || weight <= 0 || height <= 0) {
    showToast("Please enter valid weight and height", "warning");
    return;
  }

  showLoading("Calculating your BMI & calorie needs...");

  try {
    const res = await fetch("/api/bmi", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weight, height, age, gender, activity_level: activity }),
    });

    const data = await res.json();
    hideLoading();

    if (data.error) {
      showToast(data.error, "danger");
      return;
    }

    State.bmiResults = data;
    renderBMIResults(data);

  } catch (err) {
    hideLoading();
    showToast("Calculation failed. Please try again.", "danger");
  }
}

function renderBMIResults(data) {
  // Show results, hide empty state
  document.getElementById("bmiResults").style.display = "block";
  document.getElementById("bmiEmptyState").style.display = "none";

  // BMI Circle
  const bmiCircle = document.getElementById("bmiCircle");
  document.getElementById("bmiValue").textContent = data.bmi;
  document.getElementById("bmiCategory").textContent = data.category;
  document.getElementById("bmiAdvice").textContent = data.advice;

  // Color the circle based on category
  const colorMap = {
    "Underweight": "#0ea5e9",
    "Normal Weight": "#16a34a",
    "Overweight": "#f59e0b",
    "Obese Class I": "#ef4444",
    "Obese Class II": "#dc2626",
    "Obese Class III": "#991b1b",
  };
  const color = colorMap[data.category] || "#16a34a";
  if (bmiCircle) bmiCircle.style.borderColor = color;
  document.getElementById("bmiCategory").style.color = color;

  // Asian note
  const asianNote = document.getElementById("asianNote");
  if (data.asian_category && asianNote) {
    asianNote.style.display = "block";
    asianNote.textContent = `ℹ️ ${data.asian_category} (WHO Asian-Pacific guidelines)`;
  }

  // BMR and TDEE
  document.getElementById("resBMR").textContent = `${data.bmr.toLocaleString()} kcal`;
  document.getElementById("resTDEE").textContent = `${data.tdee.toLocaleString()} kcal`;

  // Goal Targets
  const targets = data.calorie_targets;
  const goalContainer = document.getElementById("goalTargets");
  if (goalContainer) {
    goalContainer.innerHTML = `
      <div class="goal-target-item">
        <span class="goal-name">🎯 Weight Loss (−0.5kg/wk)</span>
        <span class="goal-kcal">${targets.weight_loss.toLocaleString()} kcal</span>
        <span class="goal-badge">−500/day</span>
      </div>
      <div class="goal-target-item">
        <span class="goal-name">⚡ Faster Loss (−0.75kg/wk)</span>
        <span class="goal-kcal">${targets.weight_loss_fast.toLocaleString()} kcal</span>
        <span class="goal-badge">−750/day</span>
      </div>
      <div class="goal-target-item">
        <span class="goal-name">⚖️ Maintenance</span>
        <span class="goal-kcal">${targets.maintenance.toLocaleString()} kcal</span>
        <span class="goal-badge">Current</span>
      </div>
      <div class="goal-target-item">
        <span class="goal-name">📈 Lean Gain</span>
        <span class="goal-kcal">${targets.weight_gain.toLocaleString()} kcal</span>
        <span class="goal-badge">+300/day</span>
      </div>
      <div class="goal-target-item">
        <span class="goal-name">💪 Muscle Bulk</span>
        <span class="goal-kcal">${targets.weight_gain_fast.toLocaleString()} kcal</span>
        <span class="goal-badge">+500/day</span>
      </div>
    `;
  }

  // Macro Breakdown
  const macros = data.macros;
  const macroContainer = document.getElementById("macroBreakdown");
  if (macroContainer) {
    const totalGrams = macros.protein_g + macros.carbs_g + macros.fat_g;
    const pct = (g) => Math.round((g / totalGrams) * 100);

    macroContainer.innerHTML = `
      <div class="macro-bar-row">
        <div class="macro-bar-label">
          <span class="m-name">🥩 Protein</span>
          <span class="m-val">${macros.protein_g}g · ${pct(macros.protein_g)}%</span>
        </div>
        <div class="macro-bar-track">
          <div class="macro-bar-fill fill-protein" style="width:${pct(macros.protein_g)}%"></div>
        </div>
      </div>
      <div class="macro-bar-row">
        <div class="macro-bar-label">
          <span class="m-name">🍚 Carbohydrates</span>
          <span class="m-val">${macros.carbs_g}g · ${pct(macros.carbs_g)}%</span>
        </div>
        <div class="macro-bar-track">
          <div class="macro-bar-fill fill-carbs" style="width:${pct(macros.carbs_g)}%"></div>
        </div>
      </div>
      <div class="macro-bar-row">
        <div class="macro-bar-label">
          <span class="m-name">🥑 Healthy Fats</span>
          <span class="m-val">${macros.fat_g}g · ${pct(macros.fat_g)}%</span>
        </div>
        <div class="macro-bar-track">
          <div class="macro-bar-fill fill-fat" style="width:${pct(macros.fat_g)}%"></div>
        </div>
      </div>
    `;
  }

  // Animate BMI value counter
  animateCounter("bmiValue", 0, data.bmi, 800, 1);
}

// ════════════════════════════════════════════════════════════════
//  MEAL PLAN GENERATOR
// ════════════════════════════════════════════════════════════════
function selectDays(btn) {
  document.querySelectorAll(".day-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  State.selectedDays = parseInt(btn.dataset.days);
}

async function generateMealPlan() {
  const goal      = document.getElementById("mpGoal")?.value;
  const dietType  = document.getElementById("mpDietType")?.value;
  const calories  = parseInt(document.getElementById("mpCalories")?.value) || 1800;
  const notes     = document.getElementById("mpNotes")?.value || "";

  showLoading(`Generating ${State.selectedDays}-day meal plan...`);

  try {
    const res = await fetch("/api/meal-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        goal, diet_type: dietType, calories,
        days: State.selectedDays, notes,
      }),
    });

    const data = await res.json();
    hideLoading();

    if (data.error) {
      showToast(data.error, "danger");
      return;
    }

    State.mealPlanText = data.meal_plan;
    renderMealPlan(data.meal_plan, goal, calories);

  } catch (err) {
    hideLoading();
    showToast("Failed to generate meal plan. Please try again.", "danger");
  }
}

function renderMealPlan(text, goal, calories) {
  const container = document.getElementById("mealPlanContent");
  if (!container) return;

  // Format the meal plan text
  let formatted = text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/^### (.+)$/gm, "<h5 class='mt-3 mb-1'>$1</h5>")
    .replace(/^## (.+)$/gm, "<h4 class='mt-3 mb-2' style='color:var(--brand-primary)'>$1</h4>")
    .replace(/^# (.+)$/gm, "<h3 class='mt-3 mb-2'>$1</h3>")
    .replace(/^[-•]\s+(.+)$/gm, "<li>$1</li>")
    .replace(/(<li>.*<\/li>\n?)+/gs, (m) => `<ul class="mb-2">${m}</ul>`)
    .replace(/^(?!<[hul])(.+)$/gm, "<p class='mb-1'>$1</p>")
    .replace(/\n{2,}/g, "<br>");

  container.innerHTML = `
    <div class="meal-plan-meta mb-3 d-flex gap-2 flex-wrap">
      <span class="chip"><i class="bi bi-bullseye me-1 text-success"></i>${goal}</span>
      <span class="chip"><i class="bi bi-fire me-1 text-warning"></i>${calories} kcal/day</span>
      <span class="chip"><i class="bi bi-calendar me-1 text-brand"></i>${State.selectedDays} Day${State.selectedDays > 1 ? "s" : ""}</span>
    </div>
    <div class="formatted-meal-plan">${formatted}</div>
  `;

  // Show action buttons
  document.getElementById("copyMealPlanBtn").style.display = "";
  document.getElementById("chatMealPlanBtn").style.display = "";

  showToast("Meal plan generated! 🥗", "success");
}

function copyMealPlan() {
  if (!State.mealPlanText) return;
  navigator.clipboard.writeText(State.mealPlanText).then(() => {
    showToast("Meal plan copied to clipboard!", "success");
  }).catch(() => {
    showToast("Copy failed — please select and copy manually", "warning");
  });
}

function chatAboutMealPlan() {
  if (!State.mealPlanText) return;
  showTab("chat");
  const textarea = document.getElementById("chatInput");
  if (textarea) {
    textarea.value = "I'd like to discuss my meal plan and get some adjustments. Here are my thoughts: ";
    textarea.focus();
  }
}

// ════════════════════════════════════════════════════════════════
//  FAMILY PROFILES
// ════════════════════════════════════════════════════════════════
async function addFamilyMember() {
  const name = document.getElementById("fmName")?.value.trim();
  if (!name) {
    showToast("Please enter a name", "warning");
    return;
  }

  const member = {
    name,
    relationship: document.getElementById("fmRelationship")?.value,
    age: parseInt(document.getElementById("fmAge")?.value) || null,
    gender: document.getElementById("fmGender")?.value,
    weight: parseFloat(document.getElementById("fmWeight")?.value) || null,
    height: parseFloat(document.getElementById("fmHeight")?.value) || null,
    goal: document.getElementById("fmGoal")?.value,
    diet_type: document.getElementById("fmDietType")?.value,
    health_conditions: document.getElementById("fmHealth")?.value || "None",
    activity_level: "moderately_active",
  };

  try {
    const res = await fetch("/api/family", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(member),
    });

    const data = await res.json();
    if (data.error) {
      showToast(data.error, "danger");
      return;
    }

    // Clear form
    ["fmName", "fmAge", "fmWeight", "fmHeight", "fmHealth"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = "";
    });

    await refreshFamilyList();
    showToast(data.message, "success");

  } catch (err) {
    showToast("Failed to add family member", "danger");
  }
}

async function refreshFamilyList() {
  try {
    const res = await fetch("/api/family");
    const members = await res.json();
    State.familyMembers = members;
    renderFamilyList(members);
  } catch {}
}

function renderFamilyList(members) {
  const container = document.getElementById("familyMembersList");
  const countBadge = document.getElementById("familyCount");
  const familyCard = document.getElementById("familyMealPlanCard");

  if (countBadge) countBadge.textContent = members.length;

  // Update dashboard stat
  const statFamily = document.getElementById("statFamily");
  if (statFamily) statFamily.textContent = members.length;

  if (!members.length) {
    if (container) container.innerHTML = `
      <div class="family-empty text-center py-5" id="familyEmptyMsg">
        <i class="bi bi-people fs-1 text-muted"></i>
        <h5 class="mt-3">No family members added</h5>
        <p class="text-muted">Add family members to track their nutrition needs and get family meal plans.</p>
      </div>
    `;
    if (familyCard) familyCard.style.display = "none";
    return;
  }

  if (familyCard) familyCard.style.display = "";

  if (container) {
    container.innerHTML = members.map((m, idx) => {
      const bmiStr = m.bmi ? `BMI: ${m.bmi} (${m.bmi_category})` : "";
      return `
        <div class="family-member-card">
          <div class="member-avatar">${m.name[0].toUpperCase()}</div>
          <div class="member-info">
            <div class="member-name">${escapeHtml(m.name)}</div>
            <div class="member-meta">
              ${m.relationship} · ${m.age ? m.age + " yrs" : ""}
              ${m.gender ? ` · ${m.gender}` : ""}
              ${m.weight ? ` · ${m.weight}kg` : ""}
              ${bmiStr ? ` · ${bmiStr}` : ""}
            </div>
            <div class="member-tags">
              <span class="member-tag">${escapeHtml(m.goal)}</span>
              <span class="member-tag">${escapeHtml(m.diet_type)}</span>
              ${m.health_conditions && m.health_conditions !== "None"
                ? `<span class="member-tag">${escapeHtml(m.health_conditions)}</span>`
                : ""}
            </div>
          </div>
          <div class="member-actions">
            <button class="btn btn-sm btn-ghost" onclick="getFamilyMemberPlan(${idx})" title="Get meal plan">
              <i class="bi bi-journal-richtext"></i>
            </button>
            <button class="btn btn-sm btn-ghost" onclick="removeFamilyMember(${idx})" title="Remove"
              style="color:#ef4444 !important;">
              <i class="bi bi-trash3"></i>
            </button>
          </div>
        </div>
      `;
    }).join("");
  }
}

async function removeFamilyMember(idx) {
  if (!confirm("Remove this family member?")) return;
  try {
    const res = await fetch(`/api/family/${idx}`, { method: "DELETE" });
    const data = await res.json();
    if (data.success) {
      await refreshFamilyList();
      showToast(data.message, "success");
    }
  } catch {
    showToast("Failed to remove member", "danger");
  }
}

async function getFamilyMemberPlan(idx) {
  const member = State.familyMembers[idx];
  if (!member) return;

  showTab("chat");

  const prompt = `Create a personalized 1-day meal plan for:
Name: ${member.name}
Age: ${member.age || "not specified"}
Gender: ${member.gender}
Goal: ${member.goal}
Diet: ${member.diet_type}
Health conditions: ${member.health_conditions}
Please tailor this specifically to their needs.`;

  const textarea = document.getElementById("chatInput");
  if (textarea) {
    textarea.value = prompt;
    setTimeout(sendMessage, 300);
  }
}

async function generateFamilyMealPlan() {
  const members = State.familyMembers;
  if (!members.length) {
    showToast("Add family members first", "warning");
    return;
  }

  const memberSummary = members.map(m =>
    `${m.name} (${m.age || "?"}yr, ${m.gender}, Goal: ${m.goal}, Diet: ${m.diet_type}${m.health_conditions !== "None" ? ", Health: " + m.health_conditions : ""})`
  ).join("\n");

  const prompt = `Create a family meal plan for the following family members:
${memberSummary}

Please create a 1-day meal plan that works for the whole family, noting any individual modifications needed.`;

  showTab("chat");
  const textarea = document.getElementById("chatInput");
  if (textarea) {
    textarea.value = prompt;
    setTimeout(sendMessage, 300);
  }
}

// ════════════════════════════════════════════════════════════════
//  USER PROFILE
// ════════════════════════════════════════════════════════════════
async function saveProfile() {
  const profile = {
    name: document.getElementById("profName")?.value.trim() || "",
    age: document.getElementById("profAge")?.value,
    gender: document.getElementById("profGender")?.value,
    weight: document.getElementById("profWeight")?.value,
    height: document.getElementById("profHeight")?.value,
    goal: document.getElementById("profGoal")?.value,
    diet_type: document.getElementById("profDietType")?.value,
    activity_level: document.getElementById("profActivity")?.value,
    health_conditions: document.getElementById("profHealth")?.value || "None",
    cuisine_preference: document.getElementById("profCuisine")?.value,
  };

  if (!profile.name) {
    showToast("Please enter your name", "warning");
    return;
  }

  try {
    const res = await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profile),
    });

    const data = await res.json();
    if (data.error) {
      showToast(data.error, "danger");
      return;
    }

    State.profile = data.profile;
    renderProfilePreview(data.profile);
    renderProfileSummaryCard(data.profile);
    updateDashboard();
    showToast(data.message, "success");

  } catch {
    showToast("Failed to save profile", "danger");
  }
}

async function loadProfileFromServer() {
  try {
    const res = await fetch("/api/profile");
    const profile = await res.json();
    if (profile && profile.name) {
      State.profile = profile;
      renderProfileSummaryCard(profile);
    }
  } catch {}
}

function loadProfileFields() {
  const p = State.profile;
  if (!p || !p.name) return;

  const fields = {
    profName: p.name, profAge: p.age, profGender: p.gender,
    profWeight: p.weight, profHeight: p.height, profGoal: p.goal,
    profDietType: p.diet_type, profActivity: p.activity_level,
    profHealth: p.health_conditions !== "None" ? p.health_conditions : "",
    profCuisine: p.cuisine_preference,
  };

  Object.entries(fields).forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (el && val !== undefined && val !== null) el.value = val;
  });

  renderProfilePreview(p);
}

function renderProfilePreview(p) {
  const container = document.getElementById("profilePreview");
  if (!container) return;

  const bmiText = p.bmi ? `${p.bmi} (${p.bmi_category})` : "Not calculated";
  const tdeeText = p.tdee ? `${p.tdee.toLocaleString()} kcal` : "—";
  const bmrText = p.bmr ? `${p.bmr.toLocaleString()} kcal` : "—";

  container.innerHTML = `
    <div class="text-center mb-3">
      <div class="preview-avatar">${p.name[0].toUpperCase()}</div>
      <div class="preview-name">${escapeHtml(p.name)}</div>
      <div class="preview-goal-badge">${escapeHtml(p.goal || "General Health")}</div>
    </div>
    <div class="preview-metrics">
      <div class="preview-metric">
        <div class="m-val">${p.age || "—"}</div>
        <div class="m-lbl">Age</div>
      </div>
      <div class="preview-metric">
        <div class="m-val">${p.weight ? p.weight + "kg" : "—"}</div>
        <div class="m-lbl">Weight</div>
      </div>
      <div class="preview-metric">
        <div class="m-val">${p.height ? p.height + "cm" : "—"}</div>
        <div class="m-lbl">Height</div>
      </div>
      <div class="preview-metric">
        <div class="m-val" style="color:var(--brand-primary)">${bmiText.split(" ")[0]}</div>
        <div class="m-lbl">BMI</div>
      </div>
    </div>
    <div class="mt-3 pt-3" style="border-top:1px solid var(--border-color)">
      <div class="profile-pill"><span class="label">Diet Type</span><span class="value">${escapeHtml(p.diet_type || "—")}</span></div>
      <div class="profile-pill"><span class="label">Daily Calories</span><span class="value">${tdeeText}</span></div>
      <div class="profile-pill"><span class="label">BMR</span><span class="value">${bmrText}</span></div>
      <div class="profile-pill"><span class="label">Activity</span><span class="value">${formatActivity(p.activity_level)}</span></div>
      ${p.health_conditions && p.health_conditions !== "None"
        ? `<div class="profile-pill"><span class="label">Health</span><span class="value">${escapeHtml(p.health_conditions)}</span></div>`
        : ""}
    </div>
  `;
}

function renderProfileSummaryCard(p) {
  const container = document.getElementById("profileSummary");
  if (!container) return;

  if (!p || !p.name) {
    container.innerHTML = `
      <div class="no-profile-msg">
        <i class="bi bi-person-plus fs-2 text-muted"></i>
        <p class="text-muted small mt-2">Complete your profile for personalized advice</p>
        <button class="btn btn-sm btn-primary-custom w-100" onclick="showTab('profile')">Setup Profile</button>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="d-flex align-items-center gap-2 mb-2">
      <div style="width:36px;height:36px;background:linear-gradient(135deg,var(--brand-primary),#22c55e);border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;font-weight:700;">
        ${p.name[0].toUpperCase()}
      </div>
      <div>
        <div style="font-weight:700;font-size:.9rem;">${escapeHtml(p.name)}</div>
        <div style="font-size:.72rem;color:var(--text-muted);">${p.goal || ""}</div>
      </div>
    </div>
    <div class="profile-pill"><span class="label">BMI</span><span class="value">${p.bmi || "—"} ${p.bmi_category ? "(" + p.bmi_category + ")" : ""}</span></div>
    <div class="profile-pill"><span class="label">Calories</span><span class="value">${p.tdee ? p.tdee + " kcal/day" : "—"}</span></div>
    <div class="profile-pill"><span class="label">Diet</span><span class="value">${escapeHtml(p.diet_type || "—")}</span></div>
  `;
}

function clearProfile() {
  ["profName","profAge","profGender","profWeight","profHeight",
   "profGoal","profDietType","profActivity","profHealth","profCuisine"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = el.tagName === "SELECT" ? el.options[0]?.value || "" : "";
  });

  document.getElementById("profilePreview").innerHTML = `
    <div class="text-center py-4">
      <div class="profile-avatar-lg"><i class="bi bi-person"></i></div>
      <p class="text-muted mt-3">Fill in your details to see your nutrition profile summary</p>
    </div>
  `;
}

// ════════════════════════════════════════════════════════════════
//  DASHBOARD
// ════════════════════════════════════════════════════════════════
function updateDashboard() {
  const p = State.profile;

  document.getElementById("statTDEE").textContent = p.tdee ? `${p.tdee.toLocaleString()} kcal` : "—";
  document.getElementById("statBMI").textContent = p.bmi || "—";
  document.getElementById("statProtein").textContent = p.weight ? `${Math.round(p.weight * 1.6)}g` : "—";

  const familyCount = State.familyMembers.length;
  document.getElementById("statFamily").textContent = familyCount;

  // Macro donut chart
  if (p.tdee && p.weight) {
    const protein_g = Math.round(p.weight * 1.6);
    const fat_g = Math.round((p.tdee * 0.30) / 9);
    const carbs_g = Math.round((p.tdee * 0.45) / 4);
    renderMacroDonut(protein_g, carbs_g, fat_g, p.tdee);
    renderCalorieTargets(p.tdee);
  }
}

function renderMacroDonut(protein, carbs, fat, tdee) {
  const container = document.getElementById("macroChartContainer");
  if (!container) return;

  const total = protein + carbs + fat;
  const proteinPct = Math.round((protein / total) * 100);
  const carbsPct   = Math.round((carbs / total) * 100);
  const fatPct     = 100 - proteinPct - carbsPct;

  // SVG donut
  const size = 130;
  const radius = 50;
  const circ = 2 * Math.PI * radius;

  const toStroke = (pct) => (pct / 100) * circ;
  const proteinStroke = toStroke(proteinPct);
  const carbsStroke   = toStroke(carbsPct);

  container.innerHTML = `
    <div class="macro-donut-wrapper">
      <div class="macro-donut">
        <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
          <!-- Background circle -->
          <circle cx="65" cy="65" r="${radius}" fill="none" stroke="var(--bg-surface)" stroke-width="14"/>
          <!-- Protein segment (green) -->
          <circle cx="65" cy="65" r="${radius}" fill="none" stroke="#16a34a" stroke-width="14"
            stroke-dasharray="${proteinStroke} ${circ - proteinStroke}"
            stroke-dashoffset="0"
            stroke-linecap="round"/>
          <!-- Carbs segment (blue) -->
          <circle cx="65" cy="65" r="${radius}" fill="none" stroke="#0ea5e9" stroke-width="14"
            stroke-dasharray="${carbsStroke} ${circ - carbsStroke}"
            stroke-dashoffset="${-proteinStroke}"
            stroke-linecap="round"/>
          <!-- Fat segment (orange) -->
          <circle cx="65" cy="65" r="${radius}" fill="none" stroke="#f59e0b" stroke-width="14"
            stroke-dasharray="${toStroke(fatPct)} ${circ - toStroke(fatPct)}"
            stroke-dashoffset="${-(proteinStroke + carbsStroke)}"
            stroke-linecap="round"/>
          <!-- Center text -->
          <text x="65" y="60" text-anchor="middle" fill="var(--text-primary)"
            font-size="14" font-weight="800" font-family="Poppins,sans-serif">${tdee.toLocaleString()}</text>
          <text x="65" y="75" text-anchor="middle" fill="var(--text-muted)" font-size="8">kcal/day</text>
        </svg>
      </div>
      <div class="donut-legend">
        <div class="legend-item">
          <div class="legend-dot" style="background:#16a34a"></div>
          <span>Protein</span>
          <span class="legend-value">${proteinPct}% · ${protein}g</span>
        </div>
        <div class="legend-item">
          <div class="legend-dot" style="background:#0ea5e9"></div>
          <span>Carbs</span>
          <span class="legend-value">${carbsPct}% · ${carbs}g</span>
        </div>
        <div class="legend-item">
          <div class="legend-dot" style="background:#f59e0b"></div>
          <span>Fats</span>
          <span class="legend-value">${fatPct}% · ${fat}g</span>
        </div>
      </div>
    </div>
  `;
}

function renderCalorieTargets(tdee) {
  const container = document.getElementById("calorieTargets");
  if (!container) return;

  const targets = [
    { label: "🎯 Weight Loss (−0.5kg/wk)", kcal: tdee - 500 },
    { label: "⚖️ Maintenance", kcal: tdee, highlight: true },
    { label: "💪 Lean Muscle Gain", kcal: tdee + 300 },
  ];

  container.innerHTML = targets.map(t => `
    <div class="calorie-target-row ${t.highlight ? "fw-bold" : ""}">
      <span class="target-label">${t.label}</span>
      <span class="target-value">${t.kcal.toLocaleString()} kcal</span>
    </div>
  `).join("");
}

// ════════════════════════════════════════════════════════════════
//  UTILITY FUNCTIONS
// ════════════════════════════════════════════════════════════════
function showToast(message, type = "success") {
  const toast = document.getElementById("mainToast");
  const body  = document.getElementById("toastBody");
  if (!toast || !body) return;

  body.textContent = message;
  toast.className = `toast align-items-center border-0 bg-${type}`;

  const bsToast = bootstrap.Toast.getOrCreateInstance(toast, { delay: 3500 });
  bsToast.show();
}

function showLoading(text = "Processing...") {
  const overlay = document.getElementById("loadingOverlay");
  const textEl  = document.getElementById("loadingText");
  if (overlay) overlay.style.display = "flex";
  if (textEl)  textEl.textContent = text;
}

function hideLoading() {
  const overlay = document.getElementById("loadingOverlay");
  if (overlay) overlay.style.display = "none";
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatActivity(level) {
  const map = {
    "sedentary":          "Sedentary",
    "lightly_active":     "Lightly Active",
    "moderately_active":  "Moderately Active",
    "very_active":        "Very Active",
    "extra_active":       "Extra Active",
  };
  return map[level] || level || "—";
}

function animateCounter(elementId, from, to, duration = 800, decimals = 0) {
  const el = document.getElementById(elementId);
  if (!el) return;

  const start = performance.now();
  const update = (timestamp) => {
    const elapsed = timestamp - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
    const current = from + (to - from) * eased;
    el.textContent = decimals > 0 ? current.toFixed(decimals) : Math.round(current);
    if (progress < 1) requestAnimationFrame(update);
  };
  requestAnimationFrame(update);
}
