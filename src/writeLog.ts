const debug = process.env.DEBUG_TRACES === 'true'

export const writeLog = (message: any) => {
  if (debug) {
    console.log(message)
  }
}
