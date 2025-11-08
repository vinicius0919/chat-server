const {
  searchChannels,
  addMemberToChannel,
  addMemberToPrivateChannel,
  getChannelByUserId,
  createChannel,
  deleteChannel,
} = require("../controllers/channelControllers");
const { insertMessage } = require("../controllers/messagesControllers");
const { authGuard } = require("../middlewares/authGuard");
//const User = require("../models/User");

const router = require("express").Router();

// create a new channel
// (name, description, ownerId, configs)
router.post("/", authGuard, async (req, res) => {
  console.log("POST / route called with body:", req.body);
  const { name, description, ownerId, configs } = req.body;
  try {
    const channel = await createChannel(name, description, ownerId, configs);
    res.status(201).json(channel);
  } catch (error) {
    console.error("Error creating channel:", error);
    res.status(500).json({ errorMessage: error.message });
  }
});

// delete channel
router.delete("/", authGuard, async(req,res)=>{
  const { channelId, ownerId } = req.body;
  try {
    await deleteChannel(channelId, ownerId);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting channel:", error);
    res.status(500).json({ errorMessage: error.message });
  }
});

router.get("/search", authGuard, async (req, res) => {
  const { query, page = 1, limit = 10 } = req.query;
  console.log("Search query:", query, "Page:", page, "Limit:", limit);
  // try decode URI component in case of spaces or special characters
  const decodedQuery = decodeURIComponent(query);
  console.log("Decoded search query:", decodedQuery);
  try {
    const channels = await searchChannels(
      decodedQuery,
      parseInt(page),
      parseInt(limit)
    );
    console.log("Search results:", channels);
    res.status(200).json(channels);
  } catch (error) {
    console.error("Error searching channels:", error);
    res.status(500).json({ errorMessage: "Internal server error" });
  }
});
// get channels by userId
router.get("/user/:userId", authGuard, async (req, res) => {
  const { userId } = req.params;
  try {
    const channels = await getChannelByUserId(userId);
    res.status(200).json(channels);
  } catch (error) {
    console.error("Error getting channels by userId:", error);
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
    await insertMessage(channelId, systemMessage, {
      configs: { system: true },
    });
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
    const channel = await addMemberToPrivateChannel(
      channelName,
      channelPassword,
      userId
    );
    const systemMessage = {
      userId: userId,
      message: "Um novo usuário entrou no canal.",
      time: new Date(),
    };
    await insertMessage(channel._id, systemMessage, {
      configs: { system: true },
    });

    res.status(200).json(channel);
  } catch (error) {
    console.error("Error adding member to private channel:", error);
    res.status(500).json({ errorMessage: error.message });
  }
});

module.exports = { router };
