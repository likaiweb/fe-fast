import * as vscode from 'vscode'
const fs = require('fs-extra')
import { getRootPath } from '../lib/utils'
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
      vscode.commands.registerCommand(this._gitLabCommandId, async () => {
        const projectPath = await this.getOriginPath()
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
    const projectPath = await this.getOriginPath()
    if (!projectPath) {
      return this.gitLabStatusBarItem?.hide()
    }
    this.gitLabStatusBarItem?.show()
  }

  dispose() {
    this.gitLabStatusBarItem?.dispose()
  }
}
