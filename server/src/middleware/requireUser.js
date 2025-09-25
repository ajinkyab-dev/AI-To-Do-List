import { isGoogleAuthConfigured, verifyGoogleIdToken, syncUserFromGooglePayload } from '../services/authService.js'

export default async function requireUser (req, res, next) {
  try {
    if (!isGoogleAuthConfigured()) {
      console.error('GOOGLE_CLIENT_ID is not configured.')
      return res.status(500).json({ error: 'Authentication not configured.' })
    }

    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing Authorization header.' })
    }

    const idToken = authHeader.slice('Bearer '.length).trim()
    if (!idToken) {
      return res.status(401).json({ error: 'Invalid Authorization header.' })
    }

    const payload = await verifyGoogleIdToken(idToken)
    const user = await syncUserFromGooglePayload(payload)

    req.user = user
    req.auth = { payload, idToken }
    next()
  } catch (error) {
    const status = error.status || 401
    console.error('Google token verification failed:', error)
    res.status(status).json({ error: status === 401 ? 'Invalid or expired Google token.' : error.message || 'Authentication failed.' })
  }
}
