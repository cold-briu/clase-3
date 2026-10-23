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
  "author-orange"
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

// Color assignment helper
function getAuthorColorClass(username) {
  if (!authorColors[username]) {
    const hash = (username || "anon").split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const colorIndex = Math.abs(hash) % availableColorClasses.length;
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
    snapshot.forEach((doc) => {
      const data = doc.data();
      const isSelf = data.user === currentUser;
      appendMessage(doc.id, data.user || "Anonymous", data.text || "", data.createdAt, isSelf);
    });
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

// Footer links
rulesLink.addEventListener("click", (e) => {
  e.preventDefault();
  alert("Room Rules:\n1. Be polite\n2. Keep it minimal\n3. Enjoy chatting!");
});

aboutLink.addEventListener("click", (e) => {
  e.preventDefault();
  alert("ROOM.CHAT: Minimal neo-brutalist chat powered by Firebase Firestore.");
});
