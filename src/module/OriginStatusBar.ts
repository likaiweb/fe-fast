import * as vscode from 'vscode'
const fs = require('fs-extra')
const betterOpn = require('better-opn')

export default class OriginStatusBar {
  private _content: vscode.ExtensionContext
  private _originCommandId: string
  public originStatusBarItem: vscode.StatusBarItem | undefined
  private _originHost: string
  private _rootPath: string

  constructor(context: vscode.ExtensionContext) {
    this._content = context
    this._originCommandId = 'fe-fast.openGitOrigin'
    this.originStatusBarItem = undefined
    this._originHost = 'https://git.yupaopao.com'
    this._rootPath = ''
    this.init()
  }

  private async getOriginBranch() {
    const fileData = await fs.readFileSync(this._rootPath + '/.git/HEAD')
    const branch = fileData.toString()
    if (branch.includes('master') || branch.includes('main')) {
      return 'master'
    } else if (branch.includes('uat')) {
      return 'uat'
    } else if (branch.includes('test')) {
      return 'test'
    } else {
      return ''
    }
  }

  private async getOriginPath() {
    const fileData = await fs.readFileSync(this._rootPath + '/.git/config')
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

  init() {
    this._content.subscriptions.push(
      vscode.commands.registerCommand(this._originCommandId, async () => {
        const projectPath = await this.getOriginPath()
        // const branch = await this.getOriginBranch()
        betterOpn(`${this._originHost}/${projectPath}`)
      })
    )

    this.originStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 101)
    this.originStatusBarItem.text = '项目gitLab'
    this.originStatusBarItem.command = this._originCommandId
    this._content.subscriptions.push(this.originStatusBarItem)
    this.showStatusBar()
    this._content.subscriptions.push(vscode.window.onDidChangeTextEditorSelection(this.showStatusBar))
  }

  private async showStatusBar() {
    const workspaceFolders: any = vscode.workspace.workspaceFolders
    this._rootPath = workspaceFolders[0].uri.fsPath
    if (!fs.existsSync(this._rootPath + '/.git/config')) {
      return this.originStatusBarItem?.hide()
    }
    const projectPath = await this.getOriginPath()
    if (!projectPath) {
      return this.originStatusBarItem?.hide()
    }
    this.originStatusBarItem?.show()
  }

  dispose() {
    this.originStatusBarItem?.dispose()
  }
}
