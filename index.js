const express = require("express");
const cors = require("cors");
const { createServer } = require("http");
const { Server } = require("socket.io");

const app = express();
app.use(express.json());
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
const server = createServer(app);

require("./db/connection");
const {
  createChannel,
  getChannelById,
  getChannelByUserId,
  updateChannel,
  addMemberToChannel,
  deleteChannel,
  getChannelMembers,
} = require("./controllers/channelControllers");

const {
  insertMessage,
  getMessagesByChannelId,
} = require("./controllers/messagesControllers");

const { router: userRouter } = require("./routes/userRoutes");
const { router: channelRouter } = require("./routes/channelRoutes");

const io = new Server(server, {
  cors: {
    origin: "*", // aqui pode ser "http://localhost:5173" para restringir
    methods: ["GET", "POST"],
  },
});
app.use("/api/channels", channelRouter);

app.use("/api/users", userRouter);

//const channels = [];

io.on("connection", (socket) => {
  socket.on("get_rooms", async (userId) => {
    if (!userId) {
      return socket.emit("error", "User ID is required to fetch rooms");
    }

    // emit only channels that are not private and the user is owner or player
    const userChannels = await getChannelByUserId(userId);
    socket.emit("rooms", userChannels);
  });
  socket.on(
    "create_channel",
    (
      channelName,
      description,
      roomLength,
      userId,
      roomType,
      roomPassword,
      username
    ) => {
      createChannel(channelName, description, userId, {
        roomLength,
        roomType,
        roomPassword,
      })
        .then((channel) => {
          socket.emit("channel_created", {
            _id: channel._id,
            name: channel.name,
            description: channel.description,
            owner: {
              _id: channel.owner,
              username: username,
            },
          });
        })
        .catch((error) => {
          console.error("Error creating channel:", error);
        });
    }
  );

  socket.on("delete_channel", async (channelId, userId) => {
    try {
      const deletedChannel = await deleteChannel(channelId, userId);
      if (deletedChannel) {
        socket.emit("channel_deleted", { _id: channelId });
      }
    } catch (error) {
      socket.emit("error", "Error deleting channel");
    }
  });

  socket.on("send_message_to_channel", async (room, data) => {
    await insertMessage(room, data);

    io.to(room).emit("message", data);
  });

  socket.on("join_channel", async (channelId) => {
    // veerify if channel exists
    const channel = await getChannelById(channelId);
    if (!channel) {
      return socket.emit("error", "Channel not found");
    }
    const members = await getChannelMembers(channelId);
    const messages = await getMessagesByChannelId(channelId);
    socket.emit("room_messages", messages, members);
    socket.join(channelId);
  });

  socket.on("join_private_channel", (roomName, type, roomPassword, userId) => {
    if (type === "public") {
      addMemberToChannel(roomName, userId, roomPassword)
        .then((channel) => {
          socket.join(channel.name);
        })
        .catch((error) => {
          socket.emit("error", "Incorrect password or room does not exist.");
        });
    } else if (type === "private") {
      // Handle joining private channel
    }
  });

  socket.on("disconnect", () => {
    console.log(socket.id, `disconnected ${new Date().toLocaleTimeString()}`);
  });
});

// =======================
// Start Server
// =======================
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
