declare module 'enquirer' {
  import type { Interface } from 'node:readline';

  export class AutoComplete extends Interface {
    constructor(options: {
      name: string;
      message: string;
      limit?: number;
      multiple?: boolean;
      choices: Array<{ name: string; value: string }>;
    });
    run(): Promise<string | string[]>;
  }
}
