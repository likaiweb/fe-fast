import * as vscode from 'vscode'
import { GW_URL, buIdEnum } from '../lib/config'
import { getRootPath } from '../lib/utils'
const fs = require('fs-extra')
const betterOpn = require('better-opn')

export default class GwStatusBar {
  private _content: vscode.ExtensionContext
  public gwStatusBarItem: vscode.StatusBarItem
  private _gwCommandId: string
  private _rootPath: string

  constructor(context: vscode.ExtensionContext) {
    this._content = context
    this._gwCommandId = 'fe-fast.openGw'
    this.gwStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 99)
    this._rootPath = getRootPath()
    this.init()
  }
  private getGwUrl(buId: number, projectName: string, env: number) {
    return `${GW_URL}?buId=${buId}&applicationName=${projectName}&env=${env}`
  }

  private async getEnv() {
    try {
      const data = await fs.readFileSync(this._rootPath + '/.git/HEAD')
      const branch = data.toString()
      if (branch.includes('master') || branch.includes('main')) {
        return 2
      } else if (branch.includes('uat')) {
        return 1
      } else {
        return 0
      }
    } catch (error) {
      return 0
    }
  }
  init() {
    this._content.subscriptions.push(
      vscode.commands.registerCommand(this._gwCommandId, async () => {
        const pkg = fs.readJsonSync(this._rootPath + '/package.json')
        const { name, isaac } = pkg
        const buPrefix = isaac?.buPrefix
        const env = await this.getEnv()
        const uri = this.getGwUrl(buIdEnum[buPrefix as number], name, env)
        betterOpn(uri)
      })
    )

    this.gwStatusBarItem.text = 'gw发布'
    this.gwStatusBarItem.command = this._gwCommandId
    this._content.subscriptions.push(this.gwStatusBarItem)

    this.showStatusBar()
    this._content.subscriptions.push(vscode.window.onDidChangeTextEditorSelection(this.showStatusBar.bind(this)))
  }

  private async showStatusBar() {
    const pkgPath = this._rootPath + '/package.json'
    if (!fs.pathExistsSync(pkgPath)) {
      return this.gwStatusBarItem?.hide()
    }
    const pkg = fs.readJsonSync(pkgPath)
    const { name, isaac } = pkg
    if (!name || !isaac?.buPrefix) {
      return this.gwStatusBarItem?.hide()
    }
    this.gwStatusBarItem?.show()
  }
  dispose() {
    this.gwStatusBarItem?.dispose()
  }
}
