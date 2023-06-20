import * as vscode from 'vscode'
import { getRootPath, run } from '../lib/utils'
import { BranchSummary, SimpleGit } from 'simple-git'
import { GIT_LAB_URL, GW_URL, buIdEnum } from '../lib/config'
const fs = require('fs-extra')
const git = require('simple-git')
const betterOpn = require('better-opn')

// merge状态
enum EMergeStatus {
  INIT = 0, // 初始化
  START = 1, // 开始合并
  CONTINUE = 2, // 继续合并
  REQUEST = 3, // 合并请求
  RUNNING = 4, // 运行中
}

const MERGE_TO = '_merge_to_'

export default class MergeBar {
  private _content: vscode.ExtensionContext
  public mergeBarItem: vscode.StatusBarItem
  private _mergeCommandId: string
  private _timer: any
  private _rootPath: string
  private _mergeStatus: EMergeStatus
  private _simpleGit: SimpleGit

  constructor(context: vscode.ExtensionContext) {
    this._content = context
    this._mergeCommandId = 'fe-fast.merge'
    this.mergeBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 97)
    this._rootPath = getRootPath()
    this._mergeStatus = EMergeStatus.INIT
    this._simpleGit = git(this._rootPath)
    this.init()
  }
  // 初始化
  init() {
    // 添加订阅
    this._content.subscriptions.push(
      // bar点击事件
      vscode.commands.registerCommand(this._mergeCommandId, async () => {
        if (this._mergeStatus === EMergeStatus.START) {
          // 开始合并：显示分支列表
          const branch: BranchSummary = await this._simpleGit.branch()
          const branchList = branch.all
          const items = branchList.filter(v => !v.includes('remotes') && v !== branch.current).map(v => ({ label: v }))
          vscode.window.showQuickPick(items).then(this.onSelectChange.bind(this))
        } else if (this._mergeStatus === EMergeStatus.CONTINUE) {
          // 继续合并
          try {
            await run('git rebase --continue', this._rootPath)
            this.startMergeRequest()
          } catch (error) {
            vscode.window.showWarningMessage('请解决冲突，并作为新的commit提交代码！')
          }
        } else if (this._mergeStatus === EMergeStatus.REQUEST) {
          // 合并请求
          this.startMergeRequest()
        }
      })
    )
    this.mergeBarItem.text = ''
    this.mergeBarItem.command = this._mergeCommandId
    this._content.subscriptions.push(this.mergeBarItem)
    this.changeMergeStatus()
    this._content.subscriptions.push(vscode.workspace.onDidChangeConfiguration(this.onConfigurationChanged.bind(this)))
  }
  // 配置变更，自动刷新开启，定时获取git装填
  onConfigurationChanged() {
    const autoRefresh = vscode.workspace.getConfiguration('git')?.get('autorefresh')
    if (autoRefresh) {
      this._timer && clearInterval(this._timer)
      this._timer = setInterval(this.changeMergeStatus.bind(this), 3000)
    } else {
      this._timer && clearInterval(this._timer)
    }
  }
  // 改变merge状态
  async changeMergeStatus() {
    const branch = await this.getCurrentBranchStr()
    if (branch) {
      if (branch.includes(MERGE_TO)) {
        this.mergeBarItem.text = '合并请求提交'
        this._mergeStatus = EMergeStatus.REQUEST
      } else {
        this.mergeBarItem.text = '合并代码至'
        this._mergeStatus = EMergeStatus.START
      }
      this.mergeBarItem.show()
    } else {
      if (this.isRebasing()) {
        this.mergeBarItem.text = '继续合并'
        this._mergeStatus = EMergeStatus.CONTINUE
        this.mergeBarItem.show()
      } else {
        this._mergeStatus = EMergeStatus.INIT
        this.mergeBarItem.hide()
      }
    }
  }
  // 是否正在变基
  isRebasing() {
    const rebaseDirs = ['/.git/rebase-apply', '/.git/rebase-merge']
    for (const dir of rebaseDirs) {
      if (fs.existsSync(this._rootPath + dir)) {
        return true
      }
    }
    return false
  }
  // 获取当前分支，非分支返回空
  async getCurrentBranchStr() {
    try {
      const data = await fs.readFileSync(this._rootPath + '/.git/HEAD')
      const branch = data.toString().trim()
      const reg = /refs\/heads\/(.+)$/
      const match = branch.match(reg)
      if (match) {
        return match[1]
      } else {
        return ''
      }
    } catch (error) {
      return ''
    }
  }
  // 目标分支选择
  async onSelectChange(e: vscode.QuickPickItem | undefined) {
    if (e) {
      if ((await this._simpleGit.status()).isClean()) {
        try {
          this.mergeBarItem.text = `$(sync~spin)正在合并`
          this._mergeStatus = EMergeStatus.RUNNING
          const branch: BranchSummary = await this._simpleGit.branch()
          await run(`git checkout ${e.label}`, this._rootPath)
          await run(`git pull`, this._rootPath)
          await run(`git checkout ${branch.current}`, this._rootPath)
          const newBranch = `${branch.current}${MERGE_TO}${e.label}`
          if (branch.all.find(v => v === newBranch)) {
            await run(`git checkout ${newBranch}`, this._rootPath)
            await run(`git merge ${branch.current}`, this._rootPath)
          } else {
            await run(`git checkout -b ${branch.current}${MERGE_TO}${e.label}`, this._rootPath)
          }
        } catch (error) {
          console.log('拉取分支', error)
          this.mergeBarItem.text = '合并代码至'
          this._mergeStatus = EMergeStatus.START
          vscode.window.showWarningMessage('请确保目标分支代码已全部提交')
          return
        }
        try {
          await run(`git rebase ${e.label}`, this._rootPath)
          // rebase没问题，直接合并
          this.startMergeRequest()
        } catch (error) {
          this.mergeBarItem.text = '合并请求提交'
          this._mergeStatus = EMergeStatus.REQUEST
          vscode.window.showWarningMessage('请解决冲突，并作为新的commit提交代码！')
        }
      } else {
        vscode.window.showWarningMessage('合并前，请先提交你的代码！')
      }
    }
  }
  // 开始合并请求
  async startMergeRequest() {
    this.mergeBarItem.text = '合并请求提交'
    this._mergeStatus = EMergeStatus.REQUEST
    if ((await this._simpleGit.status()).isClean()) {
      // 当前分支
      const branch: BranchSummary = await this._simpleGit.branch()
      // 目标分支
      const target = branch.current.split(MERGE_TO)[1]
      try {
        await run(`git push --set-upstream origin ${branch.current}`, this._rootPath)
      } catch (error) {
        vscode.window.showWarningMessage('远程已由同名合并分支，请变更资源分支名称，再进行重新合并')
        return
      }

      const pkg = fs.readJsonSync(this._rootPath + '/package.json')
      const { name, isaac } = pkg
      if (!name || !isaac?.buPrefix) {
        const projectPath = await this.getOriginPath()
        const uri = `${GIT_LAB_URL}/${projectPath}/merge_requests/new?merge_request[source_branch]=${branch.current}&merge_request[target_branch]=${target}`
        betterOpn(uri)
      } else {
        // 创建gw请求
        const env = await this.getEnv()
        const uri = `${GW_URL}?buId=${
          buIdEnum[isaac?.buPrefix as number]
        }&applicationName=${name}&env=${env}&merge_source_branch=${branch.current}&merge_target_branch=${target}`
        betterOpn(uri)
      }
    } else {
      vscode.window.showWarningMessage('有代码没有提交')
    }
  }

  // 获取开发环境
  async getEnv() {
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
  // 获取远程地址
  async getOriginPath() {
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
  dispose() {
    this.mergeBarItem?.dispose()
    this._timer && clearInterval(this._timer)
  }
}
