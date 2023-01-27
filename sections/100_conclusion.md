# Conclusion

At the end of this exercise, responsibilities have been re-allocated per:

| What                     | Where      | When |
| ---- | --- | --- |
| Creating business metrics | Assembler | Creation |
| Read environment to set up dependencies | Assembler | Creation |
| Create Services | Assembler (top-level `index.ts`) | Creation |
| Create routes            | Assembler | Creation |
| Start server             | Assembler | Creation |
| Parse incoming request from HTTP to domain-specific type | Route Handler (`server.ts`) | Usage |
| Adding request specific data to logging context | Route Handler | Usage |
| Orchestrate other services | `EvidenceService` | Usage |
| Call virus scanning service | `VirusScanningService` | Usage |
| Interprets the results to decide what to do. | `EvidenceService` | Usage |
| Uploads the content to S3. | `AwsService` | Usage |
| Sometimes, updates MongoDBwith the metadata. | `MetadataService` | Usage |
| Measuring business metrics | `EvidenceService` + `AwsService` | Usage |
| Translate domain-specific response to HTTP response | Route Handler | Usage |

Re-read [our confluence page on the separation of concerns](https://agiledigital.atlassian.net/wiki/spaces/FORGE/pages/27197539/Separating+Concerns). Rate the adequacy of the solution with respect to these key points:

* effecting dependencies are passed to (rather than created by) orchestration or logic-heavy components;
* configuration is loaded at start-up and the system stops with a failure if it is misconfigured;
* transport / protocol translation is separate to orchestration / logical decisions,
* a domain-specific interface is defined and documented.

1. The are many more files and services in our solution now. Do you think that the solution is harder or easier to understand?
2. We've adopted an approach of injecting dependencies into the constructors of classes. What other approaches exist for providing dependencies?
3. We've modelled 'effects' as `Promise<... | Error>`. What other approaches to modelling effects are you aware of?

## Extension exercises
* Clean up the extraction of the `evidenceId` from the path in the GET handler. Consider whether the route handler should know that the id is not a `string`, but is actually a MongoDB Object ID.
* Add more considered error handling throughout the solution.
* Find a way to have `fastify` provide 'good' responses when run by a developer and 'secure' responses when run in production. What is the downside of this approach?
* Write tests for the `EvidenceService` using (eg) `jest`.
