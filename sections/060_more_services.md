# Refactoring 201

Let's turn our focus back to `evidenceService.ts`. Having seen how the service is created in `index.ts`, you may see a reasonable pattern for creating the server emerging:

1. Read configuration from the environment.
2. Use configuration to satisfy the dependencies of the `EvidenceService` and create an instance of it.
3. Use the service instance to satisfy the dependencies of the `buildFastifyServer` function and create an instance of `FastifyServer`.
4. Start that server.

We can invert this and think instead that our goal is to create an instance of the server then work backwards through the dependencies that we need.

1. An alternative pattern may be to pass the `EvidenceServiceConfiguration` into `buildFastifyServer` and provide the necessary configuration as parameters when `EvidenceService+fileUpload` is called. What would be the advantages and disadvantages of this approach?

Martin Fowler [described three types of dependency injection](https://martinfowler.com/articles/injection.html#FormsOfDependencyInjection):

1. Which type of Dependency Injection have we adopted in this solution?

## Splitting up the Evidence Service

The `EvidenceService` is doing a lot of work in our implementation at the moment. Referring back to our original list of concerns, after our configuration refactor, responsibilities are allocated per:

1. Reads the environment to set up its dependencies - `index.ts` (the 'Assembler' in Fowler's article).
2. Parses the incoming request - `Fastify`.
3. Invokes the virus scanning service - `EvidenceService`.
4. Interprets the results to decide what to do - `EvidenceService`.
5. Uploads the content to S3 - `awsService.ts`.
6. Sometimes, updates mongo with the meta-data - `EvidenceService`.
7. Returns a HTTP response to the caller  - `Fastify`.

Not only is the `EvidenceService` doing the bulk of the work, but it is also tied to (and has intimate knowledge of) the current implementations for virus scanning, uploading content and storing (and reading) meta-data.

The refactoring that we did earlier gives us a clear picture of the 

Let's split the EvidenceService into more pieces:

1. A `MetaDataService` that provides methods to write and read meta-data.
2. A `VirusScanningService` that provide a method to scan content.

Let's also refactor `awsService.ts` to be a class that we can construct an instance of and pass into the `EvidenceService`.

## MetaDataService

Starting with the `MetaDataService`, create a new file `metaDataService.ts` and define a new class:

```typescript
export type MetaDataServiceConfiguration = {
};

export class MetaDataService {

  readonly configuration: MetaDataServiceConfiguration;

  constructor(configuration: MetaDataServiceConfiguration) {
    this.configuration = configuration;
  }
```

Then grab the functions that relate to handling meta-data and convert them to methods of that class.

You'll notice that those methods currently accept 'configuration' info (e.g. the mongodb username and password) in their parameters. That configuration is implementation specific and shouldn't be controlled by the caller - it should be provided by the "Assembler" when the MetaDataService is instantiated.

// TODO add diagram with config at creation vs parameters at usage.

Move that configuration out of the method parameters into the constructor's configuration type.

You should be able to remove mongo specific configuration from `EvidenceServiceConfiguration`. Update the constructor of `EvidenceService` to take an instance of `MetaDataService` and call that service in `handleCleanFile`.

1. What else do you need to update to have the service compile and start successfully?

Make that change, test the service and verify that it all works.

2. Draw a diagram of the 'dependency graph' at this point? Is it getting taller or shorter?
3. Is `EvidenceService` getting smaller or larger? Is it becoming more or less complex? How do we measure complexity of a class or function?
3. Is it easier or harder to read `evidenceService.ts` and understand what the solution does?

## Virus Scanning Service and AWS Service

You should be able follow the same process as before to create a new Virus Scanning Service and refactor `awsService.ts` to be a class.

1. Draw a diagram of the 'dependency graph' at this point? Is it getting taller or shorter?
2. What is left in the `EvidenceServiceConfiguration`?

## Another Service?

`EvidenceService` is now getting quite small. It orchestrates the virus scanner, meta-data and AWS services to perform work. Besides that, it only has one responsibility: interpret the results of the virus scan and decide what to do next. That decision is very simple.

In some cases, decisions may be much more complex. It may be that whether to quarantine the file depends on more factors:

* size or format of the file
* whether it appears to contain objectionable content
* whether it appears to contain copyrighted content
* per-user settings that affect our interpretation of the above

We can imagine a function like:

```typescript
const shouldQuarantine(infected: boolean, size: number, format: FileFormat, objectionable: boolean, copyrighted: boolean, customerDetails: CustomerAgreement): boolean => {
  // LOTS OF COMPLEX RULES HERE
}
```

Such a function may well be better extracted into another Service and passed into the `EvidenceService`. Doing so allows us to thoroughly test that the rules operate as expected.

In this case, the rule is simple enough that we are happy to leave it as part of the `EvidenceService`.

## Wrapping up

1. What is the cyclometric complexity of the `fileUpload` method?
2. What are the branches?
3. Does the implementation provide better log messages or responses when receiving good and bad requests?