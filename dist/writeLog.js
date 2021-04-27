"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.writeLog = void 0;
const debug = process.env.DEBUG_TRACES === 'true';
const writeLog = (message) => {
    if (debug) {
        console.log(message);
    }
};
exports.writeLog = writeLog;
//# sourceMappingURL=writeLog.js.map