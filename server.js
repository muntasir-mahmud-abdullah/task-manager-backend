const express = require("express");
const { MongoClient, ObjectId } = require("mongodb");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(express.json());
app.use(cors());

// MongoDB Connection
const client = new MongoClient(process.env.MONGO_URI);
let db;
//task_manager
//05oZIiOPQPrHak9S
async function connectDB() {
  try {
    await client.connect();
    db = client.db("task_manager");
    console.log("✅ Connected to MongoDB (Raw)");
  } catch (error) {
    console.error("❌ MongoDB Connection Error:", error);
  }
}

connectDB();

const tasksCollection = () => db.collection("tasks");

// CRUD Routes

// 1. GET all tasks
app.get("/tasks", async (req, res) => {
  try {
    const tasks = await tasksCollection().find().toArray();
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: "Error fetching tasks", error });
  }
});

// 2. POST a new task
app.post("/tasks", async (req, res) => {
  try {
    const { title, description, category } = req.body;
    const newTask = { title, description, category, timestamp: new Date() };
    const result = await tasksCollection().insertOne(newTask);
    res.json({ ...newTask, _id: result.insertedId });
  } catch (error) {
    res.status(500).json({ message: "Error creating task", error });
  }
});

// 3. PUT (Update) an existing task
app.put("/tasks/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    await tasksCollection().updateOne(
      { _id: new ObjectId(id) },
      { $set: updates }
    );
    res.json({ message: "Task updated successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error updating task", error });
  }
});

// 4. DELETE a task
app.delete("/tasks/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await tasksCollection().deleteOne({ _id: new ObjectId(id) });
    res.json({ message: "Task deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting task", error });
  }
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
