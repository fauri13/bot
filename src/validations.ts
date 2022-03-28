const allowedChats = process.env.ALLOWED_CHATS
const allowedHofChats = process.env.HOFS_CHAT_ID
const allowedUsers = process.env.ALLOWED_USERS
const allowedHofUsers = process.env.ALLOWED_HOF_USERS

export const chatAllowed = (chatId: number) =>
  allowedChats ? allowedChats.indexOf(chatId.toString()) !== -1 : true
export const userAllowed = (userId: number) =>
  allowedUsers ? allowedUsers.indexOf(userId.toString()) !== -1 : true
export const userHofAllowed = (userId: number) =>
  allowedHofUsers ? allowedHofUsers.indexOf(userId.toString()) !== -1 : true
export const chatHofAllowed = (chatId: number) =>
  allowedHofChats ? allowedHofChats.indexOf(chatId.toString()) !== -1 : true
