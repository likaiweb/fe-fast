const execa = require('execa')
const fs = require('fs-extra')
import * as vscode from 'vscode'

export const run = async (command: string, path?: string) => {
  const { stdout } = await execa.command(command, { cwd: path || undefined })
  return stdout
}

// 获取当前路径
export const getRootPath = () => {
  const workspaceFolders: any = vscode.workspace.workspaceFolders
  return workspaceFolders[0]?.uri?.fsPath
}

// 获取远程分支地址
export const getOriginPath = async () => {
  const fileData = await fs.readFileSync(getRootPath() + '/.git/config')
  const gitConfigArr = fileData.toString().split('\n')
  const index = gitConfigArr.indexOf('[remote "origin"]')
  const gitUrlStr = gitConfigArr[index + 1]
  if (!gitUrlStr.includes('git.yupaopao.com')) {
    return ''
  }
  const reg = /.*git\.yupaopao\.com\:(.*)\.git/g
  const result: RegExpExecArray | null = reg.exec(gitUrlStr)
  return result ? result[1] : ''
}

// 是否是鱼泡泡内部项目
export const isYupaopao = async () => {
  const path = await getOriginPath()
  return !!path
}
