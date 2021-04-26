"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendMessage = void 0;
var bluebird_1 = require("bluebird");
var queue = [];
var inUseQueue = [];
var _sendMessages = function () {
    // if we are already sending messages from the queue, or
    // the queue is empty, stop
    if (inUseQueue.length || !queue.length)
        return;
    console.log("processing queue");
    inUseQueue = queue;
    queue = [];
    bluebird_1.Promise.mapSeries(inUseQueue, function (request) {
        var _a;
        var resolve = request.resolve;
        var reject = request.reject;
        var ctx = request.ctx;
        var type = request.type;
        console.log("sending message '%s'", request.message);
        if (type === 'markdown') {
            return ctx.replyWithMarkdown(request.message)
                .then(resolve)
                .catch(reject);
        }
        else if (type === 'html') {
            return ctx.replyWithHTML(request.message, { reply_to_message_id: (_a = ctx.message) === null || _a === void 0 ? void 0 : _a.message_id, disable_web_page_preview: true })
                .then(resolve)
                .catch(reject);
        }
        else {
            return ctx.reply(request.message)
                .then(resolve)
                .catch(reject);
        }
    }).then(function () {
        console.log("queue processed");
        inUseQueue = [];
        _sendMessages();
    });
};
var sendMessage = function (ctx, type, message) {
    var resolve, reject;
    var promise = new bluebird_1.Promise(function (promiseResolve, promiseReject) {
        resolve = promiseResolve;
        reject = promiseReject;
    });
    console.log("pushing message '%s' to queue", message);
    queue.push({ ctx: ctx, message: message, resolve: resolve, reject: reject, type: type });
    process.nextTick(_sendMessages);
    return promise;
};
exports.sendMessage = sendMessage;
//# sourceMappingURL=sendMessage.js.map