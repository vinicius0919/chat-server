const mongoose = require("mongoose");

const messagesSchema = new mongoose.Schema({
    channel: { type: mongoose.Schema.Types.ObjectId, ref: "Channel", required: true },
    createdAt: { type: Date, default: Date.now },
    messages: [{ type: Object, default: {}}],
    configs: {
        type: Object,
        default: {}
    }
});

const Messages = mongoose.model("Messages", messagesSchema);

module.exports = Messages;
