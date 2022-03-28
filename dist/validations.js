"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatHofAllowed = exports.userHofAllowed = exports.userAllowed = exports.chatAllowed = void 0;
const allowedChats = process.env.ALLOWED_CHATS;
const allowedHofChats = process.env.HOFS_CHAT_ID;
const allowedUsers = process.env.ALLOWED_USERS;
const allowedHofUsers = process.env.ALLOWED_HOF_USERS;
const chatAllowed = (chatId) => allowedChats ? allowedChats.indexOf(chatId.toString()) !== -1 : true;
exports.chatAllowed = chatAllowed;
const userAllowed = (userId) => allowedUsers ? allowedUsers.indexOf(userId.toString()) !== -1 : true;
exports.userAllowed = userAllowed;
const userHofAllowed = (userId) => allowedHofUsers ? allowedHofUsers.indexOf(userId.toString()) !== -1 : true;
exports.userHofAllowed = userHofAllowed;
const chatHofAllowed = (chatId) => allowedHofChats ? allowedHofChats.indexOf(chatId.toString()) !== -1 : true;
exports.chatHofAllowed = chatHofAllowed;
//# sourceMappingURL=validations.js.map