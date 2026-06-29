export type OperationAction =
  | 'CREATE_FILE'
  | 'EDIT_FILE'
  | 'DELETE_FILE'
  | 'RENAME_FILE'
  | 'CREATE_FOLDER'
  | 'RUN_COMMAND';

export interface FileOperation {
  action: OperationAction;
  path?: string;
  content?: string;
  search?: string;
  replace?: string;
  startLine?: number;
  endLine?: number;
  command?: string;
}

export interface AIResponse {
  operations: FileOperation[];
  conversationId: string;
  error?: string | null;
}
