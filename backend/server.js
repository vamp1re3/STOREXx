// server.js
const express = require("express");
const cors = require("cors");
const pool = require("./db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const path = require("path");

require("dotenv").config();
const app = express();
app.use(cors());
app.use(express.json());

// Serve static files from frontend directory
app.use(express.static(path.join(__dirname, "../frontend")));

function auth(req, res, next) {
  const token = req.headers.authorization;
  if (!token) return res.status(401).send("No token");
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    res.status(401).send("Invalid token");
  }
}

// --- POSTS / FEED ---
app.get("/posts", async (req, res) => {
  let userId = null;
  if (req.headers.authorization) {
    try {
      const decoded = jwt.verify(req.headers.authorization, process.env.JWT_SECRET);
      userId = decoded.id;
    } catch {}
  }
  const result = await pool.query(`
    SELECT posts.*, users.username, users.profile_pic,
    (SELECT COUNT(*) FROM likes WHERE likes.post_id = posts.id) as like_count,
    CASE WHEN $1 IS NOT NULL AND EXISTS(SELECT 1 FROM likes WHERE likes.post_id = posts.id AND likes.user_id = $1) THEN true ELSE false END as is_liked
    FROM posts
    JOIN users ON posts.user_id = users.id
    ORDER BY posts.created_at DESC
  `, [userId]);
  res.json(result.rows);
});

app.post("/post", auth, async (req, res) => {
  const { image_url, caption } = req.body;
  await pool.query(
    "INSERT INTO posts (user_id, image_url, caption) VALUES ($1,$2,$3)",
    [req.user.id, image_url, caption]
  );
  res.send("Posted");
});

// --- LIKE POST ---
app.post("/like/:postId", auth, async (req, res) => {
  const { postId } = req.params;
  // Check if already liked
  const exists = await pool.query(
    "SELECT * FROM likes WHERE user_id=$1 AND post_id=$2",
    [req.user.id, postId]
  );
  if (exists.rows.length === 0) {
    await pool.query(
      "INSERT INTO likes (user_id, post_id) VALUES ($1,$2)",
      [req.user.id, postId]
    );
  } else {
    await pool.query(
      "DELETE FROM likes WHERE user_id=$1 AND post_id=$2",
      [req.user.id, postId]
    );
  }
  res.send("Toggled like");
});

// --- PROFILE + FOLLOW ---
app.get("/profile/:userId", async (req, res) => {
  const { userId } = req.params;
  const user = await pool.query(
    "SELECT id, username, profile_pic FROM users WHERE id=$1",
    [userId]
  );
  const posts = await pool.query(
    "SELECT * FROM posts WHERE user_id=$1 ORDER BY created_at DESC",
    [userId]
  );
  const followers = await pool.query(
    "SELECT COUNT(*) FROM follows WHERE following_id=$1",
    [userId]
  );
  const following = await pool.query(
    "SELECT COUNT(*) FROM follows WHERE follower_id=$1",
    [userId]
  );
  let isFollowing = false;
  if (req.user) {
    const followCheck = await pool.query(
      "SELECT * FROM follows WHERE follower_id=$1 AND following_id=$2",
      [req.user.id, userId]
    );
    isFollowing = followCheck.rows.length > 0;
  }
  res.json({
    user: user.rows[0],
    posts: posts.rows,
    followers: followers.rows[0].count,
    following: following.rows[0].count,
    isFollowing
  });
});

app.post("/follow/:userId", auth, async (req, res) => {
  const { userId } = req.params;
  const exists = await pool.query(
    "SELECT * FROM follows WHERE follower_id=$1 AND following_id=$2",
    [req.user.id, userId]
  );
  if (exists.rows.length === 0) {
    await pool.query(
      "INSERT INTO follows (follower_id, following_id) VALUES ($1,$2)",
      [req.user.id, userId]
    );
  } else {
    await pool.query(
      "DELETE FROM follows WHERE follower_id=$1 AND following_id=$2",
      [req.user.id, userId]
    );
  }
  res.send("Toggled follow");
});

// --- MESSAGES ---
app.get("/messages/:withUserId", auth, async (req, res) => {
  const { withUserId } = req.params;
  const result = await pool.query(
    "SELECT * FROM messages WHERE (sender_id=$1 AND receiver_id=$2) OR (sender_id=$2 AND receiver_id=$1) ORDER BY created_at",
    [req.user.id, withUserId]
  );
  res.json(result.rows);
});

app.post("/messages/:toUserId", auth, async (req, res) => {
  const { toUserId } = req.params;
  const { content } = req.body;
  await pool.query(
    "INSERT INTO messages (sender_id, receiver_id, content) VALUES ($1,$2,$3)",
    [req.user.id, toUserId, content]
  );
  res.send("Message sent");
});

// --- AUTH ---
app.post("/signup", async (req, res) => {
  const { username, email, password, profile_pic } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  try {
    await pool.query(
      "INSERT INTO users (username, email, password, profile_pic) VALUES ($1, $2, $3, $4)",
      [username, email, hashedPassword, profile_pic]
    );
    res.send("User created");
  } catch (err) {
    res.status(400).send("User already exists");
  }
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await pool.query("SELECT * FROM users WHERE email=$1", [email]);
  if (user.rows.length === 0) return res.status(400).send("User not found");
  const valid = await bcrypt.compare(password, user.rows[0].password);
  if (!valid) return res.status(400).send("Invalid password");
  const token = jwt.sign({ id: user.rows[0].id }, process.env.JWT_SECRET);
  res.json({ token });
});

app.listen(process.env.PORT || 3000, () => console.log("Server running on port", process.env.PORT || 3000));