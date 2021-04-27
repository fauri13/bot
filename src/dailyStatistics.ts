import _ from "underscore"
import db from "./database"

const noRaidsMsgs = [
  'Panda de vagos',
  'Ka pasao?',
  'Yo me voy'
]

const raidsMsgs100 = [
  '¡Estáis que os salís!',
  'Guau. 🙀'
]

const raidsMsgs50 = [
  'Está bien.',
  'Enhorabuena',
  'Se nota que estamos de vacaciones 😏'
]

const raidsMsgs20 = [
  'No está mal, pero podemos mejorar',
  'Meh, normalillo'
]

const raidsMsgs1 = [
  '🥴',
  'Necessita Millorar',
  '¡A ver esos lechugazos mejicanos!',
  'Flojillo ehh'
]

const getExtraMessage = (raids: number) => {
  if (raids > 100) {
    return _.sample(raidsMsgs100)
  }
  if (raids >= 50) {
    return _.sample(raidsMsgs50)
  }
  if (raids >= 20) {
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