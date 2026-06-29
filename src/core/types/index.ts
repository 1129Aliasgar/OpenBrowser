export type OperationAction =
  | 'CREATE_FILE'
  | 'EDIT_FILE'
  | 'DELETE_FILE'
  | 'RENAME_FILE'
  | 'CREATE_FOLDER';

export interface FileOperation {
  action: OperationAction;
  path: string;
  content?: string;
  search?: string;
  replace?: string;
}

export interface AIResponse {
  operations: FileOperation[];
  conversationId: string;
  error?: string | null;
}
