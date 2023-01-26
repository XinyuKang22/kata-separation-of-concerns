
export const chainableError = (
    error: unknown
  ): Error => 
      error === undefined
        ? new Error("Unknown cause")
        : error instanceof Error
        ? error
        : typeof error === 'string'
        ? new Error(error)
        : new Error(JSON.stringify(error));
