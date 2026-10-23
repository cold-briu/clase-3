import { initializeApp } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  limit, 
  onSnapshot, 
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA7MSR-g4CxKR8jjqPUOnl3Q29Jqms-EEY",
  authDomain: "gen-lang-client-0045092944.firebaseapp.com",
  projectId: "gen-lang-client-0045092944",
  storageBucket: "gen-lang-client-0045092944.firebasestorage.app",
  messagingSenderId: "252872963102",
  appId: "1:252872963102:web:5b15f0089b6f21ee4d6a0f"
};

// Initialize Firebase & Firestore
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const messagesCollection = collection(db, "messages");

// State
let currentUser = "";
const authorColors = {};
const availableColorClasses = [
  "author-pink",
  "author-cyan",
  "author-yellow",
  "author-purple",
  "author-orange",
  "author-emerald",
  "author-teal",
  "author-sky",
  "author-blue",
  "author-indigo",
  "author-violet",
  "author-fuchsia",
  "author-rose",
  "author-coral",
  "author-amber",
  "author-mint",
  "author-chartreuse",
  "author-peach",
  "author-lavender"
];

// DOM elements
const welcomeView = document.getElementById("welcomeView");
const chatView = document.getElementById("chatView");
const nameForm = document.getElementById("nameForm");
const nameInput = document.getElementById("nameInput");
const chatForm = document.getElementById("chatForm");
const messageInput = document.getElementById("messageInput");
const messagesList = document.getElementById("messagesList");
const boxTitle = document.getElementById("boxTitle");
const statusLabel = document.getElementById("statusLabel");
const rulesLink = document.getElementById("rulesLink");
const aboutLink = document.getElementById("aboutLink");

// Gemini Bot Configuration & State
const BOT_NAME = "Gemini Bot";
let geminiApiKey = localStorage.getItem("gemini_api_key") || "";
let botEnabled = localStorage.getItem("gemini_bot_enabled") !== "false";
let isBotResponding = false;
const processedMessageIds = new Set();
let isInitialLoad = true;

// Modal & Bot DOM elements
const botBadge = document.getElementById("botBadge");
const botSettingsBtn = document.getElementById("botSettingsBtn");
const botModal = document.getElementById("botModal");
const closeModalBtn = document.getElementById("closeModalBtn");
const geminiApiKeyInput = document.getElementById("geminiApiKeyInput");
const botEnabledToggle = document.getElementById("botEnabledToggle");
const saveBotConfigBtn = document.getElementById("saveBotConfigBtn");

function updateBotBadge() {
  if (!botBadge) return;
  if (!botEnabled) {
    botBadge.textContent = "🤖 Bot Off";
    botBadge.className = "bot-badge disabled";
  } else if (!geminiApiKey) {
    botBadge.textContent = "🤖 Set API Key";
    botBadge.className = "bot-badge disabled";
  } else if (isBotResponding) {
    botBadge.textContent = "🤖 Bot Thinking...";
    botBadge.className = "bot-badge thinking";
  } else {
    botBadge.textContent = "🤖 Bot Active";
    botBadge.className = "bot-badge";
  }
}

// Low-tier Gemini generate content call
async function requestGeminiResponse(userPrompt, conversationContext = []) {
  if (!geminiApiKey) {
    throw new Error("Missing Gemini API Key. Click the gear icon ⚙️ to set it.");
  }

  // Use gemini-3.8-flash as recommended by Google Gemini API
  const models = ["gemini-3.8-flash", "gemini-2.5-flash"];
  let lastError = null;

  const contents = [
    {
      role: "user",
      parts: [
        {
          text: `You are "${BOT_NAME}", a friendly, witty, and concise AI assistant inside a minimal neo-brutalist chat room. Keep your replies concise (under 2-3 sentences), helpful, and direct.`
        }
      ]
    },
    {
      role: "model",
      parts: [{ text: "Understood! I will keep my replies punchy, helpful, and concise." }]
    }
  ];

  // Add conversation history context if available
  conversationContext.slice(-6).forEach((msg) => {
    contents.push({
      role: msg.user === BOT_NAME ? "model" : "user",
      parts: [{ text: `${msg.user}: ${msg.text}` }]
    });
  });

  contents.push({
    role: "user",
    parts: [{ text: userPrompt }]
  });

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 250
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `HTTP ${response.status}`);
      }

      const data = await response.json();
      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (reply) return reply.trim();
    } catch (err) {
      lastError = err;
      console.warn(`Attempt with ${model} failed:`, err.message);
    }
  }

  throw lastError || new Error("Failed to get response from Gemini API");
}

async function triggerBotReply(triggerText, recentMessages) {
  if (!botEnabled || !geminiApiKey || isBotResponding) return;

  isBotResponding = true;
  updateBotBadge();

  try {
    const botReply = await requestGeminiResponse(triggerText, recentMessages);
    if (botReply) {
      await addDoc(messagesCollection, {
        user: BOT_NAME,
        text: botReply,
        createdAt: serverTimestamp()
      });
    }
  } catch (err) {
    console.error("Gemini Bot Error:", err);
    await addDoc(messagesCollection, {
      user: BOT_NAME,
      text: `⚠️ [Gemini Error]: ${err.message}`,
      createdAt: serverTimestamp()
    });
  } finally {
    isBotResponding = false;
    updateBotBadge();
  }
}

