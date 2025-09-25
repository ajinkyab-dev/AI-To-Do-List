import { Router } from 'express'
import {
  formatUserForClient,
  isGoogleAuthConfigured,
  syncUserFromGooglePayload,
  verifyGoogleIdToken
} from '../services/authService.js'

const router = Router()

router.post('/google', async (req, res) => {
  try {
    if (!isGoogleAuthConfigured()) {
      console.error('GOOGLE_CLIENT_ID is not configured.')
      return res.status(500).json({ error: 'Authentication not configured.' })
    }

    const { credential, idToken } = req.body || {}
    const token = typeof credential === 'string' && credential.trim().length
      ? credential.trim()
      : typeof idToken === 'string' && idToken.trim().length
        ? idToken.trim()
        : null

    if (!token) {
      return res.status(400).json({ error: 'Missing Google credential.' })
    }

    const payload = await verifyGoogleIdToken(token)
    const user = await syncUserFromGooglePayload(payload)

    res.json({
      token,
      user: formatUserForClient(user)
    })
  } catch (error) {
    const status = error.status || 401
    if (status >= 500) {
      console.error('Google authentication failed:', error)
    }
    res.status(status).json({
      error: status === 401 ? 'Invalid Google credential.' : error.message || 'Authentication failed.'
    })
  }
})

export default router
