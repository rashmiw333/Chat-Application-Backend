const express = require("express");
const app = express();
const cors = require("cors");
const http = require("http");
const {initializeDatabase} = require("./db/db.connect");
const dotenv = require("dotenv");
const authRoutes = require("./routes/auth");
const { Server } = require("socket.io");
const server = http.createServer(app);

const Messages = require("./models/messages.model");
const User = require("./models/user.model");

app.use(express.json());
app.use(cors());
dotenv.config();

initializeDatabase();


// // Database connection
// const { initializeDatabase } = require("./db/db.connect");
// initializeDatabase();

const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

//const io = new Server(server);

// Routes
app.use("/auth", authRoutes);

// socket io logic

io.on("connection", (socket) => {
    console.log("User connected", socket.id);

    // Register connected user
    socket.on("register_user", (username) => {
        socket.join(username);
        console.log(`${username} joined their room`);
        console.log("Current rooms:", socket.rooms);
    });

    // Send message
    socket.on("send_message", async (data) => {
        try {
            const { sender, receiver, message } = data;

            const newMessage = new Messages({
                sender,
                receiver,
                message
            });

            await newMessage.save();

            // Confirm message saved to sender
            socket.emit("message_sent", newMessage);

            // Send message only to receiver
            io.to(receiver).emit("receive_message", newMessage);

        } catch (error) {
            console.log("Error sending message:", error);
        }
    });

    // Typing indicator
socket.on("typing", (data) => {
    console.log(`${data.sender} is typing to ${data.receiver}`);

    io.to(data.receiver).emit("user_typing", {
        username: data.sender
    });
});

// Stop typing
socket.on("stop_typing", (data) => {
    console.log(`${data.sender} stopped typing`);

    io.to(data.receiver).emit("user_stop_typing", {
        username: data.sender
    });
});

    // Message delivered
    socket.on("message_delivered", async (messageId) => {
        try {
            const message = await Messages.findByIdAndUpdate(
                messageId,
                { status: "delivered" },
                { new: true }
            );

            if (message) {
                io.to(message.sender).emit("message_status", {
                    messageId,
                    status: "delivered"
                });
            }
        } catch (error) {
            console.log(error);
        }
    });

    // Message read
    socket.on("message_read", async (messageId) => {
        try {
            const message = await Messages.findByIdAndUpdate(
                messageId,
                { status: "read" },
                { new: true }
            );

            if (message) {
                io.to(message.sender).emit("message_status", {
                    messageId,
                    status: "read"
                });
            }
        } catch (error) {
            console.log(error);
        }
    });

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

// const PORT = process.env.PORT || 5001;

// server.listen(PORT, () =>
//     console.log(`Server running on port ${PORT}`)
// );

app.get("/", (req, res) => {
    res.json({ message: "Chat Application Backend is running" });
});

module.exports = server;