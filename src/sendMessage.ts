import { Promise } from 'bluebird'
import { Context } from 'telegraf';
import { ExtraReplyMessage } from 'telegraf/typings/telegram-types';
import { writeLog } from './writeLog';

type MessageType = 'normal' | 'markdown' | 'html'
interface QueueObject {
  resolve: any
  reject: any
  ctx: Context
  message: string
  type: MessageType
  options: ExtraReplyMessage
}

var queue: Array<QueueObject> = [];
var inUseQueue = [];
const _sendMessages = () => {
    // if we are already sending messages from the queue, or
    // the queue is empty, stop
    if (inUseQueue.length || !queue.length) return;

    writeLog('processing queue')
    inUseQueue = queue
    queue = []
    Promise.mapSeries(inUseQueue, function(request) {
        const resolve = request.resolve
        const reject = request.reject
        const ctx = request.ctx
        const type = request.type
        const options = request.options
        writeLog(`sending message '${request.message}'`);
        if (type === 'markdown') {
          return ctx.replyWithMarkdown(request.message)
              .then(resolve)
              .catch(reject)
        } else if (type === 'html') {
          return ctx.replyWithHTML(request.message, options)
              .then(resolve)
              .catch(reject)
        } else {
          return ctx.reply(request.message)
              .then(resolve)
              .catch(reject)
        }
    }).then(function() {
      writeLog('queue processed')
        inUseQueue = []
        _sendMessages()
    });
}

export const sendMessage = (ctx: Context, type: MessageType, message: string, options: ExtraReplyMessage = {}) => {
    let resolve, reject
    const promise = new Promise(function(promiseResolve, promiseReject) {
        resolve = promiseResolve;
        reject = promiseReject;
    });
    writeLog(`pushing message '${message}' to queue`)
    queue.push({ ctx, message, resolve, reject, type, options })
    process.nextTick(_sendMessages)
    return promise
}