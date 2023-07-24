import * as vscode from 'vscode'
const fs = require('fs-extra')
import { getRootPath, getOriginPath, isYupaopao } from '../lib/utils'
import { GIT_LAB_URL } from '../lib/config'
const betterOpn = require('better-opn')

export default class GitLabStatusBar {
  private _content: vscode.ExtensionContext
  private _gitLabCommandId: string
  public gitLabStatusBarItem: vscode.StatusBarItem
  private _rootPath: string

  constructor(context: vscode.ExtensionContext) {
    this._content = context
    this._gitLabCommandId = 'fe-fast.openGitLab'
    this.gitLabStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 98)
    this._rootPath = getRootPath()
    this.init()
  }

  async init() {
    if (!(await isYupaopao())) return
    this._content.subscriptions.push(
      vscode.commands.registerCommand(this._gitLabCommandId, async () => {
        const projectPath = await getOriginPath()
        betterOpn(`${GIT_LAB_URL}/${projectPath}`)
      })
    )
    this.gitLabStatusBarItem.text = '项目gitLab'
    this.gitLabStatusBarItem.command = this._gitLabCommandId
    this._content.subscriptions.push(this.gitLabStatusBarItem)
    this.showStatusBar()
    this._content.subscriptions.push(vscode.window.onDidChangeTextEditorSelection(this.showStatusBar.bind(this)))
  }

  private async showStatusBar() {
    if (!fs.existsSync(this._rootPath + '/.git/config')) {
      return this.gitLabStatusBarItem?.hide()
    }
    this.gitLabStatusBarItem?.show()
  }

  dispose() {
    this.gitLabStatusBarItem?.dispose()
  }
}
