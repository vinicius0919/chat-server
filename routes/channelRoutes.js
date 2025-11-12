const { get } = require("mongoose");
const { searchChannels, addMemberToChannel, addMemberToPrivateChannel, getChannelByUserId } = require("../controllers/channelControllers");
const { insertMessage } = require("../controllers/messagesControllers");
const {authGuard} = require("../middlewares/authGuard");

const router = require("express").Router();

router.get("/search", authGuard, async (req, res) => {
  const { query, page = 1, limit = 10 } = req.query;
  // try decode URI component in case of spaces or special characters
  const decodedQuery = decodeURIComponent(query);
  try {
    const channels = await searchChannels(decodedQuery, parseInt(page), parseInt(limit));
    console.log("Channels found:", channels);
    res.status(200).json(channels);
  } catch (error) {
    console.error("Error searching channels:", error);
    res.status(500).json({ errorMessage: "Internal server error" });
  }
});
//add new member to channel
// ${channelId}/addMember
router.post("/:channelId/addMember", authGuard, async (req, res) => {
  const { channelId } = req.params;
  const { userId } = req.body;
  try {
    const channel = await addMemberToChannel(channelId, userId);
    // insert a system message saying that user joined the channel
    const systemMessage = {
      userId: userId,
      message: "Um novo usuário entrou no canal.",
      time: new Date(),
    };
    await insertMessage(channelId, systemMessage, { configs: { system: true } });
    res.status(200).json(channel);
  } catch (error) {
    console.error("Error adding member to channel:", error);
    res.status(500).json({ errorMessage: error.message });
  }
});

// add new member to private channel by channel name and channel password

router.post("/:channelName/addMemberPrivate", authGuard, async (req, res) => {
  const { channelName } = req.params;
  const { userId, channelPassword } = req.body;
  try {
    const channel = await addMemberToPrivateChannel(channelName, channelPassword, userId);
    const systemMessage = {
      userId: userId,
      message: "Um novo usuário entrou no canal.",
      time: new Date(),
    };
    await insertMessage(channel._id, systemMessage, { configs: { system: true } });

    res.status(200).json(channel);
  } catch (error) {
    console.error("Error adding member to private channel:", error);
    res.status(500).json({ errorMessage: error.message });
  }
});

// get channels by userId
router.get("/user/:userId", authGuard, async (req, res) => {
  const { userId } = req.params;
  try {
    const channels = await getChannelByUserId(userId);
    res.status(200).json(channels);
  } catch (error) {
    console.error("Error fetching channels by userId:", error);
    res.status(500).json({ errorMessage: "Internal server error" });
  }
});

module.exports = { router };