import { useState } from 'react';
import { Alert, Button, FormControlLabel, Stack, Switch, TextField, Typography } from '@mui/material';

const SAMPLE_TEXT = 'Finish PPT, check AWS logs, call client';

export default function TaskForm({ onSubmit, loading, error }) {
  const [notes, setNotes] = useState('');
  const [groupByCategory, setGroupByCategory] = useState(true);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!notes.trim()) {
      return;
    }
    await onSubmit({ notes, groupByCategory });
  };

  return (
    <form onSubmit={handleSubmit}>
      <Stack spacing={2.5}>
        <Stack spacing={1}>
          <Typography variant="h1">AI To-Do List Manager</Typography>
          <Typography color="text.secondary">
            Paste rough notes below. We will curate a structured set of tasks, prioritize them, and group by category if you want.
          </Typography>
        </Stack>

        {error ? <Alert severity="error">{error.message}</Alert> : null}

        <TextField
          id="raw-notes"
          label="Raw task notes"
          placeholder={SAMPLE_TEXT}
          multiline
          minRows={6}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          disabled={loading}
          fullWidth
        />

        <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
          <FormControlLabel
            control={
              <Switch
                checked={groupByCategory}
                onChange={(event) => setGroupByCategory(event.target.checked)}
                disabled={loading}
              />
            }
            label="Group tasks by category"
          />
          <Button type="submit" size="large" disabled={loading || !notes.trim()}>
            {loading ? 'Organizing...' : 'Organize tasks'}
          </Button>
        </Stack>
      </Stack>
    </form>
  );
}
