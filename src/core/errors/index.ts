export class OpenBrowserError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OpenBrowserError';
  }
}

export class ValidationError extends OpenBrowserError {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}
