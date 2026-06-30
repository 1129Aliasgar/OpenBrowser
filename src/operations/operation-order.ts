import type { FileOperation } from '../core/types/index.js';

const EXECUTION_ORDER: Record<string, number> = {
  CREATE_FOLDER: 0,
  CREATE_FILE: 1,
  EDIT_FILE: 2,
  RENAME_FILE: 3,
  DELETE_FILE: 4,
  RUN_COMMAND: 5,
};

/** Run folders and file writes before shell commands. */
export function sortOperationsByExecutionOrder(operations: FileOperation[]): FileOperation[] {
  return [...operations]
    .map((operation, index) => ({ operation, index }))
    .sort((left, right) => {
      const leftOrder = EXECUTION_ORDER[left.operation.action] ?? 9;
      const rightOrder = EXECUTION_ORDER[right.operation.action] ?? 9;
      if (leftOrder !== rightOrder) {
        return leftOrder - rightOrder;
      }
      return left.index - right.index;
    })
    .map(({ operation }) => operation);
}
