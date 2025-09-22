import InboxIcon from '@mui/icons-material/Inbox';
import { Box, Stack, Typography } from '@mui/material';

export default function EmptyState() {
  return (
    <Stack
      spacing={2}
      alignItems="center"
      justifyContent="center"
      sx={{
        border: '1px dashed rgba(43, 108, 176, 0.3)',
        borderRadius: 14,
        py: 6,
        px: 3,
        textAlign: 'center'
      }}
    >
      <Box sx={{ color: 'primary.main' }}>
        <InboxIcon fontSize="large" />
      </Box>
      <Stack spacing={0.5}>
        <Typography variant="h6">No tasks organized yet</Typography>
        <Typography color="text.secondary">
          Paste a few rough notes and tap “Organize tasks” to get started.
        </Typography>
      </Stack>
    </Stack>
  );
}
