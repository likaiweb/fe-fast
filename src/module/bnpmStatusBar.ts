import * as vscode from 'vscode'
const fs = require('fs-extra')
import { run } from '../lib/utils'

export default class BnpmStatusBar {
  private _content: vscode.ExtensionContext
  public bnpmStatusBarItem: vscode.StatusBarItem | undefined
  private _bnpmCommandId: string
  private _rootPath: string

  constructor(context: vscode.ExtensionContext) {
    this._content = context
    this._bnpmCommandId = 'fe-fast.bnpm'
    this.bnpmStatusBarItem = undefined
    this._rootPath = ''
    this.init()
  }
  init() {
    this._content.subscriptions.push(
      vscode.commands.registerCommand(this._bnpmCommandId, async () => {
        // do something
        vscode.window.showInformationMessage('bnpm已挂载，更多操作敬请期待...')
      })
    )

    this.bnpmStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100)
    this.bnpmStatusBarItem.text = 'bnpm'
    this.bnpmStatusBarItem.command = this._bnpmCommandId
    this._content.subscriptions.push(this.bnpmStatusBarItem)

    this.showStatusBar()
    this._content.subscriptions.push(vscode.window.onDidChangeTextEditorSelection(this.showStatusBar))
  }

  private async showStatusBar() {
    const workspaceFolders: any = vscode.workspace.workspaceFolders
    this._rootPath = workspaceFolders[0]?.uri?.fsPath
    const path = this._rootPath + '/node_modules'
    const res: string = await run('mount', [])
    if (!res) {
      return this.bnpmStatusBarItem?.hide()
    }
    const mountList = res.split('\n')
    const reg = /on\s(\S+)/
    // 识别mount是否存在路径
    if (
      mountList.find((v: string) => {
        const itemPath = reg.exec(v) || []
        return itemPath[1] === path
      })
    ) {
      this.bnpmStatusBarItem?.show()
    } else {
      this.bnpmStatusBarItem?.hide()
    }
  }
  dispose() {
    this.bnpmStatusBarItem?.dispose()
  }
}
