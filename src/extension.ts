import * as vscode from 'vscode'
import WattStatusBar from './module/wattStatusBar'

let wattStatusBar: any

export function activate(context: vscode.ExtensionContext) {
  wattStatusBar = new WattStatusBar(context)
}

export function deactivate(context: vscode.ExtensionContext) {
  wattStatusBar.dispose()
}
