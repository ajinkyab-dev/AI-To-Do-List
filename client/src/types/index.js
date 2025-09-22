/**
 * @typedef {Object} OrganizedTask
 * @property {string} title
 * @property {"High"|"Medium"|"Low"} priority
 * @property {string} category
 * @property {string[]} notes
 */

/**
 * @typedef {Object} OrganizedResponse
 * @property {OrganizedTask[]} tasks
 * @property {boolean} grouped
 */
export const TaskPriority = {
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low'
};
