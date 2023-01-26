# Observability

The [observability](https://agiledigital.atlassian.net/wiki/spaces/FORGE/pages/27198571/Observability) of a solution describes our ability to understand not only what it is doing but also why[^1].

Right now, we can really only observe the solution in two ways:

* looking at the logs
* sending requests and looking at responses

Currently, neither of these approaches provides useful information. The implementation only logs minimal information about the request it is handling and what happened with it. Responses for bad requests are similarly pretty poor. We *have* improved observability related to configuration handling slightly.

1. Observability has a converse. What is it?
2. How does our solution rate in that aspect?
3. What changes could we make to improve its rating?

Before we make any more changes to the services, let's improve our ability to observe it.

## Logging

Although modern software benefits from advanced tooling that can dramatically improve the observability of a solution, logs are still the foundation of observability. [A thoughtful log message](https://agiledigital.atlassian.net/wiki/spaces/FORGE/pages/27199452/Writing+Log+Messages) becomes an asset used by people both operating the system (they get observability) but also people seeking to understand the code (the log message is akin to a good code comment).

In a *pinch*, log messages can also be used to derive metrics (by measuring the frequency of a message or the time between two messages) and events (by parsing messages for necessary information).

Let's think a bit about the types of log messages that we would like to see for each request.

For a HTTP-driven request, we generally like to see:

1. Some key details about the incoming request:
    1. Method
    2. Path
    3. Request size
2. Some key details about the response:
    1. Status code
    2. Response size (if available)
    3. Time to process (stopgap in case we no more sophisticated way to measure this)
3. Steps in the 'business process':
    1. Parsing the incoming HTTP request into domain-specific types.
    2. Calling services.
    3. Making decisions and the result of that decision.
    4. Anything that takes a significant amount of time.
    5. Clear indications of why something failed and what (if anything) can be done to rectify the situation.

For all these messages, we like to include some information that is useful for correlation (e.g. pulling all the messages for a particular user or request):

* request id (frequently allocated by the HTTP server library, in this case Fastify).
* user id.

1. How does our current logging measure up?
2. Think about a command line tool that you have used. What 'observability' does it provide to you? Do you have a clear understanding of what it is doing and why?
3. What are the key steps in the `fileUpload` business process.

### Adding log messages

[Following our logging guidelines](https://agiledigital.atlassian.net/wiki/spaces/FORGE/pages/27199452/Writing+Log+Messages), let's add some logging around the decision to quarantine or not in `EvidenceService+fileUpload`:

```typescript


      log.info(`Scanning content [${inputParameters.filename}] with size [${inputParameters.base64_data.length}] for viruses...`);

      const scanResults = ...;
      if (scanResults.isInfected) {
        log.warn(`Scanned content [${inputParameters.filename}] with size [${inputParameters.base64_data.length}] is infected, will quarantine.`);
        return await ...;
      } else {
        log.info(`Scanned content [${inputParameters.filename}] with size [${inputParameters.base64_data.length}] is not infected, passing`);
        return await handleCleanFile(s3Key, fileBuffer, inputParameters);
      }
    };
```

Note that we've repeated information that you might assume is redundant (the name and size of the file) in the 'done' messages. Some people will argue that this is unnecessary because you can just look up the log for the first message. However, in practice:

* you may not have access to the log - you may have been sent a single message.
* for a busy service the original message may be a long way back in the log.

1. Is there other information that you think would be good to include in the message?
2. Are there other messages relating to virus scanning that you think should be included?
3. Do you think that the `Scanning file...` and uninfected `Scanned file...` should be logged at the info level or some other level? What about the message for infected files?

Add the other messages that you think are appropriate to the services.

Make a request with both clean and unclean files.

1. What was logged for each request?

### Logging context

We've logged the file name and content size manually a few times now. Many logging libraries - including [the one used by Fastify](https://github.com/pinojs/pino) - allows you to add context to a logger that will be used in each subsequent message (aka the Mapped Diagnostic Context). Let's use that capability to improve our logging.

Inside the POST route handler in `server.ts`, create a child logger with a new context that includes the name and content size:

```typescript
      const requestLogger = logger.child({
        contentName: requestBody.body.input.data.filename,
        // FIXME ADD THE CONTENT SIZE HERE.
      });
```

Then pass that child logger when invoking `fileUpload`.

Run the requests again and look at the log messages.

1. What do you see in the messages?
2. Are there any other bits of information in the request that would be useful context for all log messages?
3. Can you see any potential pitfalls to including more information in the context?
4. Do you think we should include the name and size in both the context and the message?
5. By including more structured information, have started to emit Events as well as Logs? What is the difference?
6. Would it be useful to include any structured information for particular log messages that we emit?

## Metrics

To emit metrics, we will use [fastify-metrics](https://github.com/SkeLLLa/fastify-metrics).

First, we have to add the new dependency:

1. Change directories into `node-services/file-handler`.
2. Use yarn to add the dependency `yarn add fastify-metrics`.
3. Wait for the service to rebuild and restart.

Now, let's edit `server.ts` to enable it.

Add the import at the top of the file, along with the other imports:

```typescript
import metricsPlugin from "fastify-metrics";
```

Then change how we build the Fastify instance to add the metrics plugin:

```typescript
  const fastify = await Fastify({
    ...
  });
  
  await fastify.register(metricsPlugin); // <-- Add this line.
```

Wait for the service to be updated then make a `GET` request to the metrics endpoint (hint: check the fastify-metrics documentation for the default path).

1. What metric(s) tells you the number of `GET` requests made?

Make a few `POST` requests to scan some clean and infected content.

2. What metric(s) tells you the number of `POST` requests made?
3. Can you see any metrics for the individual requests?
4. Can you see any metrics for how long it took to scan the content (vs the entire request duration)?
5. What do the `le` attributes mean? How would they be used? What about `quantile`?

### A custom metric

Just turning on `fastify-metrics` gave us much better visibility into the behaviour of the service. We can assess activity (how many requests are being made and of what type), performance (how long it is taking to process requests) and some of the outcomes of those requests (using the status code attribute).

It is often useful to include custom metrics, that provide additional insight into the behaviour of a solution.

Let's add custom metrics that will track the number of infected and number of clean files that have been processed by the system.

Open `server.ts` again.

After the line that registers the plugin, create a [custom metric](https://github.com/siimon/prom-client#custom-metrics) to track the number of files that were scanned cleanly:

```typescript
  const numberOfCleanFilesScanned = new fastify.metrics.client.Counter(
    {
      name: "clean_files_count",
      help: "The number of clean files that have been scanned by the service."
    }
  );
```

Check the metrics page to validate that you can see the `clean_files_count` metric.

Make a few `POST` requests to scan content.

1. Why isn't the counter being incremented?

### Wiring up the metric

We now have to decide how that counter will be incremented. We have a couple of options:

* change the return type of `EvidenceService+fileUpload` to to have a flag that says whether the file was infected or not and increment the counter from the route handler; or
* somehow get the counter into `EvidenceService+fileUpload` and increment it from there.

As we consider the job of fastify to be *only* dealing with HTTP and handing off to the service as soon as possible, we can rule out the first option. Futhermore, that option would also mean that, for each metric we want to collect, we have to somehow expose information back to the route handler.

We *could* add a new parameter to `EvidenceService+fileUpload`, but that seems like something that we don't want to bother the caller with. The caller doesn't really care about the metrics that the implementation happens to emit.

Instead, let's wire the metrics through the constructor, similarly to how we handle the other "creation time" concern: configuration.

As we haven't anticipated this we will need to do a bit of re-wiring.

Change the return type of `buildFastifyServer` to:

```typescript
export const buildFastifyServer = async (
  maximum_upload_size: number
): Promise<FastifyInstance & {
  metrics: IFastifyMetrics
}>
```

(i.e. to expose the details of the metrics plugin to the caller).

Then in `index.ts` (our Assembler) modify:

```typescript
then((fastify) => {
 
  // Your service creation is here.
  
  buildFastifyRoutes(fastify, evidenceService);
  return fastify;
}).
```

to

```typescript
then((fastifyWithMetrics) => {

  const numberOfCleanFilesScanned = new fastifyWithMetrics.metrics.client.Counter(
    {
      name: "clean_files_count",
      help: "The number of clean files that have been scanned by the service."
    }
  );

  // Your service creation is here.

  buildFastifyRoutes(fastifyWithMetrics, evidenceService);
  return fastifyWithMetrics;
}).
```

Check the metrics page to validate that you can still see the `clean_files_count` metric.

Update the constructor for `EvidenceService` to accept a new parameter:

```typescript
incrementCleanFilesCounter: () => void
```

and satisfy it in the Asssembler with:

```typescript
const evidenceService = new EvidenceService(
  // Your configuration goes here.
  () => numberOfCleanFilesScanned.inc()
);
```

Update the implementation of the 'clean' branch to call:

```
this.incrementCleanFilesCounter();
```

### More metrics

Repeat this process to track the number of infected files that were scanned.

Then add a new histogram to the `AwsService` that tracks the size of content uploaded to S3.

1. How did you choose to pass the histogram to the AwsService?
2. What is the type of the constructor parameter?
3. Do you agree that metrics should be passed through the constructor (during creation) rather than as parameters of the method (during usage)?
4. Can you think of other ways of measuring these metrics?
5. In the future, how would you decide between passing in through the constructor or method?
6. We may end up passing a lot of metrics to a service. Is there a way of simplifying the signature of the constructor?
7. If we end up with a lot of parameters of the same type (e.g. `() => ()`) is there a way of making sure that we don't accidentally pass the wrong counter to a parameter (e.g. the clean counter to the infected counter parameter)?

## Wrapping Up
Our solution is much more observable than before.

* We emit log messages that tell us what is happening in the service ✅.
* Those log messages tell us *why* the solution is behaving as it does ✅.
* Log messages include some structured data that will make processing our messages easier ✅.
* We are measuring technical metrics ✅.
* We've identified some business metrics and are measuring those ✅.

However,

* We don't yet support standard tracing mechanisms ❌.

After these changes, we've introduced some additional responsibilities:

| What                     | Where      | When |
| ---- | --- | --- |
| Creating business metrics | Assembler | Creation |
| Adding request specific data to logging context | Route Handler | Usage |
| Measuring business metrics | `EvidenceService` + `AwsService` | Usage |

1. What other metrics do you think that we should measure?
2. What else would help us observe the solution?

[^1]: *without* resorting to attaching a debugger (which may not even be possible when running in a production environment).
