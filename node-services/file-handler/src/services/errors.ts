export interface Errors {
  errors: string[];
  extensions?: Record<string, unknown>;
}

/**
 * @return True if `maybeErrors` has type `Errors`.
 */
export const isErrors = (maybeErrors: unknown): maybeErrors is Errors =>
  typeof maybeErrors === "object" &&
  maybeErrors !== null &&
  maybeErrors &&
  "errors" in maybeErrors;

/**
 * @param error A caught error.
 * @param contextMessage Used in the message like `Error while ${contextMessage}.`
 */
export const toErrors = (error: unknown, contextMessage: string): Errors =>
  isErrors(error)
    ? error
    : {
        errors: [
          !error
            ? `Error while ${contextMessage}.`
            : error instanceof Error
            ? `${error.name} while ${contextMessage}. ${error.message}`
            : typeof error === "string"
            ? `Error while ${contextMessage}. ${error}`
            : `Error while ${contextMessage}. ${JSON.stringify(error)}`,
        ],
      };

export const combineErrors = (
  maybeErrors1: unknown,
  maybeErrors2: unknown
): Errors => ({
  errors: [
    ...(isErrors(maybeErrors1) ? maybeErrors1.errors : []),
    ...(isErrors(maybeErrors2) ? maybeErrors2.errors : []),
  ],
});
