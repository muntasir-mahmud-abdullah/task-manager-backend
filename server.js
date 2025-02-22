const express = require("express");
const { MongoClient, ObjectId } = require("mongodb");
const cors = require("cors");
const http = require("http"); // Required for Socket.io
const { Server } = require("socket.io");
require("dotenv").config();

const app = express();
app.use(express.json());
app.use(cors());

// Create HTTP server and attach Socket.io
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Adjust based on frontend deployment
    methods: ["GET", "POST", "PUT", "DELETE"],
  },
});

// Listen for new socket connections
io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);
  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

// MongoDB Connection
const client = new MongoClient(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
let db;

async function connectDB() {
  try {
    await client.connect();
    db = client.db("task_manager");
    console.log("✅ Connected to MongoDB (Raw)");
  } catch (error) {
    console.error("❌ MongoDB Connection Error:", error);
    setTimeout(connectDB, 5000); // Retry after 5 seconds
  }
}
connectDB();

app.get("/", (req, res) => {
  res.send("Task Manager API Running ✅");
});

// 📌 Store User Data on Login
app.post("/users", async (req, res) => {
  console.log("Request body:", req.body);
  const { uid, email, displayName } = req.body;

  try {
    if (!db) return res.status(500).json({ error: "Database not connected" });

    const usersCollection = db.collection("users");
    const existingUser = await usersCollection.findOne({ uid });

    if (!existingUser) {
      await usersCollection.insertOne({ uid, email, displayName });
    }

    res.status(200).json({ message: "User stored successfully" });
  } catch (error) {
    console.error("Error in /users route:", error);
    res.status(500).json({ error: error.message });
  }
});

// 📌 CRUD Routes for Tasks

// 1️⃣ GET all tasks for a user
app.get("/tasks/:uid", async (req, res) => {
  const { uid } = req.params;
  try {
    if (!db) return res.status(500).json({ error: "Database not connected" });

    console.log("Fetching tasks for user:", uid);
    const tasksCollection = db.collection("tasks");
    const tasks = await tasksCollection.find({ uid }).sort({ order: 1 }).toArray();

    if (!tasks.length) {
      return res.status(404).json({ error: "No tasks found for this user." });
    }

    res.status(200).json(tasks);
  } catch (error) {
    console.error("Error fetching tasks:", error);
    res.status(500).json({ message: "Error fetching tasks", error });
  }
});

// 2️⃣ POST a new task
app.post("/tasks", async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: "Database not connected" });

    const { title, description, category, uid, order } = req.body;

    if (!title || !category || !uid) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const newTask = {
      title,
      description: description || "",
      category,
      uid,
      order: order || Date.now(),
      timestamp: new Date(),
    };

    const result = await db.collection("tasks").insertOne(newTask);
    io.emit("taskCreated", { ...newTask, _id: result.insertedId }); // Send real-time event

    res.status(201).json({ message: "Task added", taskId: result.insertedId });
  } catch (error) {
    res.status(500).json({ message: "Error creating task", error });
  }
});

// 3️⃣ PUT (Update) an existing task
app.put("/tasks/:id", async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: "Database not connected" });

    const { id } = req.params;
    if (!ObjectId.isValid(id)) return res.status(400).json({ error: "Invalid task ID" });

    const updates = req.body;
    if (!updates || Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "No updates provided" });
    }

    const result = await db.collection("tasks").updateOne(
      { _id: new ObjectId(id) },
      { $set: updates }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Task not found" });
    }

    io.emit("taskUpdated", { id, updates }); // Send real-time event

    res.status(200).json({ message: "Task updated successfully" });
  } catch (error) {
    console.error("Error updating task:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 4️⃣ DELETE a task
app.delete("/tasks/:id", async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: "Database not connected" });

    const { id } = req.params;
    if (!ObjectId.isValid(id)) return res.status(400).json({ error: "Invalid task ID" });

    const result = await db.collection("tasks").deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Task not found" });
    }

    io.emit("taskDeleted", { id }); // Send real-time event

    res.json({ message: "Task deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting task", error });
  }
});

// Start Server with Socket.io
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
