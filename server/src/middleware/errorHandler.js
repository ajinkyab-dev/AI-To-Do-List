export function notFoundHandler (req, res, next) {
  if (req.path.startsWith('/api')) {
    res.status(404).json({ error: 'Not Found' })
  } else {
    res.status(404).send('Not Found')
  }
}

export function errorHandler (err, req, res, next) {
  const status = err.status || 500
  const message = err.message || 'Internal Server Error'

  if (status >= 500) {
    console.error('Unhandled error:', err)
  }

  if (req.path.startsWith('/api')) {
    res.status(status).json({ error: message })
  } else {
    res.status(status).send(message)
  }
}
