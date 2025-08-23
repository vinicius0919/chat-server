const Messages = require("../models/Messages");

// create or insert messages from channel
// parameter channelId, data, configs
const insertMessage = async (channelId, data, configs) => {
  if (!channelId || !data) {
    throw new Error("ID do canal e dados da mensagem são obrigatórios");
  }
  let messageDoc = await Messages.findOne({ channel: channelId });
  if (!messageDoc) {
    messageDoc = new Messages({
      channel: channelId,
      messages: [],
      configs: configs || {},
    });
  }
  messageDoc.messages.push(data);
  return await messageDoc.save();
};

// get messages from channel
const getMessagesByChannelId = async (channelId) => {
  if (!channelId) {
    throw new Error("ID do canal é obrigatório");
  }
  return await Messages.findOne({ channel: channelId });
};

module.exports = { insertMessage, getMessagesByChannelId };
