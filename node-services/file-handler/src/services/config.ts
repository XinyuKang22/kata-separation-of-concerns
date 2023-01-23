import { cleanEnv, str, CleanedEnvAccessors, num, bool } from "envalid";

const EnvValidator = {
  AWS_DEFAULT_REGION: str(),
  PRODUCTION_DEPLOYMENT: bool(),
  SCANNED_BUCKET: str(),
  QUARANTINE_BUCKET: str(),
  MAXIMUM_FILE_UPLOAD_SIZE: num(),
};

export type Config = Readonly<
  {
    QUARANTINE_BUCKET: string;
    MAXIMUM_FILE_UPLOAD_SIZE: number;
    AWS_DEFAULT_REGION: string;
    PRODUCTION_DEPLOYMENT: boolean;
    SCANNED_BUCKET: string;
  } & CleanedEnvAccessors
>;

export type ConfigErrors = Partial<Record<keyof typeof EnvValidator, Error>>;

/**
 * Fetches all the required environment variables and fails if any of
 * them are not set.
 *
 * @returns All required environment variables
 */
export const readConfig = (
  env: typeof process.env
):
  | { errors: ConfigErrors }
  | {
      config: Config;
    } => {
  let errors: ConfigErrors = {};
  const config = cleanEnv(env, EnvValidator, {
    reporter: ({ errors: errors_ }) => {
      errors = errors_;
    },
  });

  return Object.keys(errors).length ? { errors } : { config };
};
