import { Promise } from 'bluebird'
import { Context } from 'telegraf';

type MessageType = 'normal' | 'markdown' | 'html'

var queue: Array<{ resolve: any, reject: any, ctx: Context, message: string, type: MessageType }> = [];
var inUseQueue = [];
const _sendMessages = () => {
    // if we are already sending messages from the queue, or
    // the queue is empty, stop
    if (inUseQueue.length || !queue.length) return;

    console.log("processing queue")
    inUseQueue = queue
    queue = []
    Promise.mapSeries(inUseQueue, function(request) {
        const resolve = request.resolve
        const reject = request.reject
        const ctx = request.ctx
        const type = request.type
        console.log("sending message '%s'", request.message);
        if (type === 'markdown') {
          return ctx.replyWithMarkdown(request.message)
              .then(resolve)
              .catch(reject)
        } else if (type === 'html') {
          return ctx.replyWithHTML(request.message, { reply_to_message_id: ctx.message?.message_id, disable_web_page_preview: true })
              .then(resolve)
              .catch(reject)
        } else {
          return ctx.reply(request.message)
              .then(resolve)
              .catch(reject)
        }
    }).then(function() {
        console.log("queue processed")
        inUseQueue = []
        _sendMessages()
    });
}

export const sendMessage = (ctx: Context, type: MessageType, message: string) => {
    let resolve, reject
    const promise = new Promise(function(promiseResolve, promiseReject) {
        resolve = promiseResolve;
        reject = promiseReject;
    });
    console.log("pushing message '%s' to queue", message)
    queue.push({ ctx, message, resolve, reject, type })
    process.nextTick(_sendMessages)
    return promise
}