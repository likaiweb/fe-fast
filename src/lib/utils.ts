const execa = require('execa')
import * as vscode from 'vscode'

export const run = async (command: string, path?: string) => {
  const { stdout } = await execa.command(command, { cwd: path || undefined })
  return stdout
}

export const getRootPath = () => {
  const workspaceFolders: any = vscode.workspace.workspaceFolders
  return workspaceFolders[0]?.uri?.fsPath
}
