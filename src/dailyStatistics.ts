import _ from "underscore"
import db from "./database"

const noRaidsMsgs = [
  'Ka pasao?',
  'Yo me voy'
]

const raidsMsgs100 = [
  '¡Estáis que os salís!',
  'Guau. 🙀',
  '😍, me he puesto cachonda y todo',
  'Se nota que estamos de vacaciones 😏',
  '🤑'
]

const raidsMsgs50 = [
  'Enhorabuena',
  '¡A ver esos hundos!',
  '¡A tope!',
  '👍',
  'Ahora sí que parece un grupo de raids'
]

const raidsMsgs20 = [
  'No está mal, pero podemos mejorar',
  'Meh, normalillo',
  'No me dais faena ☹️',
  'Mañana quiero ver más raids eh',
  'Hoy no me he puesto cachonda 😤',
  'Pasable.'
]

const raidsMsgs1 = [
  '🥴',
  'Necessita Millorar',
  '¡A ver esos lechugazos mejicanos!',
  'Toca pasar por caja para mañana',
  'Flojillo ehh',
  'Panda de vagos',
  '¿Esto es un grupo de raids o de marujas?',
  'A ver esas raaaids @Esloqahy'
]

const getExtraMessage = (raids: number) => {
  if (raids > 60) {
    return _.sample(raidsMsgs100)
  }
  if (raids >= 30) {
    return _.sample(raidsMsgs50)
  }
  if (raids >= 10) {
    return _.sample(raidsMsgs20)
  }
  return _.sample(raidsMsgs1)
}

export const getEnfermosMessage = async (date: string) => {
  const enfermos = await db.getTopRaidParticipants(date)
  if (enfermos && enfermos.length) {
    return `Los enfermos de hoy son:${enfermos.map((e, index) => `\n${index + 1}. ${e.participant} (${e.count})`).join('')}`
  } else {
    return 'No hay enfermos hoy 😳'
  }
}

export const getRaidsMessage = async (date: string) => {
  const raids = await db.getRaids(date)
  if (raids) {
    return `Hoy se ha${raids > 1 ? 'n' : ''} hecho ${raids} raid${raids > 1 ? 's' : ''}\n${getExtraMessage(raids)}`
  }
  else {
    return `No se han hecho raids hoy 😳\n${_.sample(noRaidsMsgs)}`
  }
}