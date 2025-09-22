import { useMutation } from '@tanstack/react-query';
import { organizeTasks } from '../api';

export function useTaskOrganizer() {
  return useMutation({
    mutationFn: organizeTasks
  });
}
