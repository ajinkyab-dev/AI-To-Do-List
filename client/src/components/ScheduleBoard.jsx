import { Chip, Divider, Paper, Stack, Typography } from '@mui/material';

const SLOT_LABELS = {
  morning: 'Morning / Deep Work',
  afternoon: 'Afternoon / Collaboration',
  anytime: 'Anytime / Flexible'
};

export default function ScheduleBoard({ schedule }) {
  if (!schedule) {
    return null;
  }

  return (
    <Stack spacing={2.5}>
      {Object.entries(schedule).map(([slot, list]) => (
        <Paper key={slot} variant="outlined" sx={{ p: 3, borderRadius: 4 }}>
          <Stack spacing={2}>
            <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={1.5}>
              <Typography variant="h6" fontWeight={600}>
                {SLOT_LABELS[slot] || slot}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {list.length} task{list.length !== 1 ? 's' : ''}
              </Typography>
            </Stack>
            <Divider />
            {list.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No tasks assigned.
              </Typography>
            ) : (
              <Stack spacing={1.5}>
                {list.map((task) => (
                  <Stack key={`${slot}-${task.id}`} spacing={0.5}>
                    <Typography variant="subtitle1" fontWeight={600}>
                      {task.title}
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ '& .MuiChip-root': { fontSize: 12 } }}>
                      <Chip label={task.priority} color={task.priority === 'High' ? 'error' : task.priority === 'Medium' ? 'warning' : 'success'} size="small" />
                      <Chip label={task.category} variant="outlined" size="small" />
                      <Chip label={task.status} variant="outlined" size="small" />
                    </Stack>
                  </Stack>
                ))}
              </Stack>
            )}
          </Stack>
        </Paper>
      ))}
    </Stack>
  );
}
