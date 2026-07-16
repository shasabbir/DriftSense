import type { RuntimeRequest } from './types'

export async function sendRuntimeMessage<T>(message: RuntimeRequest): Promise<T> {
  if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) {
    throw new Error('This action is available when DriftSense is loaded as a Chrome extension.')
  }
  return chrome.runtime.sendMessage(message) as Promise<T>
}
