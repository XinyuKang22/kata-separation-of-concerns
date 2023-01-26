# Getting Started

## Familiarise yourself with the components of the solution

The different pieces of the stack are brought together in the `Tiltfile`.

Look in that Tiltfile and find the four major pieces:

* A NodeJS server that will orchestrate scanning, storage of content and persistence of metadata.
* ClamAV that can scan content for viruses.
* MongoDB for persisting the metadata of scanned content.
* An AWS S3 analog / stand-in that can store content.

Tilt will build and run these pieces inside the Kubernetes cluster that you have configured.

![](.generated-diagrams/overview.svg)

## Start Tilt

From the directory containing this README (and the `Tiltfile`), run `tilt up` to start Tilt. Press `space` to get Tilt to open the browser UI. If everything is working, you can expect to see that resources for each of the pieces listed above as well as the `Tiltfile` itself.

Check that each resource is 'green' and running.

Find the `file-handler` resource and take a note of the URL it is listening on.

## Open the code
Also make sure that you have the project open in the code editor of your choice so that you can poke around (and make changes later on).

## Upload some content

Using either the Postman collection or the tool of your choice, let's upload some content to the `file-handler`.

You have the hostname and port from tilt, now we need to find out that path to which you'll upload the content and the HTTP Method you should use.

`file-handler` is written using [fastify](https://www.fastify.io/). To find out the path that you should send this request to, let's have a look at the definition of the routes.

Open `node-services/file-handler/src/server/server.ts` and look for where routes are created (hint: look for `fastify.post` and `fastify.get`). Take a note of the path for the POST request.

Now, using Postman or another tool, send a `POST` request to the host, port and path. The request body should look like:

The request body should look like:

```json
{
    "action": {
        "name": "upload"
    },
    "input": {
        "data": {
            "filename": "a_test_file.zip",
            "base64_data": "abc",
            "name": "A Test File",
            "description": "Some test content that should pass scanning"
        }
    }
}
```

Once you've sent the request, verify that you get a `200` response and a new `evidenceId`. 

Take a look at the logs for the `file-handler` server.

1. Can you see the logs that relate to the request that you just made?
2. If you were making changes to the server, are there other log messages that you would like to see?
3. If you were operating (i.e. running and supporting) the server, are there other log message that you would like to see?

## Check the stored data

Using the `evidenceId` that was returned to you earlier, send a `GET` request to the appropriate (hint: look at the server definition again) path to get the details of the evidence. Verify that you get a `200` response that contains the metadata about the content as well as the location it has been stored in and whether it was infected or not.

## Wrapping up

Once you've reached this point, you should be confident that:

* the service and supporting pieces are running as expected 
* you can POST content for it to be scanned
* you can make GET requests to see the details of scanned data
