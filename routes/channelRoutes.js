const { searchChannels, addMemberToChannel } = require("../controllers/channelControllers");
const router = require("express").Router();

router.get("/search", async (req, res) => {
  const { query, page = 1, limit = 10 } = req.query;
  // try decode URI component in case of spaces or special characters
  const decodedQuery = decodeURIComponent(query);
  console.log("Searching channels with query:", decodedQuery);
  try {
    const channels = await searchChannels(decodedQuery, parseInt(page), parseInt(limit));
    res.status(200).json(channels);
  } catch (error) {
    console.error("Error searching channels:", error);
    res.status(500).json({ errorMessage: "Internal server error" });
  }
});
//add new member to channel
// ${channelId}/addMember
router.post("/:channelId/addMember", async (req, res) => {
  const { channelId } = req.params;
  const { userId } = req.body;
  try {
    const channel = await addMemberToChannel(channelId, userId);
    res.status(200).json(channel);
  } catch (error) {
    console.error("Error adding member to channel:", error);
    res.status(500).json({ errorMessage: error.message });
  }
});
module.exports = { router };