import { Router } from 'express'
import {
  clearTasksForUser,
  createTaskForUser,
  deleteTaskForUser,
  fetchTasksForUser,
  organizeTasks,
  updateTaskForUser
} from '../services/taskService.js'

const router = Router()

router.get('/', async (req, res, next) => {
  try {
    const result = await fetchTasksForUser({ user: req.user })
    res.json(result)
  } catch (error) {
    next(error)
  }
})

router.post('/', async (req, res, next) => {
  try {
    const { notes, groupByCategory } = req.body || {}
    const result = await organizeTasks({ user: req.user, notes, groupByCategory })
    req.user.groupByCategory = Boolean(result.grouped)
    res.json(result)
  } catch (error) {
    next(error)
  }
})

router.post('/manual', async (req, res, next) => {
  try {
    const created = await createTaskForUser({ userId: req.user.id, payload: req.body || {} })
    res.status(201).json(created)
  } catch (error) {
    next(error)
  }
})

router.put('/:id', async (req, res, next) => {
  try {
    const updated = await updateTaskForUser({
      userId: req.user.id,
      taskId: req.params.id,
      payload: req.body || {}
    })
    res.json(updated)
  } catch (error) {
    next(error)
  }
})

router.delete('/:id', async (req, res, next) => {
  try {
    await deleteTaskForUser({ userId: req.user.id, taskId: req.params.id })
    res.status(204).end()
  } catch (error) {
    next(error)
  }
})

router.delete('/', async (req, res, next) => {
  try {
    await clearTasksForUser(req.user.id)
    res.status(204).end()
  } catch (error) {
    next(error)
  }
})

export default router
