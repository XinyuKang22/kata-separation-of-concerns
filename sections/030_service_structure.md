# Structuring a service

## Examining current structure

Take a look at the `POST` handler in `server.ts` and also the implementation of the evidence service in `node-services/file-handler/src/services/evidenceService.ts`.

Sketch out the current behaviour of the `POST` handler and `fileUpload` in the evidence service.

Compare it with [this example](https://agiledigital.atlassian.net/wiki/spaces/FORGE/pages/27197539/Separating+Concerns).

1. Does your understanding of the code match the description in that confluence page? If not, where do they differ?
2. Is the behaviour of the evidence service clear to you?

Read through the rest of [that confluence page](https://agiledigital.atlassian.net/wiki/spaces/FORGE/pages/27197539/Separating+Concerns).

## Identifying key function

As noted in the confluence page, the `file-handler` service performs a few key functions for each request:

1. Reads the environment to set up its dependencies.
2. Parses the incoming request (leveraging `fastify`).
3. Invokes the virus scanning service.
4. Interprets the results to decide what to do.
5. Uploads the content to S3.
6. Sometimes, updates mongo with the metadata.
7. Returns a HTTP response to the caller (leveraging `fastify`).

This general pattern will repeat in nearly everything that we build.

None of these things are performed well in the current solution. Even for this very small piece of code, the solution is harder than it should be to understand, the solution is harder to operate (it fails slow), and by mixing logic and effects (calling external services) the solution's logic is harder to test.

For the rest of the kata, we are going to refactor the service to more closely adhere to our principles of clean code - particularly the Separation of Concerns.

1. Can you think of any other key functions that the service performs?
2. What types of service wouldn't receive an outside request to perform their work?
