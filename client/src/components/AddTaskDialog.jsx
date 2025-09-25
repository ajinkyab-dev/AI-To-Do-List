import { useState } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField } from '@mui/material';

export default function AddTaskDialog({ open, onClose, onSubmit, loading }) {
  const [notes, setNotes] = useState('');

  const handleClose = () => {
    setNotes('');
    onClose?.();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!notes.trim()) {
      return;
    }
    await onSubmit?.(notes);
    setNotes('');
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm" component="form" onSubmit={handleSubmit}>
      <DialogTitle>Add tasks via AI</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Describe tasks"
            placeholder="Draft quarterly report, follow up with vendor, prepare demo script"
            multiline
            minRows={4}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            disabled={loading}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" variant="contained" disabled={loading || !notes.trim()}>
          {loading ? 'Adding...' : 'Add tasks'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
