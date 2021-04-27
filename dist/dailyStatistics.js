"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRaidsMessage = exports.getEnfermosMessage = void 0;
const underscore_1 = __importDefault(require("underscore"));
const database_1 = __importDefault(require("./database"));
const noRaidsMsgs = [
    'Panda de vagos',
    'Ka pasao?',
    'Yo me voy'
];
const raidsMsgs100 = [
    '¡Estáis que os salís!',
    'Guau. 🙀'
];
const raidsMsgs50 = [
    'Está bien.',
    'Enhorabuena',
    'Se nota que estamos de vacaciones 😏'
];
const raidsMsgs20 = [
    'No está mal, pero podemos mejorar',
    'Meh, normalillo'
];
const raidsMsgs1 = [
    '🥴',
    'Necessita Millorar',
    '¡A ver esos lechugazos mejicanos!',
    'Flojillo ehh'
];
const getExtraMessage = (raids) => {
    if (raids > 100) {
        return underscore_1.default.sample(raidsMsgs100);
    }
    if (raids >= 50) {
        return underscore_1.default.sample(raidsMsgs50);
    }
    if (raids >= 20) {
        return underscore_1.default.sample(raidsMsgs20);
    }
    return underscore_1.default.sample(raidsMsgs1);
};
const getEnfermosMessage = async (date) => {
    const enfermos = await database_1.default.getTopRaidParticipants(date);
    if (enfermos && enfermos.length) {
        return `Los enfermos de hoy son:${enfermos.map((e, index) => `\n${index + 1}. ${e.participant} (${e.count})`).join('')}`;
    }
    else {
        return 'No hay enfermos hoy 😳';
    }
};
exports.getEnfermosMessage = getEnfermosMessage;
const getRaidsMessage = async (date) => {
    const raids = await database_1.default.getRaids(date);
    if (raids) {
        return `Hoy se ha${raids > 1 ? 'n' : ''} hecho ${raids} raid${raids > 1 ? 's' : ''}\n${getExtraMessage(raids)}`;
    }
    else {
        return `No se han hecho raids hoy 😳\n${underscore_1.default.sample(noRaidsMsgs)}`;
    }
};
exports.getRaidsMessage = getRaidsMessage;
//# sourceMappingURL=dailyStatistics.js.map