const joinScreen = document.getElementById("join-screen");
const chatScreen = document.getElementById("chat-screen");
const usernameInput = document.getElementById("username-input");
const roomInput = document.getElementById("room-input");
const joinBtn = document.getElementById("join-btn");

const roomNameEl = document.getElementById("room-name");
const userListEl = document.getElementById("user-list");
const userCountEl = document.getElementById("user-count");
const messagesEl = document.getElementById("messages");
const typingEl = document.getElementById("typing-indicator");
const messageForm = document.getElementById("message-form");
const messageInput = document.getElementById("message-input");

let ws = null;
let myUsername = null;
let typingTimeout = null;

function connect() {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  ws = new WebSocket(`${protocol}//${window.location.host}`);

  ws.addEventListener("open", () => {
    ws.send(
      JSON.stringify({
        type: "join",
        username: myUsername,
        room: roomInput.value.trim() || "general",
      })
    );
  });

  ws.addEventListener("message", (event) => {
    const data = JSON.parse(event.data);
    handleServerMessage(data);
  });

  ws.addEventListener("close", () => {
    addSystemMessage("Disconnected from server. Refresh to reconnect.");
  });
}

function handleServerMessage(data) {
  switch (data.type) {
    case "joined":
      roomNameEl.textContent = data.room;
      updateUserList(data.users);
      joinScreen.classList.add("hidden");
      chatScreen.classList.remove("hidden");
      messageInput.focus();
      break;

    case "message":
      addChatMessage(data.username, data.text, data.username === myUsername);
      break;

    case "system":
      addSystemMessage(data.text);
      break;

    case "presence":
      updateUserList(data.users);
      break;

    case "typing":
      typingEl.textContent = data.isTyping ? `${data.username} is typing...` : "";
      break;

    case "error":
      console.error("Server error:", data.text);
      break;
  }
}

function updateUserList(users) {
  userListEl.innerHTML = "";
  users.forEach((u) => {
    const li = document.createElement("li");
    li.textContent = u;
    userListEl.appendChild(li);
  });
  userCountEl.textContent = users.length;
}

function addChatMessage(username, text, isOwn) {
  const div = document.createElement("div");
  div.className = "msg" + (isOwn ? " own" : "");
  div.innerHTML = `<div class="author">${escapeHtml(username)}</div><div class="bubble">${escapeHtml(text)}</div>`;
  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function addSystemMessage(text) {
  const div = document.createElement("div");
  div.className = "msg system";
  div.textContent = text;
  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

joinBtn.addEventListener("click", () => {
  const name = usernameInput.value.trim();
  if (!name) {
    usernameInput.focus();
    return;
  }
  myUsername = name;
  connect();
});

messageForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = messageInput.value.trim();
  if (!text || !ws || ws.readyState !== WebSocket.OPEN) return;
  ws.send(JSON.stringify({ type: "message", text }));
  messageInput.value = "";
  ws.send(JSON.stringify({ type: "typing", isTyping: false }));
});

messageInput.addEventListener("input", () => {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  ws.send(JSON.stringify({ type: "typing", isTyping: true }));
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    ws.send(JSON.stringify({ type: "typing", isTyping: false }));
  }, 1500);
});
