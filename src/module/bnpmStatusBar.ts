import * as vscode from 'vscode'
import { run, getRootPath } from '../lib/utils'
const betterOpn = require('better-opn')

enum BnpmUseStatus {
  UN_INSTALL = 0, // 环境未安装
  UN_USED = 1, // 项目未使用
  USED = 2, // 项目已使用
  DOWNLOADING = 3, // 下载中
}

export default class BnpmStatusBar {
  private _content: vscode.ExtensionContext
  public bnpmStatusBarItem: vscode.StatusBarItem
  private _bnpmCommandId: string
  private _rootPath: string
  private _bnpmUseStatus: BnpmUseStatus
  private _bnpmDocUrl: string

  constructor(context: vscode.ExtensionContext) {
    this._content = context
    this._bnpmCommandId = 'fe-fast.bnpm'
    this.bnpmStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100)
    this._rootPath = getRootPath()
    this._bnpmUseStatus = BnpmUseStatus.UN_INSTALL
    this._bnpmDocUrl = 'https://docs.dingtalk.com/i/nodes/2X3LRMZdxkAJpjKzzXdbWGgrBYeOq5Ew'
    this.init()
  }
  init() {
    this._content.subscriptions.push(
      vscode.commands.registerCommand(this._bnpmCommandId, async () => {
        if (this._bnpmUseStatus === BnpmUseStatus.DOWNLOADING) {
          return
        }
        if (this._bnpmUseStatus === BnpmUseStatus.UN_INSTALL) {
          betterOpn(this._bnpmDocUrl)
          return
        }
        this.bnpmStatusBarItem.text = '$(sync~spin)bnpm'
        this.bnpmStatusBarItem.color = ''
        this.bnpmStatusBarItem.tooltip = '正在刷新'
        try {
          await run('bnpm i', this._rootPath)
          this.bnpmStatusBarItem.text = '$(check)bnpm'
          this.bnpmStatusBarItem.color = ''
          this.bnpmStatusBarItem.tooltip = '点击刷新'
          vscode.window.showInformationMessage('bnpm挂载完成')
        } catch (error) {
          this.bnpmStatusBarItem.text = '$(warning)bnpm'
          this.bnpmStatusBarItem.color = ''
          this.bnpmStatusBarItem.tooltip = '点击挂载'
          vscode.window.showErrorMessage((error as string).toString())
        }
      })
    )
    this.showStatusBar()
  }

  private async showStatusBar() {
    const path = this._rootPath + '/node_modules'
    const res: string = await run('mount')
    if (!res) {
      return this.bnpmStatusBarItem?.hide()
    }
    try {
      await run('bnpm -V')
      const mountList = res.split('\n')
      const reg = /on\s(\S+)/
      // 识别mount是否存在路径
      if (
        mountList.find((v: string) => {
          const itemPath = reg.exec(v) || []
          return itemPath[1] === path
        })
      ) {
        // 已使用
        this._bnpmUseStatus = BnpmUseStatus.USED
        this.bnpmStatusBarItem.text = '$(check)bnpm'
        this.bnpmStatusBarItem.color = ''
        this.bnpmStatusBarItem.tooltip = '点击刷新'
      } else {
        // 没有挂载
        this._bnpmUseStatus = BnpmUseStatus.UN_USED
        this.bnpmStatusBarItem.text = '$(warning)bnpm'
        this.bnpmStatusBarItem.color = ''
        this.bnpmStatusBarItem.tooltip = '点击挂载'
      }
    } catch (error) {
      this._bnpmUseStatus = BnpmUseStatus.UN_INSTALL
      this.bnpmStatusBarItem.text = '$(error)bnpm'
      this.bnpmStatusBarItem.color = '#ffec3d'
      this.bnpmStatusBarItem.tooltip = '未安装，点击查看使用文档'
      vscode.window.showErrorMessage((error as string).toString())
    }

    this.bnpmStatusBarItem.command = this._bnpmCommandId
    this._content.subscriptions.push(this.bnpmStatusBarItem)
    this.bnpmStatusBarItem?.show()
  }
  dispose() {
    this.bnpmStatusBarItem?.dispose()
  }
}
