const execa = require('execa')

export const run = async (bin: string, args: string[]) => {
  const { stdout } = await execa(bin, args)
  return stdout
}
