import { useEffect, useState } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, InputLabel, MenuItem, Select, Stack, TextField } from '@mui/material';
import { CATEGORY_OPTIONS, PRIORITY_OPTIONS, STATUS_OPTIONS } from '../utils/taskUtils';

const DEFAULT_TASK = {
  title: '',
  priority: 'Medium',
  category: 'Work',
  status: 'To Do',
  details: ''
};

export default function TaskEditorDialog({ open, task, onClose, onSave, onGenerateTitle, generatingTitle, isCreating }) {
  const [draft, setDraft] = useState(DEFAULT_TASK);
  const [autoRequested, setAutoRequested] = useState(false);

  useEffect(() => {
    if (task) {
      setDraft({
        title: task.title || '',
        priority: task.priority || 'Medium',
        category: task.category || 'Work',
        status: task.status || 'To Do',
        details: task.details || ''
      });
    } else {
      setDraft(DEFAULT_TASK);
    }
    setAutoRequested(false);
  }, [task]);

  useEffect(() => {
    if (!open) {
      setAutoRequested(false);
      return;
    }

    if (isCreating) {
      return;
    }

    if (!draft.details || !onGenerateTitle || autoRequested || generatingTitle) {
      return;
    }

    setAutoRequested(true);
    (async () => {
      try {
        const result = await onGenerateTitle({ ...draft });
        if (result?.title) {
          setDraft((prev) => ({ ...prev, title: result.title }));
        }
      } catch (error) {
        // ignore, user can trigger manually
      }
    })();
  }, [open, draft, isCreating, onGenerateTitle, autoRequested, generatingTitle]);

  const handleChange = (key) => (event) => {
    setDraft((prev) => ({ ...prev, [key]: event.target.value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!draft.title.trim()) {
      return;
    }
    onSave?.(draft);
  };

  const handleGenerateTitle = async () => {
    if (!onGenerateTitle) return;
    try {
      const result = await onGenerateTitle(draft);
      if (result?.title) {
        setDraft((prev) => ({ ...prev, title: result.title }));
      }
    } catch (error) {
      // no-op
    }
  };

  const handleClose = () => {
    setAutoRequested(false);
    onClose?.();
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm" component="form" onSubmit={handleSubmit}>
      <DialogTitle>{isCreating ? 'Create task' : 'Edit task'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'stretch', sm: 'flex-end' }}>
            <TextField
              label="Task title"
              value={draft.title}
              onChange={handleChange('title')}
              required
              fullWidth
              autoFocus
            />
            <Button onClick={handleGenerateTitle} disabled={generatingTitle} variant="outlined">
              {generatingTitle ? 'Generating...' : 'Generate title'}
            </Button>
          </Stack>
          <TextField
            label="Details"
            placeholder="Extended description, acceptance criteria, etc."
            value={draft.details}
            onChange={handleChange('details')}
            multiline
            minRows={3}
          />
          <FormControl fullWidth>
            <InputLabel id="priority-label">Priority</InputLabel>
            <Select labelId="priority-label" label="Priority" value={draft.priority} onChange={handleChange('priority')}>
              {PRIORITY_OPTIONS.map((priority) => (
                <MenuItem key={priority} value={priority}>
                  {priority}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth>
            <InputLabel id="category-label">Category</InputLabel>
            <Select labelId="category-label" label="Category" value={draft.category} onChange={handleChange('category')}>
              {CATEGORY_OPTIONS.map((category) => (
                <MenuItem key={category} value={category}>
                  {category}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth>
            <InputLabel id="status-label">Status</InputLabel>
            <Select labelId="status-label" label="Status" value={draft.status} onChange={handleChange('status')}>
              {STATUS_OPTIONS.map((status) => (
                <MenuItem key={status} value={status}>
                  {status}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button type="submit" variant="contained" disabled={!draft.title.trim()}>
          Save changes
        </Button>
      </DialogActions>
    </Dialog>
  );
}
