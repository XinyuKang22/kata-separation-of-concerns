# Failing slow

Next, let's address the 'fail slow' issue. In general, we prefer that - if a service isn't correctly configured - it fails straight away and with a helpful error message. Having to exercise the service to verify whether it is correctly configured slows us down and reduces our confidence in any release. It also makes it harder to onboard a new developer if they have to run lengthy feedback cycles to get the configuration correct.

Let's start by creating a type that will represent a 'valid' configuration for the service.

Go through the implementation of `EvidenceService` and find all the places where it uses `process.env` to pull configuration out of the environment. These are all candidates for putting into our configuration type.

Create that type inside `evidenceService.ts` and export it:

```typescript
export type EvidenceServiceConfiguration = {
  clamAv: {
    host: string;
    port: number;
  },
  [OTHER CONFIGURATION GOES HERE]
};
```

And add a constructor to the `EvidenceService` that accepts a parameter of that type:

```typescript
  readonly configuration: EvidenceServiceConfiguration;

  constructor(configuration: EvidenceServiceConfiguration) {
    this.configuration = configuration;
  }
```

Check Tilt.

1. Is the `file-handler` service healthy?
2. What error is it reporting?

Open up `node-services/file-handler/src/index.ts`. This top-level file is responsible for building the server and then starting it. In order to build the server, it needs to be passed its dependencies. Right now, it only has one dependency - the `EvidenceService`.

`index.ts` needs to be updated so that it provides the necessary configuration to the `EvidenceService`.

Let's start off with a simple approach: copy the lines that pull from the environment in `evidenceService.ts` into `index.ts` and use them to create an object that conforms to the `EvidenceServiceConfigurationType`.

```typescript
const evidenceServiceConfiguration = {
  clamAv: {
    host: process.env["CLAMAV_HOST"] || "",
    port: parseInt(process.env["CLAMAV_PORT"] || "")
  },
  [OTHER SETUP GOES HERE]
}
```

and pass it into the `EvidenceService` constructor:

```typescript
const evidenceService = new EvidenceService(evidenceServiceConfiguration);
```

Comment out the `host` field in the configuration.

1. Where do you see the compilation error reported? Where you create the configuration? Where it is passed into the constructor? Why?
2. Is there a way to have the error reported at the line where the configuration is created?
3. Do you think it is more useful to see the error where it is created or used?

Fix your code again and confirm in Tilt that the service has been redeployed. All usages of `process.env[...]` inside `evidenceService.ts` should now be redundant - the same information should be available in the configuration.

Replace those `process.env[...]` calls with the information that you have in the configuration. Since we refactored into separate functions earlier, you will have to pass configuration from the methods into those functions when you call them.

Once you've finished, check that there are no `process.env` calls left in the `EvidenceService` and that making requests to scan content still works.

1. When passing configuration to the functions, did you choose to pass the entire configuration, a sub-object of the configuration or individual parameters? Why?

In general, we prefer to pass only what is necessary to functions. It may be convenient to 're-use' the definition of `EvidenceServiceConfiguration`, but it means that:

1. Those functions require and have access to more information than they need. Callers of those functions may have to provide nonsense values.
2. If we update the `EvidenceServiceConfiguration` to have more data we (may) have to update callers of those functions to provide that extra data.
3. In this case, we would unnecessarily couple the functions with the `EvidenceService`.

## Testing changes

Edit `helm/templates/nodes-services.yml` and delete (or comment out) `CLAMAV_HOST` again. Watch the service restart in Tilt.

1. Does the service start up? Why?
2. Does it respond correctly to requests to scan content?

## Making configuration mandatory

You should have noticed that we've effectively provided an unsafe value for the ClamAV host when reading the configuration:

```typescript
const evidenceServiceConfiguration = {
  clamAv: {
    host: process.env["CLAMAV_HOST"] || "", // THIS IS MAKING "" OUR UNSAFE DEFAULT.
```

`""` is definitely not a safe default value. In this case, there is no safe default, so we need to have `index.ts` fail when no value is provided. We'll introduce better ways of handling this in a subsequent chapter, but for now, let's make a simple function:

```typescript
const requiredEnvironment = (name: string): string => {
  const value = process.env[name];
  if (value === undefined) {
    throw new Error(`Environment [${name}] is required, but was not defined, failing.`);
  }
  return value;
}
```

then update the creation of the configuration object to use that instead of `process.env` directly.

Now watch the service restart in Tilt.

1. Does the service start up? Why?

Delete or comment out another piece of required configuration.

1. What error messages do you see?
2. As an operator that can't read the implementation, do you get enough information to fix all the configuration problems in one pass? Or would you need to iterate until you had it working?
3. What could be done to fix that?

Fix your configuration and check that the service starts and can process content scanning requests.

## Wrapping up

All reading of the environment now happens in one place (`index.ts`) and when the service starts up. We've also clearly identified configuration items that have no safe defaults and must be specified. This means that:

1. Only one place in our code knows about how configuration is provided (i.e. through environment variables). If we wanted to source from a configuration file or a database, we'd only be making a single change ✅.
2. The service fails to start with an okay-ish error message if a piece of required configuration is missing ✅.
3. Dependencies of the `EvidenceService` are explicitly defined ✅.

We haven't handled multiple errors in the best way possible though. The service fails to start when the first piece of missing configuration is encountered. This means that deploying the service may be more frustrating than is necessary - the deployer has to read the error message, provide the missing configuration, read the next error message, provide the next piece of missing configuration, repeat until success.

4. The service provides great feedback when it fails to start ❌.

We will revisit this in a subsequent section.

1. Are there any parallels between the poor feedback the service provides when multiple pieces of configuration are missing and when the content scanning request is broken in multiple ways?
