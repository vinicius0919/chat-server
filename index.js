const express = require("express");
const cors = require("cors");
const { createServer } = require("http");
const { Server } = require("socket.io");

const app = express();
app.use(express.json());
app.use(cors());
const server = createServer(app);

require("./db/connection");
const {
  createChannel,
  getChannelById,
  getChannelByUserId,
  updateChannel,
  addMemberToChannel,
  deleteChannel,
} = require("./controllers/channelController");

const { router: userRouter } = require("./routes/userRoutes");
const { create } = require("./models/Channel");

const io = new Server(server, {
  cors: {
    origin: "*", // aqui pode ser "http://localhost:5173" para restringir
    methods: ["GET", "POST"],
  },
});

app.use("/api/users", userRouter);

//const channels = [];

io.on("connection", (socket) => {
  console.log(socket.id, `connected ${new Date().toLocaleTimeString()}`);

  socket.on("get_rooms", async (userId) => {
    console.log("Fetching rooms");
    // emit only channels that are not private and the user is owner or player
    const userChannels = await getChannelByUserId(userId);
    console.log("User channels:", userChannels);
    socket.emit("rooms", userChannels);
  });
  socket.on(
    "create_channel",
    (channelName, description, roomLength, userId, roomType, roomPassword, username) => {
        createChannel(channelName, description, userId, {
          roomLength,
          roomType,
          roomPassword,
        })
          .then((channel) => {
            console.log("Channel created successfully:", channel);
            socket.emit("channel_created", {
              _id: channel._id,
              name: channel.name,
              description: channel.description,
              owner: {
                _id: channel.owner,
                username: username,
              }
            });
          })
          .catch((error) => {
            console.error("Error creating channel:", error);
          });
      }
  );

  socket.on("delete_channel", async (channelId, userId) => {
    console.log("Attempting to delete channel:", channelId, "by user:", userId);
    try {
      const deletedChannel = await deleteChannel(channelId, userId);
      if (deletedChannel) {
        socket.emit("channel_deleted", { _id: channelId });
      }
    } catch (error) {
      console.error("Error deleting channel:", error);
    }
  });

  socket.on("send_message_to_channel", (room, data) => {
    const channel = channels.find((channel) => channel.name === `${room}`);
    if (!channel) {
      console.error("Channel does not exist:", room);
      return;
    }
    if (!data || !data.message) {
      console.error("Invalid message data:", data);
      return;
    }
    console.log("Sending message to channel:", room, data);
    channel.messages.push(data);
    console.log(channel.messages);

    io.to(room).emit("message", data);
  });

  socket.on("join_channel", (data) => {
    const channel = channels.find((channel) => channel.name === `${data}`);
    if (channel) {
      console.log("Joining channel:", channel.messages);
      socket.emit("room_messages", channel.messages);
      socket.join(data);
    }
  });

  socket.on("join_private_channel", (roomName, roomPassword, userId) => {
    const channel = channels.find((channel) => {
      console.log(
        "Checking channel:",
        channel.name,
        "against roomName:",
        roomName
      );
      return channel.name === `${roomName}`;
    });
    console.log(channel);
    if (channel && channel.roomPassword === roomPassword) {
      console.log(
        "Joining private channel:",
        channel.name,
        channel.roomPassword === roomPassword
      );
      if (!channel.members.includes(userId)) {
        channel.members.push(userId);
      }
    } else {
      console.error("Failed to join private channel:", roomName);
      socket.emit("error", "Incorrect password or room does not exist.");
    }
  });

  socket.on("get_room_messages", (roomName) => {
    const channel = channels.find((c) => c.name === roomName);
    if (channel) {
      console.log("enviando mensagens da sala:", roomName, channel.messages);
      socket.emit("room_messages", channel.messages);
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
