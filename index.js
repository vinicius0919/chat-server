const express = require("express");
const cors = require("cors");
const { createServer } = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
app.use(express.json());
app.use(cors());
const server = createServer(app);

const { connection } = require("./db/connection");

const { router: userRouter } = require("./routes/userRoutes");


const io = new Server(server, {
  cors: {
    origin: "*", // aqui pode ser "http://localhost:5173" para restringir
    methods: ["GET", "POST"],
  },
});


app.use('/api/users', userRouter);

const channels = [];

io.on("connection", (socket) => {
  console.log(socket.id, `connected ${new Date().toLocaleTimeString()}`);

  socket.emit("channels_list", channels);

  socket.on("get_rooms", (username) => {
    console.log("Fetching rooms");
    // emit only channels that are not private and the user is owner or player
    const userChannels = channels.filter(
      (channel) =>
        channel.roomType === "public" ||
        channel.owner === username ||
        channel.roomPlayers.includes(username)
    );
    socket.emit("rooms", userChannels);
  });

  socket.on(
    "create_channel",
    (data, roomLength, username, roomType, roomPassword) => {
      if (!channels.find((channel) => channel.name === data)) {
        channels.push({
          name: data,
          roomLength,
          roomPlayers: [],
          owner: username,
          roomType,
          roomPassword,
          messages: [],
        });
        // emit only channels that are not private and the user is owner or player
        if (roomType === "public") {
          io.emit(
            "rooms",
            channels.filter(
              (channel) =>
                channel.roomType === "public" ||
                channel.owner === username ||
                channel.roomPlayers.includes(username)
            )
          );
        } else {
          socket.emit(
            "rooms",
            channels.filter(
              (channel) =>
                channel.roomType === "public" ||
                channel.owner === username ||
                channel.roomPlayers.includes(username)
            )
          );
        }
        console.log("Channel created:", {
          name: data,
          roomLength,
          roomPlayers: [],
          owner: username,
          roomType,
          roomPassword,
          messages: [],
        });
      }
    }
  );

  socket.on("delete_channel", (data, username) => {
    console.log("Attempting to delete channel:", data, "by user:", username);
    const channelIndex = channels.findIndex((channel) => channel.name === data);
    if (channelIndex !== -1 && channels[channelIndex].owner === username) {
      channels.splice(channelIndex, 1);
      // emit only channels that are not private and the user is owner or player
      io.emit(
        "rooms",
        channels.filter(
          (channel) =>
            !channel.roomType ||
            channel.owner === username ||
            channel.roomPlayers.includes(username)
        )
      );

      console.log("Channel deleted:", data);
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

  socket.on("join_private_channel", (roomName, roomPassword, username) => {
    const channel = channels.find((channel) => {
      console.log("Checking channel:", channel.name, "against roomName:", roomName);
      return channel.name === `${roomName}`});
    console.log(channel);
    if (channel && channel.roomPassword === roomPassword) {
      console.log("Joining private channel:", channel.name, channel.roomPassword === roomPassword);
      if (!channel.roomPlayers.includes(username)) {
        channel.roomPlayers.push(username);
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
