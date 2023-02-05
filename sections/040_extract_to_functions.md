# Re-factoring 101

The simplest refactoring that we can usefully perform is to break up long, difficult to maintain functions into smaller functions that have informative names. That way a reader will be able to understand the logic of the function without having to mentally abstract away the details. That is, it will be easier to build a mental model of what the function does.

Let's do that to `EvidenceService+fileUpload` method. Start with the three statements that scan the content for viruses.

```typescript
const tempOptions = { 
    debugMode: false,
    clamscan: {
        active: false,
    },
    clamdscan: {
        host: process.env["CLAMAV_HOST"],
        port: parseInt(process.env["CLAMAV_PORT"] || ""),
        localFallback: false,
    }
    };
const clamScan = await new NodeClam().init(tempOptions);

const scanResults = await clamScan.scanStream(Readable.from(fileBuffer));
```

Refactor this into a new function named `scanContentForViruses`. Make sure that it is a *function* and not a *method* of the service (and that you understand the difference between the two). The new function should take a single parameter.

Refactor the code that handles an infected file:

```typescript
await uploadFileToS3(
    process.env["QUARANTINE_BUCKET"] || "",
    s3Key,
    fileBuffer
);

return new Error("File is infected");
```

info a function named `handleInfectedFile`. Then do the same for the branch that handles an uninfected file, naming the function `handleCleanFile`.

As `handleCleanFile` is doing two things (uploading to S3 and storing metadata in mongo), also refactor the lines that store the metadata into a new function.

Lastly, refactor the code that builds the s3Key into a function named `s3KeyForContent`.

Verify that `fileUpload` looks like:

```typescript
  async fileUpload(
    inputParameters: UploadRequest["body"]["input"]["data"],
    requestHeaders: http.IncomingHttpHeaders,
    log: FastifyBaseLogger
  ): Promise<{ evidence_id: string } | Errors> {
      const fileBuffer = Buffer.from(inputParameters.base64_data, "base64");

      const uuid = uuidv4();
      const s3Key = s3KeyForContent(uuid, inputParameters);

      const scanResults = await scanContentForViruses(fileBuffer);
      if (scanResults.isInfected) {

        return await handleInfectedFile(s3Key, fileBuffer);
      } else {
    
        return await handleCleanFile(s3Key, fileBuffer, inputParameters);
      }
    };
```

1. Is this method more readable than when you started refactoring? Why?
2. Does your answer to the first question depend on how much you can trust the functions that you just extracted to do what their name and type says?
3. Is there anything else worth extracting from this method?
4. At what points in this refactoring process did you send requests to the server to check it still worked?
5. Did you get any other feedback that gave you confidence that the refactors were correct?

## Reviewing the refactor

This refactor makes the core of the business logic (check file for viruses, do different things depending on whether it is infected) clearer to a reader. It doesn't address other issues that we uncovered earlier:

1. Failing slow (i.e. when a request is made, instead of at startup) when environment is broken.
2. Lack of informative log messages.
3. Mixing logic with effects.
4. Lack of error handling.
5. Difficulty of testing.

However, it gives us a better foundation to start addressing those issues.

Stripping away details to expose the underlying business logic (as you've done here) is a simple, relatively safe and valuable way to understand the behaviour of a system before embarking on more serious refactoring.
