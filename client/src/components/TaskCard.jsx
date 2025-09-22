import { useState } from 'react';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import FlagIcon from '@mui/icons-material/Flag';
import NotesIcon from '@mui/icons-material/Notes';
import { Button, Card, CardActions, CardContent, Chip, FormControl, IconButton, InputLabel, MenuItem, Select, Stack, TextField, Tooltip, Typography } from '@mui/material';
import { STATUS_OPTIONS } from '../utils/taskUtils';

const PRIORITY_COLOR = {
  High: 'error',
  Medium: 'warning',
  Low: 'success'
};

export default function TaskCard({ task, onStatusChange, onEdit, onDelete, onTimeLogChange }) {
  const [copyState, setCopyState] = useState('idle');

  const handleStatusChange = (event) => {
    onStatusChange?.(task.id, event.target.value);
  };

  const handleTimeChange = (event) => {
    onTimeLogChange?.(task.id, event.target.value);
  };

  const canCopyStatus = Boolean(task.statusSummary);
  const clipboardAvailable = typeof navigator !== 'undefined' && navigator.clipboard?.writeText;
  const isCopying = copyState === 'copying';
  const copyLabel = copyState === 'copied' ? 'Copied!' : copyState === 'error' ? 'Copy failed' : 'Copy status';
  const buttonText = copyState === 'copied' ? 'Copied!' : copyState === 'error' ? 'Retry copy' : 'Copy status';
  const tooltipTitle = !clipboardAvailable
    ? 'Clipboard unavailable'
    : copyState === 'error'
      ? 'Copy failed. Try again.'
      : copyLabel;

  const handleCopyStatus = async () => {
    if (!canCopyStatus || !clipboardAvailable) {
      return;
    }

    try {
      setCopyState('copying');
      await navigator.clipboard.writeText(task.statusSummary);
      setCopyState('copied');
      setTimeout(() => setCopyState('idle'), 2000);
    } catch (error) {
      console.warn('Unable to copy generated status', error);
      setCopyState('error');
      setTimeout(() => setCopyState('idle'), 3000);
    }
  };

  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardContent>
        <Stack spacing={1.5}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1.5}>
            <Stack spacing={1} flexGrow={1}>
              <Typography variant="h6" component="h3" sx={{ fontWeight: 600 }}>
                {task.title}
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Chip
                  icon={<FlagIcon fontSize="small" />}
                  label={`Priority: ${task.priority}`}
                  color={PRIORITY_COLOR[task.priority] || 'default'}
                  size="small"
                />
                <Chip label={`Category: ${task.category}`} variant="outlined" size="small" />
                <Chip
                  label={task.status}
                  variant={task.status === 'Completed' ? 'filled' : 'outlined'}
                  color={task.status === 'Completed' ? 'success' : task.status === 'In Progress' ? 'warning' : 'default'}
                  size="small"
                />
                {task.timeLog && task.status === 'Completed' ? (
                  <Chip label={`Time: ${task.timeLog}`} variant="outlined" size="small" />
                ) : null}
              </Stack>
            </Stack>
          </Stack>
          {task.details ? (
            <Typography variant="body2" color="text.secondary">
              {task.details}
            </Typography>
          ) : null}
          {task.notes?.length ? (
            <Stack direction="row" spacing={1} alignItems="flex-start" flexWrap="wrap" useFlexGap>
              <Chip icon={<NotesIcon fontSize="small" />} label="Notes" color="primary" variant="outlined" size="small" />
              {task.notes.map((note) => (
                <Chip key={note} label={note} variant="outlined" size="small" />
              ))}
            </Stack>
          ) : null}
          {task.statusSummary ? (
            <Stack spacing={0.75} sx={{ p: 1.5, borderRadius: 2, border: '1px solid', borderColor: 'divider', bgcolor: 'background.default' }}>
              <Typography variant="subtitle2" color="text.secondary">
                Generated status
              </Typography>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                {task.statusSummary}
              </Typography>
            </Stack>
          ) : null}
        </Stack>
      </CardContent>
      <CardActions sx={{ justifyContent: 'space-between', px: 2.5, pb: 2.5, gap: 1.5, flexWrap: 'wrap' }}>
        <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel id={`status-label-${task.id}`}>Status</InputLabel>
            <Select labelId={`status-label-${task.id}`} label="Status" value={task.status} onChange={handleStatusChange}>
              {STATUS_OPTIONS.map((status) => (
                <MenuItem key={status} value={status}>
                  {status}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {task.status === 'Completed' ? (
            <TextField
              size="small"
              label="Time logged"
              placeholder="e.g. 2h"
              value={task.timeLog || ''}
              onChange={handleTimeChange}
            />
          ) : null}
        </Stack>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          {task.statusSummary ? (
            <Tooltip title={tooltipTitle} disableHoverListener={copyState === 'copied'}>
              <span>
                <Button
                  variant="contained"
                  color="secondary"
                  size="small"
                  startIcon={<ContentCopyIcon fontSize="small" />}
                  onClick={handleCopyStatus}
                  disabled={!clipboardAvailable || !canCopyStatus || isCopying}
                >
                  {buttonText}
                </Button>
              </span>
            </Tooltip>
          ) : null}
          <IconButton aria-label="Edit task" onClick={() => onEdit?.(task)} size="small" color="primary">
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton aria-label="Delete task" onClick={() => onDelete?.(task.id)} size="small" color="error">
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Stack>
      </CardActions>
    </Card>
  );
}

