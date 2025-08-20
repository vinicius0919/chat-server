const mongoose = require("mongoose");
const dotenv = require("dotenv");

require("dotenv").config();

const MONGO_URI = process.env.MONGO_URI;


const connection = () => mongoose.connect(MONGO_URI).then(() => {
  console.log("MongoDB connected successfully");
}).catch((err) => {
  console.error("MongoDB connection error:", err);
});

connection();
module.exports = connection;
