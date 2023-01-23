import {
  Errors,
} from "../services";
import { DownloadRequest, UploadRequest } from "../types";

export type Evidence = UploadRequest["body"]["input"]["data"] & {
  readonly s3_key: string,
  readonly quarantined: boolean
}

const evidence = new Map<string, Evidence>;

export const createEvidence = async (
  inputParameters: UploadRequest["body"]["input"]["data"],
  uuid: string,
  s3_key: string,
  quarantined: boolean
): Promise<string | Errors> => {

  evidence.set(uuid, {
    ...inputParameters,
    s3_key,
    quarantined,
  });

  return Promise.resolve(uuid);
};

export const getEvidenceS3Key = async (
  uuid: string
): Promise<Evidence | Errors> => {

  const found = evidence.get(uuid);

  return (
    found ?? {
      errors: [
        `Unable to find s3 key for evidence [${uuid}].`,
      ],
    }
  );
};
