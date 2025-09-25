import { useEffect, useState } from 'react'
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField, Typography } from '@mui/material'

export default function StatusUpdateDialog ({
  open,
  status,
  taskTitle,
  initialSummary = '',
  initialTime = '',
  onCancel,
  onSave
}) {
  const [description, setDescription] = useState(initialSummary)
  const [timeLog, setTimeLog] = useState(initialTime)

  useEffect(() => {
    if (open) {
      setDescription(initialSummary || '')
      setTimeLog(initialTime || '')
    }
  }, [open, initialSummary, initialTime])

  const handleSubmit = (event) => {
    event.preventDefault()
    onSave?.({
      description: description.trim(),
      timeLog: timeLog.trim()
    })
  }

  const headline = status === 'Completed' ? 'Add completion details' : 'Add progress details'
  const descriptionLabel = status === 'Completed' ? 'What was completed? (optional)' : 'Progress so far (optional)'
  const helperText = taskTitle ? `Task: ${taskTitle}` : ''

  return (
    <Dialog open={open} onClose={onCancel} fullWidth maxWidth='sm' component='form' onSubmit={handleSubmit}>
      <DialogTitle>{headline}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {helperText ? (
            <Typography variant='body2' color='text.secondary'>
              {helperText}
            </Typography>
          ) : null}
          <TextField
            label={descriptionLabel}
            multiline
            minRows={3}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
          <TextField
            label='Time spent (optional)'
            placeholder='e.g. 1h 45m'
            value={timeLog}
            onChange={(event) => setTimeLog(event.target.value)}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>Skip</Button>
        <Button type='submit' variant='contained'>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  )
}
