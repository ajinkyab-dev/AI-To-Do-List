import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import FlagIcon from '@mui/icons-material/Flag'
import NotesIcon from '@mui/icons-material/Notes'
import {
  Card,
  CardActions,
  CardContent,
  Chip,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography
} from '@mui/material'
import { STATUS_OPTIONS } from '../utils/taskUtils'

const PRIORITY_COLOR = {
  High: 'error',
  Medium: 'warning',
  Low: 'success'
}

export default function TaskCard ({ task, onStatusChange, onEdit, onDelete, onTimeLogChange }) {
  const handleStatusChange = (event) => {
    onStatusChange?.(task.id, event.target.value, task)
  }

  const handleTimeChange = (event) => {
    onTimeLogChange?.(task.id, event.target.value)
  }

  return (
    <Card variant='outlined' sx={{ borderRadius: 4 }}>
      <CardContent>
        <Stack spacing={1.75}>
          <Stack direction='row' justifyContent='space-between' alignItems='flex-start' gap={1.5} sx={{ minWidth: 0 }}>
            <Stack spacing={1} flexGrow={1} sx={{ minWidth: 0 }}>
              <Typography variant='h6' component='h3' sx={{ fontWeight: 600, wordBreak: 'break-word' }}>
                {task.title}
              </Typography>
              <Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap sx={{ rowGap: 0.75 }}>
                <Chip
                  icon={<FlagIcon fontSize='small' />}
                  label={`Priority: ${task.priority}`}
                  color={PRIORITY_COLOR[task.priority] || 'default'}
                  size='small'
                />
                <Chip label={`Category: ${task.category}`} variant='outlined' size='small' />
                <Chip
                  label={task.status}
                  variant={task.status === 'Completed' ? 'filled' : 'outlined'}
                  color={task.status === 'Completed' ? 'success' : task.status === 'In Progress' ? 'warning' : 'default'}
                  size='small'
                />
                {task.timeLog && task.status === 'Completed' ? (
                  <Chip label={`Time: ${task.timeLog}`} variant='outlined' size='small' />
                ) : null}
              </Stack>
            </Stack>
          </Stack>
          {task.details ? (
            <Typography variant='body2' color='text.secondary' sx={{ whiteSpace: 'pre-line', wordBreak: 'break-word' }}>
              {task.details}
            </Typography>
          ) : null}
          {task.notes?.length ? (
            <Stack direction='row' spacing={1} alignItems='flex-start' flexWrap='wrap' useFlexGap sx={{ rowGap: 0.5 }}>
              <Chip icon={<NotesIcon fontSize='small' />} label='Notes' color='primary' variant='outlined' size='small' />
              {task.notes.map((note) => (
                <Chip
                  key={note}
                  label={note}
                  variant='outlined'
                  size='small'
                  sx={{ wordBreak: 'break-word', maxWidth: '100%' }}
                />
              ))}
            </Stack>
          ) : null}
        </Stack>
      </CardContent>
      <CardActions
        sx={{
          justifyContent: 'space-between',
          px: 2.5,
          pb: 2.5,
          gap: 1.5,
          flexWrap: 'wrap'
        }}
      >
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1.5}
          alignItems={{ xs: 'stretch', sm: 'center' }}
          flexWrap='wrap'
          useFlexGap
          sx={{ flexGrow: 1, minWidth: 0 }}
        >
          <FormControl
            size='small'
            fullWidth
            sx={{ minWidth: { xs: '100%', sm: 160 }, flexBasis: { xs: '100%', sm: 'auto' } }}
          >
            <InputLabel id={`status-label-${task.id}`}>Status</InputLabel>
            <Select labelId={`status-label-${task.id}`} label='Status' value={task.status} onChange={handleStatusChange}>
              {STATUS_OPTIONS.map((status) => (
                <MenuItem key={status} value={status}>
                  {status}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {task.status === 'Completed' ? (
            <TextField
              size='small'
              label='Time logged'
              placeholder='e.g. 2h'
              value={task.timeLog || ''}
              onChange={handleTimeChange}
              fullWidth
              sx={{ minWidth: { xs: '100%', sm: 150 }, flexBasis: { xs: '100%', sm: 'auto' } }}
            />
          ) : null}
        </Stack>
        <Stack direction='row' spacing={1} alignItems='center' flexWrap='wrap' useFlexGap>
          <IconButton aria-label='Edit task' onClick={() => onEdit?.(task)} size='small' color='primary'>
            <EditIcon fontSize='small' />
          </IconButton>
          <IconButton aria-label='Delete task' onClick={() => onDelete?.(task.id)} size='small' color='error'>
            <DeleteIcon fontSize='small' />
          </IconButton>
        </Stack>
      </CardActions>
    </Card>
  )
}
