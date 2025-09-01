const Channel = require("../models/Channel");
const { generatePasswordHash, verifyPassword } = require("../functions/passwordHash");

const createChannel = async (name, description, ownerId, configs) => {
  if (!name || !ownerId) {
    throw new Error("Nome do canal e ID do proprietário são obrigatórios");
  }
  let hashedPassword = undefined;
  if (configs.roomPassword !== "" && configs.roomPassword) {
    hashedPassword = await generatePasswordHash(configs.roomPassword);
  }
  const channel = new Channel({ name, description, owner: ownerId, configs: { ...configs, roomPassword: hashedPassword } });
  return await channel.save();
};

const getChannelById = async (id) => {
  if (!id) {
    throw new Error("ID do canal é obrigatório");
  }
  return await Channel.findById(id).populate("owner").populate("members");
};

const getChannelByUserId = async (userId) => {
  if (!userId) {
    throw new Error("ID do usuário é obrigatório");
  }
  const channelsAsMember = await Channel.find({ members: userId })
    .populate("owner", "-passwordHash")
    .populate("members", "-passwordHash");
  const channelsAsOwner = await Channel.find({ owner: userId })
    .populate("owner", "-passwordHash")
    .populate("members", "-passwordHash");
  return [...channelsAsMember, ...channelsAsOwner];
};

const updateChannel = async (id, updates) => {
  if (!id || !updates) {
    throw new Error("ID do canal e atualizações são obrigatórios");
  }

  if (updates.configs && updates.configs.password) {
    updates.configs.password = await generatePasswordHash(
      updates.configs.password
    );
  }

  updates.updatedAt = Date.now();

  return await Channel.findByIdAndUpdate(id, updates, { new: true });
};

const addMemberToChannel = async (channelId, userId) => {
  if (!channelId || !userId) {
    throw new Error("ID do canal e ID do usuário são obrigatórios");
  }
  const channel = await Channel.findById(channelId);
  if (!channel) {
    throw new Error("Canal não encontrado");
  }
  if (channel.members.includes(userId)) {
    throw new Error("Usuário já é membro do canal");
  }

  channel.members.push(userId);
  return await channel.save();
};

// add member to private by channel name and channel password
const addMemberToPrivateChannel = async (channelName, channelPassword, userId) => {
  if (!channelName || !channelPassword || !userId) {
    throw new Error("Nome do canal, senha do canal e ID do usuário são obrigatórios");
  }

  const channel = await Channel.findOne({ name: channelName, "configs.roomType": "private" });
  if (!channel) {
    throw new Error("Canal privado não encontrado");
  }

  const isPasswordValid = await verifyPassword(channelPassword, channel.configs.roomPassword);
  if (!isPasswordValid) {
    throw new Error("Senha do canal inválida");
  }

  channel.members.push(userId);
  await channel.save();
// remove password from response
  const data = {
    _id: channel._id,
    name: channel.name,
    description: channel.description,
    owner: channel.owner,
    members: channel.members,
    configs: {
      ...channel.configs,
      roomPassword: undefined
    }
  };

  return data;
};

const deleteChannel = async (id, userId) => {
  if (!id) {
    throw new Error("ID do canal é obrigatório");
  }
  const channel = await Channel.findById(id);
  if (!channel) {
    throw new Error("Canal não encontrado");
  }
  if (channel.owner.toString() !== userId) {
    throw new Error("Apenas o proprietário pode deletar o canal");
  }
  // also delete all messages related to this channel
  const Messages = require("../models/Messages");
  await Messages.deleteMany({ channel: id });

  // then delete the channel

  return await Channel.deleteOne({ _id: id });
};

// search channels by name (with pagination using $lt)

const searchChannels = async (query, page = 1, limit = 10) => {
  if (!query) {
    throw new Error("Query is required");
  }
  const skip = (page - 1) * limit;
  // configs.type must be public
  return await Channel.find({
      name: { $regex: query, $options: "i" },
      "configs.roomType": "public"
  })
    .populate("owner", "-passwordHash")
    .populate("members", "-passwordHash")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
};

// get all members of a channel by channelId
const getChannelMembers = async (channelId) => {
  if (!channelId) {
    throw new Error("ID do canal é obrigatório");
  }
  const channel = await Channel.findById(channelId).populate("members").populate("owner");
  if (!channel) {
    throw new Error("Canal não encontrado");
  }
  const members = channel.members.map(member => {
    return { _id: member._id, username: member.username, profileImage: member.profileImage };
  });
  const owner = { _id: channel.owner._id, username: channel.owner.username, profileImage: channel.owner.profileImage };
  return members.concat(owner);
};

module.exports = {
  createChannel,
  getChannelById,
  getChannelByUserId,
  searchChannels,
  updateChannel,
  addMemberToChannel,
  addMemberToPrivateChannel,
  deleteChannel,
  getChannelMembers
};
