export interface UploadRequest {
  body: {
    action: {
      name: string;
    };
    input: {
      data: {
        filename: string;
        base64_data: string;
        name: string;
        description: string;
      };
    };
  };
}
