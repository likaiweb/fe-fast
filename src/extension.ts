import * as vscode from 'vscode'
// import WattStatusBar from './module/wattStatusBar'
import GwStatusBar from './module/gwStatusBar'
import GitLabStatusBar from './module/gitLabStatusBar'
import BnpmStatusBar from './module/bnpmStatusBar'

// let wattStatusBar: any
let gwStatusBar: any
let gitLabStatusBar: any
let bnpmStatusBar: any

export function activate(context: vscode.ExtensionContext) {
  // wattStatusBar = new WattStatusBar(context)
  gwStatusBar = new GwStatusBar(context)
  gitLabStatusBar = new GitLabStatusBar(context)
  bnpmStatusBar = new BnpmStatusBar(context)
}

export function deactivate(context: vscode.ExtensionContext) {
  // wattStatusBar.dispose()
  gwStatusBar.dispose()
  gitLabStatusBar.dispose()
  bnpmStatusBar.dispose()
}
