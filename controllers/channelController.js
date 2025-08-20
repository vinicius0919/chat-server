const Channel = require("../models/Channel");
const { generatePasswordHash } = require("../functions/passwordHash");

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

const addMemberToChannel = async (channelId, userId, channelPassword) => {
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

  if (channel.configs.password) {
    if (!channelPassword) {
      throw new Error("Senha do canal é obrigatória");
    }
    const isPasswordValid = await verifyPassword(
      channelPassword,
      channel.configs.password
    );
    if (!isPasswordValid) {
      throw new Error("Senha do canal inválida");
    }
  }

  channel.members.push(userId);
  return await channel.save();
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
  return await Channel.deleteOne({ _id: id });
};

module.exports = {
  createChannel,
  getChannelById,
  getChannelByUserId,
  updateChannel,
  addMemberToChannel,
  deleteChannel,
};
