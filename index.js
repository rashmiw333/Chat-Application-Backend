const express = require("express");
const app = express();
const cors = require("cors");
const {initializeDatabase} = require("./db/db.connect");
const dotenv = require("dotenv");
const authRoutes = require("./routes/auth");

app.use(express.json());
app.use(cors());


initializeDatabase();
dotenv.config();

// Database connection
const { initializeDatabase } = require("./db/db.connect");
initializeDatabase();

// Routes
app.use("/auth", authRoutes);

const PORT = process.env.PORT || 5001;

app.listen(PORT, () =>
    console.log(`Server running on port ${PORT}`)
);