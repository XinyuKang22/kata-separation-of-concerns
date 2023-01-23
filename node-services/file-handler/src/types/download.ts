export interface DownloadRequest {
  body: {
    action: {
      name: string;
    };
    input: {
      data: {
        evidence_id: string;
      };
    };
  };
}
