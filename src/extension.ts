import * as vscode from 'vscode'
import WattStatusBar from './module/wattStatusBar'
import OriginStatusBar from './module/OriginStatusBar'

let wattStatusBar: any
let originStatusBar: any

export function activate(context: vscode.ExtensionContext) {
  wattStatusBar = new WattStatusBar(context)
  originStatusBar = new OriginStatusBar(context)
}

export function deactivate(context: vscode.ExtensionContext) {
  wattStatusBar.dispose()
  originStatusBar.dispose()
}
