const express = require("express");
require("dotenv").config();
const cors = require("cors");
const { createServer } = require("http");
const { Server } = require("socket.io");
const { verifyToken } = require("./middlewares/authGuard");
const cookieParser = require("cookie-parser");

const app = express();
app.use(express.json());
app.use(cookieParser());

const allowedOrigins = [
  "http://localhost:5173",
  "http://10.0.0.168:5173",
  "http://10.0.0.167:5173",
  "https://acaitalk.site",
  "https://www.acaitalk.site",
  'https://chat-front-git-features-vinicius-limas-projects-266dca5b.vercel.app'
];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
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
    origin: allowedOrigins, // aqui pode ser "http://localhost:5173" para restringir
    methods: ["GET", "POST"],
  },
});
app.use("/api/channels", channelRouter);

app.use("/api/users", userRouter);

io.on("connection", (socket) => {
  const validateToken = (token) => {
    try {
      const decoded = verifyToken(token);

      if (!decoded) {
        socket.emit("token_error", "Invalid or expired token");
        return null;
      }
      return decoded;
    } catch (error) {
      socket.emit("token_error", "Invalid or expired token");
      return null;
    }
  };
  // get rooms
  // socket.on("get_rooms", async (token) => {
  //   const decoded = validateToken(token);
  //   if (!decoded) {
  //     return;
  //   }
  //   if (!decoded.id) {
  //     return socket.emit("channel_error", "User ID is required to fetch rooms");
  //   }

  //   // emit only channels that are not private and the user is owner or player
  //   const userChannels = await getChannelByUserId(decoded.id);
  //   socket.emit("rooms", userChannels);
  // });
  // create channel
  socket.on("create_channel",
    (
      token,
      userId,
      channelName,
      description,
      roomLength,
      roomType,
      roomPassword
    ) => {
      const decoded = validateToken(token);
      if (!decoded) {
        return;
      }
      createChannel(channelName, description, userId, {
        roomLength,
        roomType,
        roomPassword,
      })
        .then((channel) => {
          console.log("Channel created:", channel);
          socket.emit("channel_created", {
            _id: channel._id,
            name: channel.name,
            description: channel.description,
            owner: {
              _id: channel.owner,
              username: channel.username,
            },
          });
        })
        .catch((error) => {
          console.error("Error creating channel:", error);
        });
    }
  );

  socket.on("delete_channel", async (token, channelId) => {
    const decoded = validateToken(token);
    if (!decoded) {
      return;
    }
    try {
      const deletedChannel = await deleteChannel(channelId, decoded.id);
      if (deletedChannel) {
        socket.emit("channel_deleted", { _id: channelId });
      }
    } catch (error) {
      socket.emit("channel_error", "Error deleting channel");
    }
  });

  socket.on("send_message_to_channel", async (token, room, data) => {
    const decoded = validateToken(token);
    if (!decoded) {
      return;
    }
    io.to(room).emit("message", data);
    await insertMessage(room, data);
  });

  socket.on("join_channel", async (token, channelId) => {
    if (!channelId) {
      return socket.emit("channel_error", "Channel ID is required to join");
    }

    const decoded = validateToken(token);
    if (!decoded) {
      return;
    }

    // verify if channel exists
    const channel = await getChannelById(channelId);
    if (!channel) {
      return socket.emit("channel_error", "Channel not found");
    }
    const members = await getChannelMembers(channelId);
    const messages = await getMessagesByChannelId(channelId);
    socket.emit("room_messages", messages, members);
    socket.join(channelId);
  });

  socket.on("join_private_channel", (token, roomName, type, roomPassword) => {
    const decoded = validateToken(token);
    if (!decoded) {
      return;
    }
    if (type === "public") {
      addMemberToChannel(roomName, decoded.id, roomPassword)
        .then((channel) => {
          socket.join(channel.name);
        })
        .catch((error) => {
          socket.emit(
            "channel_error",
            "Incorrect password or room does not exist."
          );
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
