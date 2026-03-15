import * as http from 'node:http'
import { URL } from 'node:url'
import { OAuth2Client } from 'google-auth-library'
import type { AppConfig } from '../config.js'
import type { OAuthCredentials, OAuthTokens } from './types.js'
import { writeCredentials, readCredentials } from './token-store.js'
import {
  EMBEDDED_CLIENT_ID,
  EMBEDDED_CLIENT_SECRET,
} from './oauth-credentials.js'
import {
  renderSuccessPage,
  renderErrorPage,
  renderMissingCodePage,
} from './oauth-pages.js'

interface OAuthCallbackResult {
  readonly code: string
}

function getClientCredentials(config: AppConfig): {
  clientId: string
  clientSecret: string
} {
  return {
    clientId: config.envClientId ?? EMBEDDED_CLIENT_ID,
    clientSecret: config.envClientSecret ?? EMBEDDED_CLIENT_SECRET,
  }
}

function createOAuth2Client(config: AppConfig): OAuth2Client {
  const { clientId, clientSecret } = getClientCredentials(config)
  return new OAuth2Client(clientId, clientSecret, config.oauthRedirectUri)
}

export function generateAuthUrl(config: AppConfig): string {
  const client = createOAuth2Client(config)
  return client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [config.oauthScope],
  })
}

export function startCallbackServer(
  port: number
): Promise<OAuthCallbackResult> {
  return new Promise((resolve, reject) => {
    let settled = false
    let timeoutId: ReturnType<typeof setTimeout>

    function settle(
      action: () => void,
      server: http.Server
    ): void {
      if (settled) return
      settled = true
      clearTimeout(timeoutId)
      server.close()
      action()
    }

    const server = http.createServer((req, res) => {
      if (!req.url) {
        res.writeHead(400)
        res.end('Bad request')
        return
      }

      const url = new URL(req.url, `http://localhost:${port}`)

      if (url.pathname !== '/oauth/callback') {
        res.writeHead(404)
        res.end('Not found')
        return
      }

      const code = url.searchParams.get('code')
      const error = url.searchParams.get('error')

      if (error) {
        res.writeHead(200, { 'Content-Type': 'text/html' })
        res.end(renderErrorPage(error))
        settle(() => reject(new Error(`OAuth error: ${error}`)), server)
        return
      }

      if (!code) {
        res.writeHead(400, { 'Content-Type': 'text/html' })
        res.end(renderMissingCodePage())
        settle(
          () => reject(new Error('No authorization code received')),
          server
        )
        return
      }

      res.writeHead(200, { 'Content-Type': 'text/html' })
      res.end(renderSuccessPage())
      settle(() => resolve({ code }), server)
    })

    server.on('error', (err) => {
      settle(() => reject(err), server)
    })

    server.listen(port, '127.0.0.1', () => {
      // Server started
    })

    timeoutId = setTimeout(() => {
      settle(
        () =>
          reject(new Error('OAuth callback timed out after 120 seconds')),
        server
      )
    }, 120_000)
  })
}

export async function exchangeCodeForTokens(
  config: AppConfig,
  code: string
): Promise<OAuthTokens> {
  const client = createOAuth2Client(config)
  const { tokens } = await client.getToken(code)

  if (!tokens.access_token || !tokens.refresh_token) {
    throw new Error('Failed to obtain tokens from Google')
  }

  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiryDate: tokens.expiry_date ?? Date.now() + 3600_000,
    tokenType: tokens.token_type ?? 'Bearer',
  }
}

export async function refreshAccessToken(
  config: AppConfig,
  refreshToken: string
): Promise<OAuthTokens> {
  const client = createOAuth2Client(config)
  client.setCredentials({ refresh_token: refreshToken })
  const { credentials } = await client.refreshAccessToken()

  if (!credentials.access_token) {
    throw new Error('Failed to refresh access token')
  }

  return {
    accessToken: credentials.access_token,
    refreshToken: credentials.refresh_token ?? refreshToken,
    expiryDate: credentials.expiry_date ?? Date.now() + 3600_000,
    tokenType: credentials.token_type ?? 'Bearer',
  }
}

export async function ensureValidTokens(
  config: AppConfig
): Promise<OAuthTokens> {
  const stored = await readCredentials(config.credentialsPath)

  if (!stored || stored.type !== 'oauth') {
    throw new Error('No OAuth credentials found. Run setup first.')
  }

  const { tokens } = stored
  const isExpired =
    tokens.expiryDate < Date.now() + config.tokenExpiryBufferMs

  if (!isExpired) {
    return tokens
  }

  const refreshed = await refreshAccessToken(config, tokens.refreshToken)
  const updatedCredentials: OAuthCredentials = {
    type: 'oauth',
    tokens: refreshed,
  }
  await writeCredentials(config.credentialsPath, updatedCredentials)

  return refreshed
}

export async function performOAuthFlow(config: AppConfig): Promise<void> {
  const authUrl = generateAuthUrl(config)
  const serverPromise = startCallbackServer(config.oauthCallbackPort)

  const open = (await import('open')).default
  await open(authUrl)

  const { code } = await serverPromise
  const tokens = await exchangeCodeForTokens(config, code)

  const credentials: OAuthCredentials = {
    type: 'oauth',
    tokens,
  }
  await writeCredentials(config.credentialsPath, credentials)
}
