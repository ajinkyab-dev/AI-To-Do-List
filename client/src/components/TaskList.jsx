import { Grid, Paper, Stack, Typography } from '@mui/material';
import TaskCard from './TaskCard';
import { sortByPriority } from '../utils/taskUtils';

function groupTasks(tasks) {
  return tasks.reduce((acc, task) => {
    const key = task.category || 'Other';
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(task);
    return acc;
  }, {});
}

export default function TaskList({ tasks, grouped, onStatusChange, onEdit, onDelete, onTimeLogChange }) {
  const ordered = sortByPriority(tasks);

  if (!ordered?.length) {
    return null;
  }

  if (!grouped) {
    return (
      <Grid container spacing={2.5} sx={{ mt: 2 }}>
        {ordered.map((task) => (
          <Grid key={task.id} item xs={12} md={6} lg={4}>
            <TaskCard
              task={task}
              onStatusChange={onStatusChange}
              onEdit={onEdit}
              onDelete={onDelete}
              onTimeLogChange={onTimeLogChange}
            />
          </Grid>
        ))}
      </Grid>
    );
  }

  const groupedTasks = groupTasks(ordered);

  return (
    <Grid container spacing={3} sx={{ mt: 1 }}>
      {Object.entries(groupedTasks).map(([category, list]) => (
        <Grid key={category} item xs={12} md={6} lg={4}>
          <Paper
            variant="outlined"
            sx={{
              height: '100%',
              p: 3,
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
              borderRadius: 4,
              borderColor: 'divider',
              background: (theme) =>
                theme.palette.mode === 'light'
                  ? 'linear-gradient(135deg, rgba(43,108,176,0.08), rgba(56,161,105,0.08))'
                  : theme.palette.background.default
            }}
          >
            <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap sx={{ rowGap: 0.5 }}>
              <Typography variant="h6" fontWeight={600} sx={{ textTransform: 'capitalize' }}>
                {category}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {list.length} task{list.length > 1 ? 's' : ''}
              </Typography>
            </Stack>
            <Stack spacing={2} sx={{ flexGrow: 1 }}>
              {sortByPriority(list).map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onStatusChange={onStatusChange}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onTimeLogChange={onTimeLogChange}
                />
              ))}
            </Stack>
          </Paper>
        </Grid>
      ))}
    </Grid>
  );
}

