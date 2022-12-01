import * as vscode from 'vscode'
import { buIdEnum } from '../config'
const fs = require('fs-extra')
const betterOpn = require('better-opn')

export default class WattStatusBar {
  private _content: vscode.ExtensionContext
  public wattStatusBarItem: vscode.StatusBarItem | undefined
  private _wattUrl: string
  private _wattCommandId: string

  constructor(context: vscode.ExtensionContext) {
    this._content = context
    this._wattCommandId = 'fe-fast.openWatt'
    this._wattUrl = `https://watt-fe.yupaopao.com/#/deploy/application-release`
    this.wattStatusBarItem = undefined
    this.init()
  }

  private wattUrl(buId: number, projectName: string) {
    return `${this._wattUrl}?buId=${buId}&applicationName=${projectName}`
  }

  init() {
    this._content.subscriptions.push(
      vscode.commands.registerCommand(this._wattCommandId, fileUri => {
        const workspaceFolders: any = vscode.workspace.workspaceFolders
        const rootPath = workspaceFolders[0].uri.fsPath
        const pkgPath = rootPath + '/package.json'
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
        betterOpn(this.wattUrl(buId, projectName))
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
