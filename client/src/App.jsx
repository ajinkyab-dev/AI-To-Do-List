import { useCallback, useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import Alert from '@mui/material/Alert';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import AddIcon from '@mui/icons-material/Add';
import PlaylistAddIcon from '@mui/icons-material/PlaylistAdd';
import { Box, Button, CircularProgress, Container, Paper, Stack, Tab, Tabs, Typography } from '@mui/material';
import TaskForm from './components/TaskForm';
import TaskList from './components/TaskList';
import EmptyState from './components/EmptyState';
import ProgressSummary from './components/ProgressSummary';
import ScheduleBoard from './components/ScheduleBoard';
import AddTaskDialog from './components/AddTaskDialog';
import TaskEditorDialog from './components/TaskEditorDialog';
import StatusReportDialog from './components/StatusReportDialog';
import TimeLogDialog from './components/TimeLogDialog';
import { useTaskOrganizer } from './hooks/useTaskOrganizer';
import { generateTaskStatusUpdates, organizeTasks as analyzeNotes, summarizeTitle } from './api';
import { buildSchedule, computeStats, removeTask, sortByPriority, updateTask, withClientId } from './utils/taskUtils';

const mapTaskForStatusView = (task) => ({
  id: task.id,
  title: task.title,
  status: task.status,
  description: task.details || task.statusSummary || '',
  timeLog: task.timeLog || '',
  hours: task.hoursSpent || '',
  statusSummary: task.statusSummary || ''
});

export default function App() {
  const organizer = useTaskOrganizer();
  const { data, isPending, error, reset } = organizer;

  const titleMutation = useMutation({ mutationFn: summarizeTitle });
  const statusMutation = useMutation({ mutationFn: generateTaskStatusUpdates });

  const [tasks, setTasks] = useState([]);
  const [groupedView, setGroupedView] = useState(true);
  const [stats, setStats] = useState({ total: 0, todo: 0, inProgress: 0, completed: 0, completion: 0 });
  const [schedule, setSchedule] = useState({ morning: [], afternoon: [], anytime: [] });
  const [activeTab, setActiveTab] = useState('tasks');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [editorTask, setEditorTask] = useState(null);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [statusReport, setStatusReport] = useState(null);
  const [statusError, setStatusError] = useState(null);
  const [timeLogPrompt, setTimeLogPrompt] = useState(null);

  const applyTasks = useCallback((input) => {
    setTasks((prev) => {
      const nextRaw = typeof input === 'function' ? input(prev) : input;
      const normalized = withClientId(nextRaw);
      const ordered = sortByPriority(normalized);
      setStats(computeStats(ordered));
      setSchedule(buildSchedule(ordered));
      return ordered;
    });
  }, []);

  const handleSubmit = useCallback(
    async (payload) => {
      const result = await organizer.mutateAsync(payload);
      const nextTasks = withClientId(result.tasks || []);
      setGroupedView(Boolean(result.grouped));
      applyTasks(nextTasks);
      if (error) {
        reset();
      }
      setActiveTab('tasks');
    },
    [organizer, applyTasks, error, reset]
  );

  const handleClear = useCallback(() => {
    reset();
    applyTasks([]);
    setActiveTab('tasks');
  }, [applyTasks, reset]);

  const handleStatusChange = useCallback(
    (id, status, originalTask) => {
      applyTasks((prev) =>
        updateTask(prev, id, (current) => ({
          status,
          timeLog: status === 'Completed' ? current.timeLog || '' : '',
        }))
      );

      if (status === 'Completed' && originalTask?.status !== 'Completed') {
        setTimeLogPrompt({
          taskId: id,
          title: originalTask?.title || '',
          value: originalTask?.timeLog || '',
        });
      }
    },
    [applyTasks, setTimeLogPrompt]
  );

  const handleTimeLogChange = useCallback(
    (id, timeLog) => {
      applyTasks((prev) => updateTask(prev, id, () => ({ timeLog })));
    },
    [applyTasks]
  );

  const closeTimeLogPrompt = useCallback(() => {
    setTimeLogPrompt(null);
  }, []);

  const handleTimeLogSave = useCallback(
    (timeValue) => {
      if (!timeLogPrompt?.taskId) {
        closeTimeLogPrompt();
        return;
      }

      applyTasks((prev) => updateTask(prev, timeLogPrompt.taskId, () => ({ timeLog: timeValue })));
      closeTimeLogPrompt();
    },
    [applyTasks, timeLogPrompt, closeTimeLogPrompt]
  );

  const handleDeleteTask = useCallback(
    (id) => {
      applyTasks((prev) => removeTask(prev, id));
    },
    [applyTasks]
  );

  const handleEditTask = useCallback((task) => {
    setEditorTask(task);
    setIsCreatingTask(false);
  }, []);

  const handleCreateTask = useCallback(() => {
    setEditorTask({
      title: '',
      priority: 'Medium',
      category: 'Work',
      status: 'To Do',
      details: '',
      developerNotes: '',
      notes: [],
    });
    setIsCreatingTask(true);
    setActiveTab('tasks');
  }, []);

  const handleSaveTask = useCallback(
    (draft) => {
      if (isCreatingTask) {
        applyTasks((prev) => [...prev, { ...draft, notes: draft.notes || [], timeLog: draft.timeLog || '' }]);
      } else if (editorTask) {
        applyTasks((prev) => updateTask(prev, editorTask.id, () => ({ ...draft })));
      }
      setEditorTask(null);
      setIsCreatingTask(false);
    },
    [applyTasks, editorTask, isCreatingTask]
  );

  const handleAddTasks = useCallback(
    async (notes) => {
      setIsAdding(true);
      try {
        const result = await analyzeNotes({ notes, groupByCategory: groupedView });
        setGroupedView(Boolean(result.grouped));
        const newTasks = withClientId(result.tasks || []);
        applyTasks((prev) => [...prev, ...newTasks]);
        setIsAddDialogOpen(false);
        setActiveTab('tasks');
      } finally {
        setIsAdding(false);
      }
    },
    [groupedView, applyTasks]
  );

  const handleGenerateTitle = useCallback(
    async (draft) => {
      return titleMutation.mutateAsync({ title: draft.title, details: draft.details });
    },
    [titleMutation]
  );

  const completedTasks = useMemo(() => tasks.filter((task) => task.status === 'Completed'), [tasks]);
  const activeTasks = useMemo(() => tasks.filter((task) => task.status !== 'Completed'), [tasks]);
  const statusEligibleCount = tasks.length;

  const handleGenerateStatusReport = useCallback(async () => {
    setStatusDialogOpen(true);

    if (!tasks.length) {
      setStatusReport(null);
      setStatusError('Add tasks before generating a status update.');
      return;
    }

    setStatusReport(null);
    setStatusError(null);

    const taskPayload = tasks.map((task) => ({
      id: task.id,
      title: task.title,
      description: task.details || '',
      hoursSpent: task.timeLog || task.hoursSpent || ''
    }));

    try {
      const result = await statusMutation.mutateAsync({ tasks: taskPayload });
      const updates = Array.isArray(result?.updates)
        ? result.updates.map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
        : [];

      let taskSnapshot = tasks;

      if (updates.length) {
        const statusMap = new Map();
        taskPayload.forEach((item, index) => {
          if (index < updates.length) {
            statusMap.set(item.id, updates[index]);
          }
        });

        if (statusMap.size) {
          const withSummaries = tasks.map((task) => {
            if (!statusMap.has(task.id)) {
              return task;
            }
            const nextStatus = statusMap.get(task.id);
            if (typeof nextStatus !== 'string') {
              return task;
            }
            return {
              ...task,
              statusSummary: nextStatus
            };
          });

          taskSnapshot = withSummaries;
          applyTasks(withSummaries);
        }
      }

      const completedSnapshot = taskSnapshot
        .filter((task) => task.status === 'Completed')
        .map(mapTaskForStatusView);
      const inProgressSnapshot = taskSnapshot
        .filter((task) => task.status === 'In Progress')
        .map(mapTaskForStatusView);

      setStatusReport({
        updates,
        provider: result?.provider,
        model: result?.model,
        warning: result?.warning,
        completedTasks: completedSnapshot,
        inProgressTasks: inProgressSnapshot,
        generatedAt: new Date().toISOString()
      });
    } catch (err) {
      setStatusError(err instanceof Error ? err.message : 'Unable to generate status update.');
    }
  }, [tasks, statusMutation, applyTasks]);

  const closeStatusDialog = useCallback(() => {
    setStatusDialogOpen(false);
    setStatusReport(null);
    setStatusError(null);
    statusMutation.reset();
  }, [statusMutation]);

  const hasResult = useMemo(() => tasks.length > 0, [tasks]);

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
      <Stack spacing={4}>
        <Paper sx={{ p: { xs: 3, md: 4 } }} elevation={0}>
          <TaskForm onSubmit={handleSubmit} loading={isPending} error={error} />
        </Paper>

        <Paper sx={{ p: { xs: 3, md: 4 } }} elevation={0}>
          <Stack spacing={3}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ xs: 'flex-start', sm: 'center' }} justifyContent="space-between">
              <Stack direction="row" spacing={1.5} alignItems="center">
                <AutoAwesomeIcon color="primary" />
                <Typography variant="h5">Workspace</Typography>
              </Stack>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Button startIcon={<PlaylistAddIcon />} variant="outlined" onClick={handleCreateTask}>
                  New task
                </Button>
                <Button startIcon={<AddIcon />} variant="outlined" onClick={() => setIsAddDialogOpen(true)} disabled={isPending}>
                  Add tasks via AI
                </Button>
                <Button variant="contained" color="secondary" onClick={handleGenerateStatusReport} disabled={statusEligibleCount === 0 || statusMutation.isPending}>
                  Generate status
                </Button>
                <Button onClick={handleClear} size="small" variant="text" color="primary" disabled={!hasResult && !error}>
                  Clear results
                </Button>
              </Stack>
            </Stack>

            {isPending ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                <CircularProgress />
              </Box>
            ) : hasResult ? (
              <>
                <Alert severity="info" sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  Provider: {data?.providerLabel || 'N/A'} {data?.model ? `| Model: ${data.model}` : ''} | Grouped view: {groupedView ? 'On' : 'Off'}
                </Alert>
                {data?.warning ? <Alert severity="warning">{data.warning}</Alert> : null}
                <ProgressSummary stats={stats} />
                <Tabs value={activeTab} onChange={(_, value) => setActiveTab(value)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
                  <Tab label="Active" value="tasks" />
                  <Tab label={`Completed (${completedTasks.length})`} value="completed" />
                  <Tab label="Schedule suggestions" value="schedule" />
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
                    <Typography variant="body2" color="text.secondary">
                      All caught up! Switch to the Completed tab to review finished work.
                    </Typography>
                  )
                ) : null}
                {activeTab === 'completed' ? (
                  completedTasks.length ? (
                    <TaskList
                      tasks={completedTasks}
                      grouped={groupedView}
                      onStatusChange={handleStatusChange}
                      onEdit={handleEditTask}
                      onDelete={handleDeleteTask}
                      onTimeLogChange={handleTimeLogChange}
                    />
                  ) : (
                    <Typography variant="body2" color="text.secondary">
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
          setEditorTask(null);
          setIsCreatingTask(false);
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
      <TimeLogDialog
        open={Boolean(timeLogPrompt)}
        taskTitle={timeLogPrompt?.title}
        initialValue={timeLogPrompt?.value || ''}
        onCancel={closeTimeLogPrompt}
        onSave={handleTimeLogSave}
      />
    </Container>
  );
}
