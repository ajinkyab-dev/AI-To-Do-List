import { OAuth2Client } from 'google-auth-library'
import config from '../config/env.js'
import prisma from '../db/prisma.js'

let client
let cachedClientId

function ensureClient () {
  if (!config.googleClientId) {
    const error = new Error('GOOGLE_CLIENT_ID is not configured.')
    error.status = 500
    throw error
  }

  if (!client || cachedClientId !== config.googleClientId) {
    client = new OAuth2Client(config.googleClientId)
    cachedClientId = config.googleClientId
  }

  return client
}

export function isGoogleAuthConfigured () {
  return Boolean(config.googleClientId)
}

export async function verifyGoogleIdToken (idToken) {
  if (!idToken || typeof idToken !== 'string') {
    const error = new Error('Missing Google ID token.')
    error.status = 401
    throw error
  }

  const oauthClient = ensureClient()
  const ticket = await oauthClient.verifyIdToken({
    idToken,
    audience: config.googleClientId
  })

  const payload = ticket.getPayload()
  if (!payload?.sub || !payload.email) {
    const error = new Error('Invalid Google token payload.')
    error.status = 401
    throw error
  }

  return payload
}

export async function syncUserFromGooglePayload (payload) {
  const displayName = typeof payload.name === 'string' && payload.name.trim().length ? payload.name.trim() : null
  const avatarUrl = typeof payload.picture === 'string' && payload.picture.trim().length ? payload.picture.trim() : null

  return prisma.user.upsert({
    where: { googleSub: payload.sub },
    update: {
      email: payload.email,
      displayName,
      avatarUrl
    },
    create: {
      googleSub: payload.sub,
      email: payload.email,
      displayName,
      avatarUrl
    }
  })
}

export function formatUserForClient (user) {
  if (!user) {
    return null
  }

  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    groupByCategory: user.groupByCategory,
    createdAt: user.createdAt
  }
}
