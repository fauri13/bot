"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendMessage = void 0;
const bluebird_1 = require("bluebird");
const debug = process.env.DEBUG_TRACES === 'true';
var queue = [];
var inUseQueue = [];
const _sendMessages = () => {
    // if we are already sending messages from the queue, or
    // the queue is empty, stop
    if (inUseQueue.length || !queue.length)
        return;
    if (debug)
        console.log("processing queue");
    inUseQueue = queue;
    queue = [];
    bluebird_1.Promise.mapSeries(inUseQueue, function (request) {
        const resolve = request.resolve;
        const reject = request.reject;
        const ctx = request.ctx;
        const type = request.type;
        const options = request.options;
        if (debug)
            console.log("sending message '%s'", request.message);
        if (type === 'markdown') {
            return ctx.replyWithMarkdown(request.message)
                .then(resolve)
                .catch(reject);
        }
        else if (type === 'html') {
            return ctx.replyWithHTML(request.message, options)
                .then(resolve)
                .catch(reject);
        }
        else {
            return ctx.reply(request.message)
                .then(resolve)
                .catch(reject);
        }
    }).then(function () {
        if (debug)
            console.log("queue processed");
        inUseQueue = [];
        _sendMessages();
    });
};
const sendMessage = (ctx, type, message, options = {}) => {
    let resolve, reject;
    const promise = new bluebird_1.Promise(function (promiseResolve, promiseReject) {
        resolve = promiseResolve;
        reject = promiseReject;
    });
    if (debug)
        console.log("pushing message '%s' to queue", message);
    queue.push({ ctx, message, resolve, reject, type, options });
    process.nextTick(_sendMessages);
    return promise;
};
exports.sendMessage = sendMessage;
//# sourceMappingURL=sendMessage.js.map