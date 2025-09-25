import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import UndoIcon from '@mui/icons-material/Undo';
import {
  Box,
  Chip,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography
} from '@mui/material';

export default function CompletedTasksTable({ tasks, onEdit, onDelete, onRestore }) {
  if (!tasks?.length) {
    return null;
  }

  return (
    <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 4 }}>
      <Table size="small" aria-label="Completed tasks table">
        <TableHead>
          <TableRow>
            <TableCell>Title</TableCell>
            <TableCell>Category</TableCell>
            <TableCell>Priority</TableCell>
            <TableCell>Time logged</TableCell>
            <TableCell>Status summary</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {tasks.map((task) => (
            <TableRow key={task.id} hover>
              <TableCell sx={{ maxWidth: 320 }}>
                <Typography variant="subtitle1" fontWeight={600} sx={{ wordBreak: 'break-word' }}>
                  {task.title}
                </Typography>
                {task.details ? (
                  <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-line', wordBreak: 'break-word' }}>
                    {task.details}
                  </Typography>
                ) : null}
              </TableCell>
              <TableCell>
                <Chip label={task.category || 'Other'} size="small" variant="outlined" />
              </TableCell>
              <TableCell>
                <Chip label={task.priority || 'Medium'} size="small" color={task.priority === 'High' ? 'error' : task.priority === 'Medium' ? 'warning' : 'success'} variant="outlined" />
              </TableCell>
              <TableCell>
                {task.timeLog ? (
                  <Chip label={task.timeLog} size="small" variant="outlined" />
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    Not recorded
                  </Typography>
                )}
              </TableCell>
              <TableCell sx={{ minWidth: 220 }}>
                {task.statusSummary ? (
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {task.statusSummary}
                  </Typography>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No status summary
                  </Typography>
                )}
              </TableCell>
              <TableCell align="right">
                <Box sx={{ display: 'inline-flex', gap: 1 }}>
                  <Tooltip title="Restore to In Progress">
                    <span>
                      <IconButton size="small" color="warning" onClick={() => onRestore?.(task)} aria-label="Restore task">
                        <UndoIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title="Edit task">
                    <span>
                      <IconButton size="small" color="primary" onClick={() => onEdit?.(task)} aria-label="Edit task">
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title="Delete task">
                    <span>
                      <IconButton size="small" color="error" onClick={() => onDelete?.(task.id)} aria-label="Delete task">
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                </Box>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
