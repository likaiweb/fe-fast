import * as vscode from 'vscode'
import GwStatusBar from './module/gwStatusBar'
import GitLabStatusBar from './module/gitLabStatusBar'
import BnpmStatusBar from './module/bnpmStatusBar'
import MergeBar from './module/MergeBar'

let gwStatusBar: any
let gitLabStatusBar: any
let bnpmStatusBar: any
let mergeBar: any

export function activate(context: vscode.ExtensionContext) {
  gwStatusBar = new GwStatusBar(context)
  gitLabStatusBar = new GitLabStatusBar(context)
  bnpmStatusBar = new BnpmStatusBar(context)
  mergeBar = new MergeBar(context)
}

export function deactivate(context: vscode.ExtensionContext) {
  gwStatusBar.dispose()
  gitLabStatusBar.dispose()
  bnpmStatusBar.dispose()
  mergeBar.dispose()
}
