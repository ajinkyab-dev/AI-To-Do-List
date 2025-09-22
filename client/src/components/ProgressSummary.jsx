import { LinearProgress, Stack, Typography } from '@mui/material';

export default function ProgressSummary({ stats }) {
  if (!stats) {
    return null;
  }

  return (
    <Stack spacing={1.5}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="subtitle1" fontWeight={600}>
          Overall progress
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {stats.completed} of {stats.total} completed ({stats.completion}%)
        </Typography>
      </Stack>
      <LinearProgress variant="determinate" value={stats.completion} sx={{ height: 10, borderRadius: 5 }} />
      <Stack direction="row" spacing={2} sx={{ color: 'text.secondary', '& span': { fontSize: 13 } }}>
        <span>To Do: {stats.todo}</span>
        <span>In Progress: {stats.inProgress}</span>
        <span>Completed: {stats.completed}</span>
      </Stack>
    </Stack>
  );
}
