const mongoose = require("mongoose");

const userSchema  = new mongoose.Schema({
    username: {type: String, unique: true, required: true},
    passwordHash:{type:String, required: true},
    profileImage: {type: String, default: "" },
})

const User = mongoose.model("User", userSchema);

module.exports = User;