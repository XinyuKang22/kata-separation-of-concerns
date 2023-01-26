# Error Handling

Another responsibility that is not performed well is:

| What                     | Where      | When |
| ---- | --- | --- |
| Translate domain-specific response to HTTP response | Route Handler | Usage |

This is partly because the two service methods that are  called by the Route Handler (`EvidenceService+uploadFile` and `+fetchDetails`) don't provide the necessary domain specific information for the Route Handler to return good information to the caller.

Before we start improving our implementation, let's first consider whether it is appropriate for the Route Handler to translate from the domain-specific response to a HTTP one (and for the `EvidenceService` to be unaware of HTTP).

Generally, we consider that it *is* appropriate for the Route Handler to own this responsibility and for services to be unaware of the specifics of the HTTP request and response - services should try to return a `404` directly.

Moving on, a reasonable HTTP-driven server should return:
* [an appropriate status](https://en.wikipedia.org/wiki/List_of_HTTP_status_codes)
* useful headers (particularly when throttling)
* a useful response body

Noting that it isn't always correct to be *too* helpful to callers (lest you facilitate an attack), a server should also be observable.

// TODO diagram showing information going to caller and observer.

Remind yourself of what happens when you make a request for metadata using an evidence id that does not exist (but is well-formed).

1. Do you receive an appropriate status?
2. Do you receive a useful response?
3. Is a useful message logged?

## Handling 'missing' metadata

Let's take a look at the type of `EvidenceService+fetchDetails` to see what information *is* returned to the Route Handler.

The explicit type is pretty unhelpful:

```typescript
async fetchDetails(evidenceId: string) {
```

Doing a bit of type detecting, we can work out that the type is actually:

```typescript
async fetchDetails(evidenceId: string): Promise<WithId<Document> | null> {
```

Since we don't want mongo specifics (`WithId`, `Document`) bleeding out into the Route Handler, let's hide that for now. Add the explicit type:

```typescript
async fetchDetails(evidenceId: string): Promise<unknown | null> {
```

1. Can you see where the `null` in the response to the `GET` request is coming from?

Moving to the Route Handler, let's use the response from `+fetchDetails` to change the HTTP resposne we send.

Firstly, let's get the machinery in place. Change the guts of the GET handler to:

```typescript
      const maybeMetaData = await evidenceService.fetchDetails(evidenceId);

      return maybeMetaData === null ?
        maybeMetaData :
        maybeMetaData;
```

Then change the `null` branch to return a 404 response with a helpful error message:

```typescript
await reply.status(404).send({
  message: `No metadata for [${evidenceId}].`
})
```

Call the service again?

2. What status code is returned?
3. Is that status code appropriate for given the request that was made?
4. What response body was returned?
5. Do you think that response body is appropriate?

## Handling errors
Send a request for an invalid id (i.e. one shorter than 24 digits long - `asdf` will work).

You'll get a `500` response code. This isn't appropriate given that the error is caused by our bad input. A `400` is more appropriate.

Since this is a convenient way to cause a failure, we are going to leave it in place for now.

We mentioned before that throwing an error (e.g. `throw new Error('something failed')`) does not show up in the type system. This is not true for functions and methods that return a `Promise`. Promises do model success and failure.

1. What part of our implementation causes the 'failed' Promise to turn into a thrown Error?
2. What part of the system is handling that error at the moment? Is it code that we have written?
3. Are we logging anything when the error occurs? Does it have helpful context?

Right now the error is bubbling up from the internals of mongo's client library. This means that:
* mongo internals are leaking to callers
* no additional context is added by the `EvidenceService`.

If you look at the type signature for `EvidenceService+uploadFile` you'll notice that we explicitly state the promise may return an instace of `Error` (Javascript's [standard error type](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error)):

```typescript
Promise<{ evidence_id: string } | Error>
```

and then the POST handler uses that information:

```typescript
if (processResult instanceof Error) {
  await sendErrorReply(reply)(processResult);
  return;
}
```

Let's follow a similar pattern here.