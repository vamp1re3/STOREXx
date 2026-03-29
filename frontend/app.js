const API = "http://localhost:3000";
let token = localStorage.getItem("token");

// AUTH
if (token) {
  document.getElementById("auth")?.classList.add("hidden");
  document.getElementById("postBox")?.classList.remove("hidden");
}

// --- SIGNUP ---
function signup() {
  const password = document.getElementById("password").value;
  const confirmPassword = document.getElementById("confirmPassword").value;
  if (password !== confirmPassword) {
    alert("Passwords do not match");
    return;
  }
  fetch(`${API}/signup`, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({
      username: document.getElementById("username").value,
      email: document.getElementById("email").value,
      password: password,
      profile_pic: document.getElementById("pic").value
    })
  }).then(res => {
    if (res.ok) {
      alert("Account created");
      window.location = "LOGIN.html";
    } else {
      alert("Error creating account");
    }
  });
}

// --- LOGIN ---
function login() {
  fetch(`${API}/login`, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({
      email: document.getElementById("email").value,
      password: document.getElementById("password").value
    })
  })
  .then(res => res.json())
  .then(data => {
    if (data.token) {
      localStorage.setItem("token", data.token);
      window.location = "index.html";
    } else {
      alert("Login failed");
    }
  });
}

// --- CREATE POST ---
function post() {
  fetch(`${API}/post`, {
    method: "POST",
    headers: {"Content-Type": "application/json", "Authorization": token},
    body: JSON.stringify({
      image_url: img.value,
      caption: cap.value
    })
  }).then(() => loadPosts());
}

// --- LOAD FEED ---
function loadPosts() {
  fetch(`${API}/posts`, {
    headers: token ? {"Authorization": token} : {}
  })
    .then(res => res.json())
    .then(data => {
      const feed = document.getElementById("feed");
      feed.innerHTML = "";
      data.forEach(p => {
        const div = document.createElement("div");
        div.className = "post";

        const likeClass = p.is_liked ? "liked" : "";

        div.innerHTML = `
          <div class="user">
            <img src="${p.profile_pic || 'https://via.placeholder.com/40'}">
            <b>${p.username}</b>
          </div>
          <img src="${p.image_url}">
          <div class="caption">${p.caption}</div>
          <button class="likeBtn ${likeClass}" onclick="toggleLike(${p.id})">❤️ ${p.like_count || 0}</button>
        `;
        feed.appendChild(div);
      });
    });
}

function toggleLike(postId) {
  fetch(`${API}/like/${postId}`, {
    method: "POST",
    headers: {"Authorization": token}
  }).then(() => loadPosts());
}

// --- PROFILE PAGE ---
function loadProfile(userId) {
  fetch(`${API}/profile/${userId}`, {
    headers: token ? {"Authorization": token} : {}
  })
    .then(res => res.json())
    .then(data => {
      document.getElementById("profilePic").src = data.user.profile_pic || '';
      document.getElementById("profileName").innerText = data.user.username;
      document.getElementById("followers").innerText = data.followers;
      document.getElementById("following").innerText = data.following;

      const followBtn = document.getElementById("followBtn");
      if (data.isFollowing) {
        followBtn.innerText = "Unfollow";
      } else {
        followBtn.innerText = "Follow";
      }

      const postsDiv = document.getElementById("profilePosts");
      postsDiv.innerHTML = "";
      data.posts.forEach(p => {
        const div = document.createElement("div");
        div.className = "post";
        div.innerHTML = `
          <img src="${p.image_url}">
          <div class="caption">${p.caption}</div>
        `;
        postsDiv.appendChild(div);
      });
    });
}

function toggleFollow() {
  const userId = getProfileId(); // implement logic to get current profile ID
  fetch(`${API}/follow/${userId}`, {
    method: "POST",
    headers: {"Authorization": token}
  }).then(() => loadProfile(userId));
}

// --- CHAT ---
function loadMessages(withUserId) {
  fetch(`${API}/messages/${withUserId}`, {
    headers: {"Authorization": token}
  })
  .then(res => res.json())
  .then(data => {
    const box = document.getElementById("messages");
    box.innerHTML = "";
    data.forEach(m => {
      const div = document.createElement("div");
      div.className = "message-bubble " + (m.sender_id == getMyId() ? "sent" : "received");
      div.innerText = m.content;
      box.appendChild(div);
    });
    box.scrollTop = box.scrollHeight;
  });
}

function sendMessage() {
  const content = document.getElementById("msgInput").value;
  const withUserId = getChatUserId(); // implement logic
  fetch(`${API}/messages/${withUserId}`, {
    method: "POST",
    headers: {"Authorization": token, "Content-Type":"application/json"},
    body: JSON.stringify({ content })
  }).then(() => {
    document.getElementById("msgInput").value = "";
    loadMessages(withUserId);
  });
}

// --- UTILS ---
function goHome(){ window.location = "index.html"; }

function getMyId(){ 
  // optional: decode JWT if you want userId client-side
  return null; 
}

function getProfileId(){ return null; } // set when navigating to profile
function getChatUserId(){ return null; } // set when opening chat

// Load posts if feed exists
if (document.getElementById("feed")) {
  loadPosts();
}
