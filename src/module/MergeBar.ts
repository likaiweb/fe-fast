import * as vscode from 'vscode'
import { getRootPath, run, isYupaopao, getOriginPath } from '../lib/utils'
import { BranchSummary, SimpleGit } from 'simple-git'
import { GIT_LAB_URL, GW_URL, buIdEnum, MERGE_TO } from '../lib/config'
const fs = require('fs-extra')
const git = require('simple-git')
const betterOpn = require('better-opn')

// merge状态
enum EMergeStatus {
  INIT = 0, // 初始化
  START = 1, // 开始CR流程
  CONTINUE = 2, // 继续合并
  REQUEST = 3, // 创建CR请求
  RUNNING = 4, // 执行中
}

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
  async init() {
    if (!(await isYupaopao())) return
    // 添加订阅
    this._content.subscriptions.push(
      // bar点击事件
      vscode.commands.registerCommand(this._mergeCommandId, async () => {
        if (this._mergeStatus === EMergeStatus.START) {
          // 开始合并：显示分支列表
          const branch: BranchSummary = await this._simpleGit.branch()
          const branchList = branch.all
          const items = branchList
            .filter(v => ['test', 'uat', 'master'].includes(v) && v !== branch.current)
            .map(v => ({ label: v }))
          vscode.window.showQuickPick(items).then(this.onSelectChange.bind(this))
        } else if (this._mergeStatus === EMergeStatus.CONTINUE) {
          // 继续合并
          if ((await this._simpleGit.status()).isClean()) {
            this.mergeBarItem.text = `$(sync~spin)执行中`
            this._mergeStatus = EMergeStatus.RUNNING
            this.startMergeRequest()
          } else {
            this.mergeBarItem.text = `继续合并`
            this._mergeStatus = EMergeStatus.CONTINUE
            vscode.window.showWarningMessage('请解决冲突，并作为新的commit提交代码！')
          }
        } else if (this._mergeStatus === EMergeStatus.REQUEST) {
          // 合并请求
          this.mergeBarItem.text = `$(sync~spin)执行中`
          this._mergeStatus = EMergeStatus.RUNNING
          this.startMergeRequest()
        }
      })
    )
    this.mergeBarItem.text = ''
    this.mergeBarItem.command = this._mergeCommandId
    this._content.subscriptions.push(this.mergeBarItem)
    this.changeMergeStatus()
    this._timer && clearInterval(this._timer)
    this._timer = setInterval(this.changeMergeStatus.bind(this), 3000)
  }
  // 改变merge状态
  async changeMergeStatus() {
    if (this._mergeStatus === EMergeStatus.RUNNING) return
    const branch: BranchSummary = await this._simpleGit.branch()
    if (branch.current) {
      if (branch.current.includes(MERGE_TO)) {
        if ((await this._simpleGit.status()).isClean()) {
          this.mergeBarItem.text = '创建CR请求'
          this._mergeStatus = EMergeStatus.REQUEST
        } else {
          this.mergeBarItem.text = '继续合并'
          this._mergeStatus = EMergeStatus.CONTINUE
        }
      } else {
        this.mergeBarItem.text = '开始CR流程'
        this._mergeStatus = EMergeStatus.START
      }
      this.mergeBarItem.show()
    } else {
      this._mergeStatus = EMergeStatus.INIT
      this.mergeBarItem.hide()
    }
  }
  // 目标分支选择
  async onSelectChange(e: vscode.QuickPickItem | undefined) {
    if (e) {
      if ((await this._simpleGit.status()).isClean()) {
        try {
          this.mergeBarItem.text = `$(sync~spin)执行中`
          this._mergeStatus = EMergeStatus.RUNNING
          // 切换至目标分支拉取代码
          const branch: BranchSummary = await this._simpleGit.branch()
          await run(`git checkout ${e.label}`, this._rootPath)
          await run(`git pull`, this._rootPath)
          // 切换回当前资源分支
          await run(`git checkout ${branch.current}`, this._rootPath)
          // 代码合并到merge分支或者新建merge分支
          const newBranch = `${branch.current}${MERGE_TO}${e.label}`
          if (branch.all.find(v => v === newBranch)) {
            await run(`git checkout ${newBranch}`, this._rootPath)
            await run(`git merge ${branch.current}`, this._rootPath)
          } else {
            await run(`git checkout -b ${branch.current}${MERGE_TO}${e.label}`, this._rootPath)
          }
        } catch (error) {
          this.mergeBarItem.text = '开始CR流程'
          this._mergeStatus = EMergeStatus.START
          vscode.window.showWarningMessage('请确保目标分支代码已全部提交')
          return
        }
        try {
          await run(`git merge ${e.label}`, this._rootPath)
          this.startMergeRequest()
        } catch (error) {
          this.mergeBarItem.text = '创建CR请求'
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
    if ((await this._simpleGit.status()).isClean()) {
      // 当前分支
      const branch: BranchSummary = await this._simpleGit.branch()
      // 目标分支
      const target = branch.current.split(MERGE_TO)[1]
      try {
        await run(`git push --set-upstream origin ${branch.current}`, this._rootPath)
      } catch (error) {
        this.mergeBarItem.text = '创建CR请求'
        this._mergeStatus = EMergeStatus.REQUEST
        vscode.window.showWarningMessage('远程已由同名合并分支，请变更资源分支名称，再进行重新合并')
        return
      }

      const pkg = fs.readJsonSync(this._rootPath + '/package.json')
      const { name, isaac } = pkg
      if (!name || !isaac?.buPrefix) {
        const projectPath = await getOriginPath()
        const uri = `${GIT_LAB_URL}/${projectPath}/merge_requests/new?merge_request[source_branch]=${branch.current}&merge_request[target_branch]=${target}`
        betterOpn(uri)
      } else {
        // 创建gw请求
        const env = await this.getEnv(target)
        const uri = `${GW_URL}?buId=${
          buIdEnum[isaac?.buPrefix as number]
        }&applicationName=${name}&env=${env}&mergeSourceBranch=${branch.current}`
        betterOpn(uri)
      }
      this.mergeBarItem.text = '创建CR请求'
      this._mergeStatus = EMergeStatus.REQUEST
    } else {
      vscode.window.showWarningMessage('有代码没有提交')
    }
  }
  // 获取开发环境
  async getEnv(target: string) {
    if (target.includes('master')) {
      return 2
    } else if (target.includes('uat')) {
      return 1
    } else {
      return 0
    }
  }
  dispose() {
    this.mergeBarItem?.dispose()
    this._timer && clearInterval(this._timer)
  }
}
