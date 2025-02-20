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
app.get("/tasks", async (req, res) => {
  const tasks = await tasksCollection().find().toArray();
  res.json(tasks);
});

app.post("/tasks", async (req, res) => {
  const { title, description, category } = req.body;
  const newTask = { title, description, category, timestamp: new Date() };
  const result = await tasksCollection().insertOne(newTask);
  res.json({ ...newTask, _id: result.insertedId });
});

app.put("/tasks/:id", async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  await tasksCollection().updateOne({ _id: new ObjectId(id) }, { $set: updates });
  res.json({ message: "Task updated successfully" });
});

app.delete("/tasks/:id", async (req, res) => {
  const { id } = req.params;
  await tasksCollection().deleteOne({ _id: new ObjectId(id) });
  res.json({ message: "Task deleted successfully" });
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
