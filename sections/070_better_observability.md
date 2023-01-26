# Observability

The [observability](https://agiledigital.atlassian.net/wiki/spaces/FORGE/pages/27198571/Observability) of a solution describes our ability to understand not only what it is doing but also why[^1].

Right now, we can really only observe the solution in two ways:

* looking at the logs
* sending requests and looking at responses

Neither of these approaches provides useful information. The implementation only logs minimal information about the request it is handling and what happened with it. Responses for bad requests are similarly pretty poor. We *have* improved observability related to configuration handling slightly.

1. Observability has a converse. What is it?
2. How does our solution rate in that aspect?
3. What changes could we make to improve its rating?

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



[^1]: *without* resorting to attaching a debugger.