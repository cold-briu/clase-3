// State
let currentUser = "";
const authorColors = {};
const availableColorClasses = [
  "author-pink",
  "author-cyan",
  "author-yellow",
  "author-purple",
  "author-orange"
];

// Initial mock conversations
const initialMocks = [
  { user: "Aiko", text: "anyone trying the new neo-brutalist theme?", time: "19:42" },
  { user: "dev_dan", text: "clean lines and solid colors look so crisp honestly", time: "19:45" },
  { user: "Sora", text: "zero gradients, maximal punch.", time: "19:50" },
  { user: "pixelPete", text: "welcome newcomers! drop your thoughts in the channel.", time: "19:54" }
];

// Dynamic mock responses that randomly drop in while active
const simulatedResponses = [
  { user: "Aiko", text: "Agreed! It keeps things straightforward." },
  { user: "dev_dan", text: "Minimal animations feel way faster too." },
  { user: "Sora", text: "Typing something fresh here!" },
  { user: "pixelPete", text: "Nice point! The flat layout works well." },
  { user: "marta_k", text: "Hello everyone, just stepped into the room." },
  { user: "neo_coder", text: "CSS variables make flat palettes very neat." }
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
const activeCount = document.getElementById("activeCount");
const rulesLink = document.getElementById("rulesLink");
const aboutLink = document.getElementById("aboutLink");

// Color assignment helper
function getAuthorColorClass(username) {
  if (!authorColors[username]) {
    const hash = username.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const colorIndex = hash % availableColorClasses.length;
    authorColors[username] = availableColorClasses[colorIndex];
  }
  return authorColors[username];
}

function getCurrentTime() {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

// Render single message
function appendMessage(user, text, time = getCurrentTime(), isSelf = false) {
  const item = document.createElement("div");
  item.className = `message-item ${isSelf ? 'self' : 'other'}`;

  const meta = document.createElement("div");
  meta.className = "msg-meta";

  const authorTag = document.createElement("span");
  authorTag.className = `msg-author ${isSelf ? 'author-lime' : getAuthorColorClass(user)}`;
  authorTag.textContent = user;

  const timeTag = document.createElement("span");
  timeTag.className = "msg-time";
  timeTag.textContent = time;

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

  // Auto scroll to latest
  messagesList.scrollTop = messagesList.scrollHeight;
}

// Handle entering chat
nameForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const name = nameInput.value.trim();
  if (!name) return;

  currentUser = name;
  statusLabel.textContent = `@${currentUser}`;
  boxTitle.textContent = `#general — Connected`;

  welcomeView.classList.add("hidden");
  chatView.classList.remove("hidden");

  // Load initial mocks
  initialMocks.forEach(m => appendMessage(m.user, m.text, m.time, false));

  // Welcome system message
  appendMessage("System", `Welcome @${currentUser}! Join the discussion below.`, getCurrentTime(), false);

  messageInput.focus();
  startMockSimulation();
});

// Handle sending message
chatForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = messageInput.value.trim();
  if (!text) return;

  appendMessage(currentUser, text, getCurrentTime(), true);
  messageInput.value = "";
  messageInput.focus();
});

// Simulate incoming messages from other mock users periodically
let mockIndex = 0;
function startMockSimulation() {
  setInterval(() => {
    if (mockIndex < simulatedResponses.length) {
      const msg = simulatedResponses[mockIndex];
      appendMessage(msg.user, msg.text, getCurrentTime(), false);
      mockIndex++;
      
      // Update count slightly for realistic touch
      activeCount.textContent = `${6 + (mockIndex % 3)} online`;
    }
  }, 12000);
}

// Footer links handlers (alert modal minimal)
rulesLink.addEventListener("click", (e) => {
  e.preventDefault();
  alert("Room Rules:\n1. Be polite\n2. Keep it minimal\n3. Enjoy chatting!");
});

aboutLink.addEventListener("click", (e) => {
  e.preventDefault();
  alert("ROOM.CHAT: Minimal neo-brutalist chat landing page built with vanilla HTML, CSS, and JS.");
});
