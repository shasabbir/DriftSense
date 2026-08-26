import { describe, expect, it } from 'vitest'
import { formatDeviceCommand, parseDeviceLine } from './serialProtocol'

describe('ESP32 serial protocol', () => {
  it('parses hardware button events', () => {
    expect(parseDeviceLine('BUTTON:1')).toEqual({ type: 'button', button: 1 })
    expect(parseDeviceLine(' button:3 \n')).toEqual({ type: 'button', button: 3 })
  })

  it('rejects unknown serial lines', () => {
    expect(parseDeviceLine('READY')).toBeNull()
    expect(parseDeviceLine('BUTTON:4')).toBeNull()
    expect(parseDeviceLine('BUTTON:1:EXTRA')).toBeNull()
  })

  it('formats extension commands', () => {
    expect(formatDeviceCommand({ type: 'DURATION', minutes: 30 })).toBe('DURATION:30')
    expect(formatDeviceCommand({ type: 'TIME', seconds: 1785 })).toBe('TIME:1785')
    expect(formatDeviceCommand({ type: 'REFLECTION' })).toBe('REFLECTION')
  })
})
