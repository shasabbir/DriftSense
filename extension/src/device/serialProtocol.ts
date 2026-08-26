export type DeviceButtonEvent = { type: 'button'; button: 1 | 2 | 3 }

export type DeviceCommand =
  | { type: 'READY' }
  | { type: 'DURATION'; minutes: number }
  | { type: 'START' }
  | { type: 'TIME'; seconds: number }
  | { type: 'TIME_REACHED' }
  | { type: 'REFLECTION' }
  | { type: 'COMPLETE' }
  | { type: 'ALERT_ON' }
  | { type: 'ALERT_OFF' }

export function parseDeviceLine(line: string): DeviceButtonEvent | null {
  const normalized = line.trim().toUpperCase()
  const match = /^BUTTON:([123])$/.exec(normalized)
  if (!match) return null
  return { type: 'button', button: Number(match[1]) as 1 | 2 | 3 }
}

export function formatDeviceCommand(command: DeviceCommand): string {
  if (command.type === 'DURATION') return `DURATION:${Math.max(0, Math.round(command.minutes))}`
  if (command.type === 'TIME') return `TIME:${Math.max(0, Math.round(command.seconds))}`
  return command.type
}
