import * as vscode from 'vscode'
import WattStatusBar from './module/wattStatusBar'
import OriginStatusBar from './module/OriginStatusBar'
import BnpmStatusBar from './module/BnpmStatusBar'

let wattStatusBar: any
let originStatusBar: any
let bnpmStatusBar: any

export function activate(context: vscode.ExtensionContext) {
  wattStatusBar = new WattStatusBar(context)
  originStatusBar = new OriginStatusBar(context)
  bnpmStatusBar = new BnpmStatusBar(context)
}

export function deactivate(context: vscode.ExtensionContext) {
  wattStatusBar.dispose()
  originStatusBar.dispose()
  bnpmStatusBar.dispose()
}
