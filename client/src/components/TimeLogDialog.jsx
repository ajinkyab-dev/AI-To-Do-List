import { useEffect, useState } from "react";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField, Typography } from "@mui/material";

export default function TimeLogDialog({ open, taskTitle, initialValue, onCancel, onSave }) {
  const [value, setValue] = useState(initialValue || "");

  useEffect(() => {
    if (open) {
      setValue(initialValue || "");
    }
  }, [open, initialValue]);

  const handleSubmit = (event) => {
    event.preventDefault();
    onSave?.(value.trim());
  };

  return (
    <Dialog open={open} onClose={onCancel} fullWidth maxWidth="xs" component="form" onSubmit={handleSubmit}>
      <DialogTitle>Log time spent</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            {taskTitle ? `How much time did you spend on "${taskTitle}"?` : "How much time did you spend?"}
          </Typography>
          <TextField
            autoFocus
            label="Time spent"
            placeholder="e.g. 2h 30m"
            value={value}
            onChange={(event) => setValue(event.target.value)}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>Skip</Button>
        <Button type="submit" variant="contained">
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}
