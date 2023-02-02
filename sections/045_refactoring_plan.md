# Plan for continued refactoring

Now that we can see more clearly what `EvidenceService+uploadFile` is doing, let's consider the responsibilities that we identified earlier and decide where things should occur.

Let's decide this by thinking about:

* whether the activity occurs during the creation of something (a class, service, etc.) or when it is used (when invoking a method); and
* what information should be hidden (and contrarily, what should be visible) to other components.

In particular, we want to avoid burdening clients (callers) of a function or method with having to provide too much information to get the output that they want. Likewise, we don't want to expose implementation specific information to callers.

We also want to know as soon as possible whether the pre-conditions for something have not been satisfied.

Right now, the responsibilities are:

| What                     | Where      | When |
| ---- | --- | --- |
| Create `EvidenceService` | Assembler (top-level `index.ts`) | Creation |
| Create routes            | Assembler | Creation |
| Start server             | Assembler | Creation |
| Read environment to set up dependencies | `EvidenceService` | Usage |
| Parse incoming request from HTTP to domain-specific type | Route Handler (`server.ts`) | Usage |
| Call virus scanning service | `EvidenceService` | Usage |
| Interprets the results to decide what to do | `EvidenceService` | Usage |
| Uploads the content to S3 | `awsService.ts` | Usage |
| Sometimes, updates MongoDB with the metadata | `EvidenceService` | Usage |
| Translate domain-specific response to HTTP response | Route Handler | Usage |

Our exploratory testing has already identified the issues caused by the environment being read by the `EvidenceService` when it is being used. It would be much better if those errors occurred during startup.

We could choose to do that in the `EvidenceService`'s constructor. That would mean that:

* The caller of `EvidenceService+uploadFile` (the Route Handler) doesn't have to know of and provide that implementation specific configuration (e.g. should the Route Handler need to know that MongoDB is used? Probably not.) ✅.
* The server will fail to start if we can't get the configuration that we need ✅.

However, it also means that:
* The `EvidenceService` constructor needs to know that configuration should be read from the environment and not (e.g.) a configuration file ❌.
* We can't represent that potential for failure in the signature of the constructor. A constructor can only return an instance of the class (or throw an Error). We generally don't like throwing Errors specifically because they aren't a part of the type system and we get no help from the compiler when dealing with them ❌.
* Once we introduce more services, each of which consult the environment to get their configuration, we will have a hard time understanding all the configuration that is required - it will be spread across many classes ❌.

For these reasons, we will decide to allocate the responsibility of reading configuration from the environment to the Assembler. So, our responsibilities change like so:

| What                     | Where      | When |
| ---- | --- | --- |
| Read environment to set up dependencies | ~~EvidenceService~~ Assembler | ~~Usage~~ Creation |

Once we've made that change we'll revisit allocation of other responsibilities.