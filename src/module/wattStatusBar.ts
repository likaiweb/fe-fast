import * as vscode from 'vscode'
import { buIdEnum } from '../lib/config'
const fs = require('fs-extra')
const betterOpn = require('better-opn')

export default class WattStatusBar {
  private _content: vscode.ExtensionContext
  public wattStatusBarItem: vscode.StatusBarItem | undefined
  private _wattUrl: string
  private _wattCommandId: string
  private _rootPath: string

  constructor(context: vscode.ExtensionContext) {
    this._content = context
    this._wattCommandId = 'fe-fast.openWatt'
    this._wattUrl = `https://watt-fe.yupaopao.com/#/deploy/application-release`
    this.wattStatusBarItem = undefined
    this._rootPath = ''
    this.init()
  }

  private getWattUrl(buId: number, projectName: string, env: number) {
    return `${this._wattUrl}?buId=${buId}&applicationName=${projectName}&env=${env}`
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
      vscode.commands.registerCommand(this._wattCommandId, async () => {
        const workspaceFolders: any = vscode.workspace.workspaceFolders
        this._rootPath = workspaceFolders[0].uri.fsPath
        const pkgPath = this._rootPath + '/package.json'
        if (!fs.pathExistsSync(pkgPath)) {
          return vscode.window.showErrorMessage('请打开项目文件夹')
        }
        const pkg = fs.readJsonSync(pkgPath)
        const projectName = pkg.name
        const buPrefix = pkg.isaac?.buPrefix
        if (!projectName || !buPrefix) {
          return vscode.window.showErrorMessage('这不是watt项目')
        }
        const buId = buIdEnum[buPrefix as number]

        const env = await this.getEnv()
        const uri = this.getWattUrl(buId, projectName, env)
        betterOpn(uri)
      })
    )

    this.wattStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100)
    this.wattStatusBarItem.text = 'watt发布'
    this.wattStatusBarItem.command = this._wattCommandId
    this._content.subscriptions.push(this.wattStatusBarItem)

    this.wattStatusBarItem.show()
  }
  dispose() {
    this.wattStatusBarItem?.dispose()
  }
}
