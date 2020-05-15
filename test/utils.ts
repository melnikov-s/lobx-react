import { enforceActions } from "lobx"

export function resetlobx(): void {
    enforceActions(false)
}

declare namespace global {
    let __DEV__: boolean
}
export function enableDevEnvironment() {
    global.__DEV__ = true
    return function() {
        global.__DEV__ = false
    }
}
