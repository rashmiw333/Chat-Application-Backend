const express = require("express");
const app = express();
const cors = require("cors");
const http = require("http");
const {initializeDatabase} = require("./db/db.connect");
const dotenv = require("dotenv");
const authRoutes = require("./routes/auth");
const { Server } = require("socket.io");
const server = http.createServer(app);
const io = new Server(server);
const Messages = require("./models/Messages");
const User = require("./models/user.model");

app.use(express.json());
app.use(cors());
dotenv.config();

initializeDatabase();


// // Database connection
// const { initializeDatabase } = require("./db/db.connect");
// initializeDatabase();

// Routes
app.use("/auth", authRoutes);

// socket io logic
io.on("connection", (socket) => {
    console.log("User connected", socket.id);

    socket.on("send_message", async (data) => {
        const { sender, receiver, message } = data;

        const newMessage = new Messages({ sender, receiver, message });
        await newMessage.save();
    });

    socket.broadcast.emit("receive_message", data);

    socket.on("disconnect", () => {
    console.log("User disconnected", socket.id);

    });
});

app.get("/messages", async (req, res) => {
    const { sender, receiver } = req.query;

    try {
        const messages = await Messages.find({
            $or: [
                { sender, receiver },
                { sender: receiver, receiver: sender },
            ],
        }).sort({ createdAt: 1 });

        res.json(messages);

    } catch (error) {
        res.status(500).json({ message: "Error fetching messages" });
    }
});

app.get("/users", async (req, res) => {
    const { currentUser } = req.query;

    try {
        const users = await User.find({
            username: { $ne: currentUser }
        });

        res.json(users);

    } catch (error) {
        res.status(500).json({ message: "Error fetching users" });
    }
});

const PORT = process.env.PORT || 5001;

app.listen(PORT, () =>
    console.log(`Server running on port ${PORT}`)
);