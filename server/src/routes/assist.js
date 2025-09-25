import { Router } from 'express'
import { generateStatusReport, generateTaskStatusList, generateTitleSuggestion } from '../services/summaryService.js'

const router = Router()

router.post('/summarize-title', async (req, res, next) => {
  try {
    const { title, details } = req.body || {}
    const result = await generateTitleSuggestion({ title, details })
    res.json(result)
  } catch (error) {
    next(error)
  }
})

router.post('/status-report', async (req, res, next) => {
  try {
    const { completed, inProgress } = req.body || {}
    const result = await generateStatusReport({ completed, inProgress })
    res.json(result)
  } catch (error) {
    next(error)
  }
})

router.post('/task-status', async (req, res, next) => {
  try {
    const { tasks } = req.body || {}
    const result = await generateTaskStatusList({ tasks })
    res.json(result)
  } catch (error) {
    next(error)
  }
})
export default router