// Color assignment helper with low collision djb2 hash + active user pool distribution
function getAuthorColorClass(username) {
  if (username === BOT_NAME) {
    return "author-bot";
  }
  if (!authorColors[username]) {
    // 33-hash (djb2) for high-dispersion hashing across string inputs
    let hash = 5381;
    const str = (username || "anon").trim().toLowerCase();
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) + hash) + str.charCodeAt(i);
      hash = hash & hash; // Convert to 32bit integer
    }
    
    let colorIndex = Math.abs(hash) % availableColorClasses.length;
    
    // Check already assigned colors to pick the next unused color in pool if collision occurs
    const usedColors = new Set(Object.values(authorColors));
    if (usedColors.size < availableColorClasses.length && usedColors.has(availableColorClasses[colorIndex])) {
      for (let offset = 1; offset < availableColorClasses.length; offset++) {
        const candidateIndex = (colorIndex + offset) % availableColorClasses.length;
        if (!usedColors.has(availableColorClasses[candidateIndex])) {
          colorIndex = candidateIndex;
          break;
        }
      }
    }
    
    authorColors[username] = availableColorClasses[colorIndex];
  }
  return authorColors[username];
}

function formatTimestamp(timestamp) {
  if (!timestamp) {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  }
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

// Render message to DOM
function appendMessage(id, user, text, timestamp, isSelf) {
  const item = document.createElement("div");
  item.className = `message-item ${isSelf ? 'self' : 'other'}`;
  item.dataset.id = id;

  const meta = document.createElement("div");
  meta.className = "msg-meta";

  const authorTag = document.createElement("span");
  authorTag.className = `msg-author ${isSelf ? 'author-lime' : getAuthorColorClass(user)}`;
  authorTag.textContent = user;

  const timeTag = document.createElement("span");
  timeTag.className = "msg-time";
  timeTag.textContent = formatTimestamp(timestamp);

  if (isSelf) {
    meta.appendChild(timeTag);
    meta.appendChild(authorTag);
  } else {
    meta.appendChild(authorTag);
    meta.appendChild(timeTag);
  }

  const bubble = document.createElement("div");
  bubble.className = "msg-bubble";
  bubble.textContent = text;

  item.appendChild(meta);
  item.appendChild(bubble);
  messagesList.appendChild(item);

  // Auto scroll to bottom
  messagesList.scrollTop = messagesList.scrollHeight;
}

// Subscribe to Firestore "messages" collection in real-time
let unsubscribe = null;
function listenToMessages() {
  const q = query(messagesCollection, orderBy("createdAt", "asc"), limit(100));

  unsubscribe = onSnapshot(q, (snapshot) => {
    messagesList.innerHTML = ""; // Clear existing messages
    const currentMessages = [];
    const newIncoming = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      const isSelf = data.user === currentUser;
      const docId = doc.id;

      currentMessages.push({ id: docId, ...data });

      if (!processedMessageIds.has(docId)) {
        processedMessageIds.add(docId);
        if (!isInitialLoad) {
          newIncoming.push({ id: docId, ...data });
        }
      }

      appendMessage(docId, data.user || "Anonymous", data.text || "", data.createdAt, isSelf);
    });

    // Check if initial load is complete
    if (isInitialLoad) {
      isInitialLoad = false;
      return;
    }

    // Process new incoming user messages that require a bot reply
    for (const msg of newIncoming) {
      if (msg.user !== BOT_NAME && msg.text) {
        // Trigger bot auto-reply
        triggerBotReply(msg.text, currentMessages);
        break; // Process one at a time
      }
    }
  }, (error) => {
    console.error("Firestore snapshot error:", error);
  });
}

// Handle entering chat
nameForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const name = nameInput.value.trim();
  if (!name) return;

  currentUser = name;
  statusLabel.textContent = `@${currentUser}`;
  boxTitle.textContent = `#general — Live`;

  welcomeView.classList.add("hidden");
  chatView.classList.remove("hidden");

  // Start real-time Firestore sync
  listenToMessages();
  updateBotBadge();

  messageInput.focus();
});

// Handle sending message
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = messageInput.value.trim();
  if (!text || !currentUser) return;

  messageInput.value = "";
  
  try {
    await addDoc(messagesCollection, {
      user: currentUser,
      text: text,
      createdAt: serverTimestamp()
    });
  } catch (err) {
    console.error("Error writing message to Firestore:", err);
  }

  messageInput.focus();
});

// Modal event listeners
if (botSettingsBtn && botModal) {
  botSettingsBtn.addEventListener("click", () => {
    geminiApiKeyInput.value = geminiApiKey;
    botEnabledToggle.checked = botEnabled;
    botModal.classList.remove("hidden");
    geminiApiKeyInput.focus();
  });

  closeModalBtn.addEventListener("click", () => {
    botModal.classList.add("hidden");
  });

  saveBotConfigBtn.addEventListener("click", () => {
    geminiApiKey = geminiApiKeyInput.value.trim();
    botEnabled = botEnabledToggle.checked;
    localStorage.setItem("gemini_api_key", geminiApiKey);
    localStorage.setItem("gemini_bot_enabled", String(botEnabled));
    botModal.classList.add("hidden");
    updateBotBadge();
  });

  botModal.addEventListener("click", (e) => {
    if (e.target === botModal) {
      botModal.classList.add("hidden");
    }
  });
}

updateBotBadge();

// Footer links
if (rulesLink) {
  rulesLink.addEventListener("click", (e) => {
    e.preventDefault();
    alert("Room Rules:\n1. Be polite\n2. Keep it minimal\n3. Enjoy chatting with Gemini Bot!");
  });
}

if (aboutLink) {
  aboutLink.addEventListener("click", (e) => {
    e.preventDefault();
    alert("ROOM.CHAT: Minimal neo-brutalist chat powered by Firebase Firestore and Gemini AI.");
  });
}

