import { Router } from 'express';
import { organizeTasks } from '../services/taskService.js';

const router = Router();

router.post('/', async (req, res, next) => {
  try {
    const { notes, groupByCategory } = req.body || {};
    const result = await organizeTasks({ notes, groupByCategory });
    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
