import { useCallback, useEffect, useMemo, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import AddIcon from '@mui/icons-material/Add'
import logo from './assets/IxLogo.png';
import PlaylistAddIcon from '@mui/icons-material/PlaylistAdd'
import {
  Alert,
  Avatar,
  Backdrop,
  Box,
  Button,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Stack,
  Tab,
  Tabs,
  Typography
} from '@mui/material'
import TaskForm from './components/TaskForm'
import TaskList from './components/TaskList'
import EmptyState from './components/EmptyState'
import ProgressSummary from './components/ProgressSummary'
import ScheduleBoard from './components/ScheduleBoard'
import AddTaskDialog from './components/AddTaskDialog'
import TaskEditorDialog from './components/TaskEditorDialog'
import StatusReportDialog from './components/StatusReportDialog'
import StatusUpdateDialog from './components/StatusUpdateDialog'
import CompletedTasksTable from './components/CompletedTasksTable'
import { useTaskOrganizer } from './hooks/useTaskOrganizer'
import {
  clearTasks as clearTasksRequest,
  createTask as createTaskRequest,
  deleteTask as deleteTaskRequest,
  fetchTasks,
  generateTaskStatusUpdates,
  organizeTasks as analyzeNotes,
  summarizeTitle,
  updateTask as updateTaskRequest
} from './api'
import { buildSchedule, computeStats, removeTask, sortByPriority, updateTask, withClientId } from './utils/taskUtils'

const mapTaskForStatusView = (task) => ({
  id: task.id,
  title: task.title,
  status: task.status,
  description: task.details || task.statusSummary || '',
  timeLog: task.timeLog || '',
  hours: task.hoursSpent || '',
  statusSummary: task.statusSummary || ''
})

const GREETING_QUOTES = {
  morning: [
    'Each sunrise is a new chapter waiting to be written.',
    'Start the morning with focus and the rest will follow.',
    'Small wins before noon set the tone for the day.'
  ],
  afternoon: [
    'Keep pushing; your future self is thanking you.',
    'Momentum is built one task at a time.',
    'Reset, refuel, and finish strong.'
  ],
  evening: [
    'Greatness is built in the quiet hours.',
    'Wrap today with pride and set up tomorrow.',
    'Evening focus turns plans into progress.'
  ]
}

const Logo = () => <Box component='img' src={logo} alt='Brand logo' height={80} />;

function getTimePeriod (date = new Date()) {
  const hours = date.getHours()
  if (hours < 12) return 'morning'
  if (hours < 17) return 'afternoon'
  return 'evening'
}

function pickQuote (period) {
  const options = GREETING_QUOTES[period] || GREETING_QUOTES.evening
  return options[Math.floor(Math.random() * options.length)]
}

function buildDisplayName (user) {
  if (!user) return 'there'
  if (user.displayName) {
    const trimmed = user.displayName.trim()
    if (trimmed.includes(' ')) {
      return trimmed.split(' ')[0]
    }
    return trimmed
  }
  if (user.email) {
    return user.email.split('@')[0]
  }
  return 'there'
}

export default function App ({ user, onLogout }) {
  const organizer = useTaskOrganizer()
  const { data: organizerMeta, isPending, error: organizerError, reset } = organizer

  const titleMutation = useMutation({ mutationFn: summarizeTitle })
  const statusMutation = useMutation({ mutationFn: generateTaskStatusUpdates })

  const [tasks, setTasks] = useState([])
  const [groupedView, setGroupedView] = useState(true)
  const [stats, setStats] = useState({ total: 0, todo: 0, inProgress: 0, completed: 0, completion: 0 })
  const [schedule, setSchedule] = useState({ morning: [], afternoon: [], anytime: [] })
  const [activeTab, setActiveTab] = useState('tasks')
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [editorTask, setEditorTask] = useState(null)
  const [isCreatingTask, setIsCreatingTask] = useState(false)
  const [statusDialogOpen, setStatusDialogOpen] = useState(false)
  const [statusReport, setStatusReport] = useState(null)
  const [statusError, setStatusError] = useState(null)
  const [analysisMeta, setAnalysisMeta] = useState(null)
  const [loadError, setLoadError] = useState(null)
  const [initializing, setInitializing] = useState(true)
  const [statusPrompt, setStatusPrompt] = useState(null)
  const [loadingCounter, setLoadingCounter] = useState(0)
  const [greetingOpen, setGreetingOpen] = useState(false)
  const [greetingShown, setGreetingShown] = useState(false)
  const [greetingContent, setGreetingContent] = useState(null)

  const startLoading = useCallback(() => {
    setLoadingCounter((prev) => prev + 1)
  }, [])

  const stopLoading = useCallback(() => {
    setLoadingCounter((prev) => (prev > 0 ? prev - 1 : 0))
  }, [])

  const runWithLoader = useCallback(async (operation) => {
    startLoading()
    try {
      return await operation()
    } finally {
      stopLoading()
    }
  }, [startLoading, stopLoading])

  const applyTasks = useCallback((input) => {
    setTasks((prev) => {
      const nextRaw = typeof input === 'function' ? input(prev) : input
      const normalized = withClientId(nextRaw)
      const ordered = sortByPriority(normalized)
      setStats(computeStats(ordered))
      setSchedule(buildSchedule(ordered))
      return ordered
    })
  }, [])

  const refreshTasks = useCallback(async () => {
    startLoading()
    try {
      const result = await fetchTasks()
      setGroupedView(Boolean(result.grouped ?? true))
      setAnalysisMeta(result)
      applyTasks(result.tasks || [])
      return result
    } finally {
      stopLoading()
    }
  }, [applyTasks, startLoading, stopLoading])

  useEffect(() => {
    let cancelled = false

    async function initialize () {
      setInitializing(true)
      try {
        await refreshTasks()
        if (!cancelled) {
          setLoadError(null)
        }
      } catch (err) {
        if (!cancelled) {
          const fallback = err instanceof Error ? err : new Error('Unable to load tasks.')
          setLoadError(fallback)
          applyTasks([])
        }
      } finally {
        if (!cancelled) {
          setInitializing(false)
        }
      }
    }

    initialize()
    return () => {
      cancelled = true
    }
  }, [refreshTasks, applyTasks, user?.id])

  useEffect(() => {
    if (initializing || greetingShown) {
      return
    }
    const period = getTimePeriod()
    const quote = pickQuote(period)
    const name = buildDisplayName(user)
    const title = `Good ${period}, ${name}!`
    const count = tasks.filter((task) => task.status !== 'Completed').length
    const lines = []
    if (count > 0) {
      lines.push(`You have ${count} ${count === 1 ? 'task' : 'tasks'} in your bucket.`)
    }
    setGreetingContent({
      title,
      message: lines.join(' '),
      quote
    })
    setGreetingOpen(true)
    setGreetingShown(true)
  }, [initializing, greetingShown, tasks, user])

  const handleSubmit = useCallback(async (payload) => {
    await runWithLoader(async () => {
      const result = await organizer.mutateAsync(payload)
      setGroupedView(Boolean(result.grouped))
      setAnalysisMeta(result)
      applyTasks(result.tasks || [])
      if (organizerError) {
        reset()
      }
      setActiveTab('tasks')
    })
  }, [organizer, organizerError, applyTasks, reset, runWithLoader])

  const handleClear = useCallback(async () => {
    await runWithLoader(async () => {
      try {
        await clearTasksRequest()
        applyTasks([])
        setAnalysisMeta(null)
        setLoadError(null)
      } catch (err) {
        const fallback = err instanceof Error ? err : new Error('Unable to clear tasks.')
        setLoadError(fallback)
        refreshTasks().catch(() => {})
      } finally {
        reset()
        setActiveTab('tasks')
      }
    })
  }, [applyTasks, refreshTasks, reset, runWithLoader])

  const closeStatusPrompt = useCallback(() => {
    setStatusPrompt(null)
  }, [])

  const handleStatusChange = useCallback(async (id, status, originalTask) => {
    const needsPrompt = originalTask?.status === 'To Do' && (status === 'In Progress' || status === 'Completed')

    if (needsPrompt) {
      setStatusPrompt({
        taskId: id,
        status,
        title: originalTask?.title || '',
        initialSummary: originalTask?.statusSummary || '',
        initialTime: originalTask?.timeLog || ''
      })
    }

    applyTasks((prev) =>
      updateTask(prev, id, (current) => ({
        status,
        timeLog: status === 'Completed' ? current.timeLog || '' : ''
      }))
    )

    try {
      await runWithLoader(async () => {
        const payload = { status }
        if (status !== 'Completed') {
          payload.timeLog = null
        }
        const updated = await updateTaskRequest(id, payload)
        applyTasks((prev) => updateTask(prev, id, () => updated))
        setLoadError(null)
      })
    } catch (err) {
      const fallback = err instanceof Error ? err : new Error('Unable to update task status.')
      setLoadError(fallback)
      if (needsPrompt) {
        closeStatusPrompt()
      }
      refreshTasks().catch(() => {})
    }
  }, [applyTasks, refreshTasks, closeStatusPrompt, runWithLoader])

  const handleStatusDetailsSave = useCallback(async ({ description, timeLog }) => {
    if (!statusPrompt?.taskId) {
      closeStatusPrompt()
      return
    }

    const payload = {}
    if (description !== undefined) {
      payload.statusSummary = description || null
    }
    if (timeLog !== undefined) {
      payload.timeLog = timeLog || null
    }

    try {
      await runWithLoader(async () => {
        const updated = await updateTaskRequest(statusPrompt.taskId, payload)
        applyTasks((prev) => updateTask(prev, statusPrompt.taskId, () => updated))
        setLoadError(null)
      })
    } catch (err) {
      const fallback = err instanceof Error ? err : new Error('Unable to save task details.')
      setLoadError(fallback)
      refreshTasks().catch(() => {})
    } finally {
      closeStatusPrompt()
    }
  }, [statusPrompt, applyTasks, refreshTasks, closeStatusPrompt, runWithLoader])

  const handleTimeLogChange = useCallback(async (id, value) => {
    const trimmed = (value || '').trim()
    applyTasks((prev) => updateTask(prev, id, () => ({ timeLog: trimmed })))
    try {
      await runWithLoader(async () => {
        const updated = await updateTaskRequest(id, { timeLog: trimmed })
        applyTasks((prev) => updateTask(prev, id, () => updated))
        setLoadError(null)
      })
    } catch (err) {
      const fallback = err instanceof Error ? err : new Error('Unable to update time log.')
      setLoadError(fallback)
      refreshTasks().catch(() => {})
    }
  }, [applyTasks, refreshTasks, runWithLoader])

  const handleDeleteTask = useCallback(async (id) => {
    applyTasks((prev) => removeTask(prev, id))
    try {
      await runWithLoader(async () => {
        await deleteTaskRequest(id)
        setLoadError(null)
      })
    } catch (err) {
      const fallback = err instanceof Error ? err : new Error('Unable to delete task.')
      setLoadError(fallback)
      refreshTasks().catch(() => {})
    }
  }, [applyTasks, refreshTasks, runWithLoader])

  const handleEditTask = useCallback((task) => {
    setEditorTask(task)
    setIsCreatingTask(false)
  }, [])

  const handleCreateTask = useCallback(() => {
    setEditorTask({
      title: '',
      priority: 'Medium',
      category: 'Work',
      status: 'To Do',
      details: '',
      notes: []
    })
    setIsCreatingTask(true)
    setActiveTab('tasks')
  }, [])

  const handleSaveTask = useCallback(async (draft) => {
    try {
      await runWithLoader(async () => {
        if (isCreatingTask) {
          const created = await createTaskRequest(draft)
          applyTasks((prev) => withClientId([...prev, created]))
        } else if (editorTask) {
          const updated = await updateTaskRequest(editorTask.id, draft)
          applyTasks((prev) => updateTask(prev, editorTask.id, () => updated))
        }
        setEditorTask(null)
        setIsCreatingTask(false)
        setLoadError(null)
      })
    } catch (err) {
      const fallback = err instanceof Error ? err : new Error('Unable to save task.')
      setLoadError(fallback)
    }
  }, [applyTasks, editorTask, isCreatingTask, runWithLoader])

  const handleAddTasks = useCallback(async (notes) => {
    setIsAdding(true)
    try {
      await runWithLoader(async () => {
        const result = await analyzeNotes({ notes, groupByCategory: groupedView })
        setGroupedView(Boolean(result.grouped))
        setAnalysisMeta(result)
        applyTasks(result.tasks || [])
        setIsAddDialogOpen(false)
        setActiveTab('tasks')
        setLoadError(null)
      })
    } catch (err) {
      const fallback = err instanceof Error ? err : new Error('Unable to generate tasks.')
      setLoadError(fallback)
    } finally {
      setIsAdding(false)
    }
  }, [groupedView, applyTasks, runWithLoader])

  const handleGenerateTitle = useCallback(async (draft) => {
    return titleMutation.mutateAsync({ title: draft.title, details: draft.details })
  }, [titleMutation])

  const completedTasks = useMemo(() => tasks.filter((task) => task.status === 'Completed'), [tasks])
  const activeTasks = useMemo(() => tasks.filter((task) => task.status !== 'Completed'), [tasks])
  const statusEligibleCount = tasks.length

  const handleGenerateStatusReport = useCallback(async () => {
    setStatusDialogOpen(true)

    if (!tasks.length) {
      setStatusReport(null)
      setStatusError('Add tasks before generating a status update.')
      return
    }

    setStatusReport(null)
    setStatusError(null)

    const taskPayload = tasks.map((task) => ({
      id: task.id,
      title: task.title,
      description: task.details || '',
      hoursSpent: task.timeLog || task.hoursSpent || ''
    }))

    try {
      await runWithLoader(async () => {
        const result = await statusMutation.mutateAsync({ tasks: taskPayload })
        const updates = Array.isArray(result?.updates)
          ? result.updates.map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
          : []

        let taskSnapshot = tasks

        if (updates.length) {
          const statusMap = new Map()
          taskPayload.forEach((item, index) => {
            if (index < updates.length) {
              statusMap.set(item.id, updates[index])
            }
          })

          if (statusMap.size) {
            const withSummaries = tasks.map((task) => {
              if (!statusMap.has(task.id)) {
                return task
              }
              const nextStatus = statusMap.get(task.id)
              if (typeof nextStatus !== 'string') {
                return task
              }
              return {
                ...task,
                statusSummary: nextStatus
              }
            })

            taskSnapshot = withSummaries
            applyTasks(withSummaries)
          }
        }

        const completedSnapshot = taskSnapshot
          .filter((task) => task.status === 'Completed')
          .map(mapTaskForStatusView)
        const inProgressSnapshot = taskSnapshot
          .filter((task) => task.status === 'In Progress')
          .map(mapTaskForStatusView)

        setStatusReport({
          updates,
          provider: result?.provider,
          model: result?.model,
          warning: result?.warning,
          completedTasks: completedSnapshot,
          inProgressTasks: inProgressSnapshot,
          generatedAt: new Date().toISOString()
        })
      })
    } catch (err) {
      setStatusError(err instanceof Error ? err.message : 'Unable to generate status update.')
    }
  }, [tasks, statusMutation, applyTasks, runWithLoader])

  const closeStatusDialog = useCallback(() => {
    setStatusDialogOpen(false)
    setStatusReport(null)
    setStatusError(null)
    statusMutation.reset()
  }, [statusMutation])

  const hasResult = useMemo(() => tasks.length > 0, [tasks])
  const combinedError = organizerError || loadError
  const loadingTasks = initializing
  const meta = analysisMeta || organizerMeta
  const busy = loadingCounter > 0

  const displayName = useMemo(() => {
    if (!user) return ''
    return user.displayName || user.email || ''
  }, [user])

  const initials = useMemo(() => {
    if (!displayName) return 'U'
    return displayName
      .split(' ')
      .filter(Boolean)
      .map((segment) => segment[0]?.toUpperCase())
      .join('')
      .slice(0, 2)
  }, [displayName])

  const handleGreetingClose = useCallback(() => {
    setGreetingOpen(false)
  }, [])

  return (
    <Container maxWidth='lg' sx={{ py: { xs: 4, md: 6 } }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: { xs: 3, md: 4 }
        }}
      >
        <Logo />
        {user ? (
          <Stack direction='row' spacing={1.5} alignItems='center'>
            <Avatar sx={{ width: 36, height: 36 }}>{initials}</Avatar>
            <Typography variant='body1'>{displayName}</Typography>
            <Button size='small' variant='outlined' onClick={() => onLogout?.()}>
              Log out
            </Button>
          </Stack>
        ) : null}
      </Box>

      <Stack spacing={4}>
        <Paper sx={{ p: { xs: 3, md: 4 } }} elevation={0}>
          <TaskForm onSubmit={handleSubmit} loading={isPending} error={combinedError} />
        </Paper>

        <Paper sx={{ p: { xs: 3, md: 4 } }} elevation={0}>
          <Stack spacing={3}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ xs: 'flex-start', sm: 'center' }} justifyContent='space-between'>
              <Stack direction='row' spacing={1.5} alignItems='center'>
                <AutoAwesomeIcon color='primary' />
                <Typography variant='h5'>Workspace</Typography>
              </Stack>
              <Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap alignItems='center'>
                <Button startIcon={<PlaylistAddIcon />} variant='outlined' onClick={handleCreateTask}>
                  New task
                </Button>
                <Button startIcon={<AddIcon />} variant='outlined' onClick={() => setIsAddDialogOpen(true)} disabled={isPending}>
                  Add tasks via AI
                </Button>
                <Button variant='contained' color='secondary' onClick={handleGenerateStatusReport} disabled={statusEligibleCount === 0 || statusMutation.isPending}>
                  Generate status
                </Button>
                <Button onClick={handleClear} size='small' variant='text' color='primary' disabled={!hasResult && !combinedError}>
                  Clear results
                </Button>
              </Stack>
            </Stack>

            {loadingTasks ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                <CircularProgress />
              </Box>
            ) : hasResult ? (
              <>
                <Alert severity='info' sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  Provider: {meta?.providerLabel || 'N/A'} {meta?.model ? `| Model: ${meta.model}` : ''} | Grouped view: {groupedView ? 'On' : 'Off'}
                </Alert>
                {meta?.warning ? <Alert severity='warning'>{meta.warning}</Alert> : null}
                <ProgressSummary stats={stats} />
                <Tabs value={activeTab} onChange={(_, value) => setActiveTab(value)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
                  <Tab label='Active' value='tasks' />
                  <Tab label={`Completed (${completedTasks.length})`} value='completed' />
                  <Tab label='Schedule suggestions' value='schedule' />
                </Tabs>
                {activeTab === 'tasks' ? (
                  activeTasks.length ? (
                    <TaskList
                      tasks={activeTasks}
                      grouped={groupedView}
                      onStatusChange={handleStatusChange}
                      onEdit={handleEditTask}
                      onDelete={handleDeleteTask}
                      onTimeLogChange={handleTimeLogChange}
                    />
                  ) : (
                    <Typography variant='body2' color='text.secondary'>
                      All caught up! Switch to the Completed tab to review finished work.
                    </Typography>
                  )
                ) : null}
                {activeTab === 'completed' ? (
                  completedTasks.length ? (
                    <CompletedTasksTable
                      tasks={completedTasks}
                      onEdit={handleEditTask}
                      onDelete={handleDeleteTask}
                      onRestore={(task) => handleStatusChange(task.id, 'In Progress', task)}
                    />
                  ) : (
                    <Typography variant='body2' color='text.secondary'>
                      Completed tasks will appear here after you mark them done.
                    </Typography>
                  )
                ) : null}
                {activeTab === 'schedule' ? <ScheduleBoard schedule={schedule} /> : null}
              </>
            ) : (
              <EmptyState />
            )}
          </Stack>
        </Paper>
      </Stack>

      <AddTaskDialog open={isAddDialogOpen} onClose={() => setIsAddDialogOpen(false)} onSubmit={handleAddTasks} loading={isAdding} />
      <TaskEditorDialog
        open={Boolean(editorTask)}
        task={editorTask}
        onClose={() => {
          setEditorTask(null)
          setIsCreatingTask(false)
        }}
        onSave={handleSaveTask}
        onGenerateTitle={handleGenerateTitle}
        generatingTitle={titleMutation.isPending}
        isCreating={isCreatingTask}
      />
      <StatusReportDialog
        open={statusDialogOpen}
        onClose={closeStatusDialog}
        report={statusReport}
        loading={statusMutation.isPending}
        provider={statusReport?.provider}
        error={statusError}
      />
      <StatusUpdateDialog
        open={Boolean(statusPrompt)}
        status={statusPrompt?.status}
        taskTitle={statusPrompt?.title}
        initialSummary={statusPrompt?.initialSummary}
        initialTime={statusPrompt?.initialTime}
        onCancel={closeStatusPrompt}
        onSave={handleStatusDetailsSave}
      />

      <Dialog open={greetingOpen} onClose={handleGreetingClose} maxWidth='xs' fullWidth>
        <DialogTitle>{greetingContent?.title}</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5}>
            {greetingContent?.message ? (
              <Typography variant='body2'>{greetingContent.message}</Typography>
            ) : null}
            <Typography variant='body2' color='text.secondary'>
              {greetingContent?.quote}
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleGreetingClose} variant='contained'>
            {"Let's go"}
          </Button>
        </DialogActions>
      </Dialog>

      <Backdrop
        open={busy}
        sx={{
          color: '#fff',
          zIndex: (theme) => theme.zIndex.tooltip + 10
        }}
      >
        <CircularProgress color='inherit' />
      </Backdrop>
    </Container>
  )
}









