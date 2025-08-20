const mongoose = require("mongoose");

const channelSchema = new mongoose.Schema({
  name: { type: String, unique: true, required: true },
  description: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  configs: {
    type: Object,
    default: {},
  },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
});

const Channel = mongoose.model("Channel", channelSchema);

module.exports = Channel;
