import pkg from './package.json' with { type: 'json' }

// The public half of the extension's signing key. It pins the extension id, which the web app needs to message us.
const KEY =
  'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAg7VAlb587h62TtIP97SKA9tb/kd28RQnGt6T/3pP2JXy8eOrWLiw+Odbel6Ibbkzf+LpZGgS/82QeeCZkab86SkKx9rDnyY3rCz1dny5PeCYMzZx2t2980lBwYzK0UUmKcUrOswUTM7Ot0D2SWGuu4S6JOpfFVKeuzIDfbBpXgN6z8rIXlIoLqTpFqmxhG9CZe2vPmaulS5Aljdxfza8iJ49ledN6tlh8b/trWFkjGldpvG6hVBQLBW4lsvfF7SwWF09COv2cwjvLCBEg/NfZaXo3tKAw3i97wf0lj4OuWjf6tvYdbKbXYK7cHPFZ1msuKjrlesVIwWsCNth3Vbs9wIDAQAB'

/** Origin of the Subly web app this build talks to (the host the manifest grants access to) */
export function buildManifest(baseUrl: string) {
  const origin = new URL(baseUrl).origin
  const pattern = `${origin}/*`
  return {
    manifest_version: 3,
    name: 'Subly',
    description: 'Add the subscription on the page you are viewing to Subly.',
    key: KEY,
    version: pkg.version,
    action: {
      default_popup: 'index.html',
      default_title: 'Add this page to Subly',
    },
    permissions: ['storage', 'activeTab', 'scripting'],
    host_permissions: [pattern],
    background: { service_worker: 'sw.js', type: 'module' },
    externally_connectable: { matches: [pattern] },
    icons: {
      '16': 'icon-512.png',
      '48': 'icon-512.png',
      '128': 'icon-512.png',
    },
  }
}
