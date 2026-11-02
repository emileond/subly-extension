import { describe, expect, it } from 'vitest'
import pkg from '../package.json'
import { buildManifest } from '../manifest'

describe('manifest', () => {
  const manifest = buildManifest('https://web.subly.app')

  it('asks for the least it needs and only for the Subly site', () => {
    expect(manifest.permissions).toEqual(['storage', 'activeTab', 'scripting'])
    expect(manifest.host_permissions).toEqual(['https://web.subly.app/*'])
    expect(manifest.externally_connectable.matches).toEqual(['https://web.subly.app/*'])
  })

  it('declares no content scripts, so no page is read until the person opens the popup', () => {
    expect(manifest).not.toHaveProperty('content_scripts')
  })

  it('keeps the id-pinning key and uses the package version', () => {
    expect(manifest.key.length).toBeGreaterThan(100)
    expect(manifest.version).toBe(pkg.version)
    expect(manifest.version).toBe('0.1.0')
  })

  it('adds only the local origin of a development build', () => {
    const local = buildManifest('http://localhost:3000')
    expect(local.host_permissions).toEqual(['http://localhost:3000/*'])
    expect(local.externally_connectable.matches).toEqual(['http://localhost:3000/*'])
  })
})
