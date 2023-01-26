# Exploratory Testing

[Exploratory testing](https://agiledigital.atlassian.net/wiki/spaces/FORGE/pages/27223270/Regression+Testing+vs+Exploratory+Testing) is a type of testing where - rather than following a prescribed testing plan - you use your experience and intuition to explore the behaviour of the system and uncover errors. This may involve sending unexpectedly structured data, making lots of requests, trying to make concurrent changes to data or whatever else you can think of.

Exploratory testing is very valuable. It may uncover behaviours that the original developer of a system never anticipated (and consequently didn't include in a test plan).

To help people explore systems, we've noted some common scenarios to test as part of our [QA guidance](https://agiledigital.atlassian.net/wiki/spaces/FORGE/pages/27198584/QA+Testing+of+JIRA+issues).

## Testing the service via HTTP interface

Let's turn our mind to testing the `file-handler` service, starting with the simpler `GET` request handler.

Send a `GET` request using `asdf` as the evidence id. 

1. What response do you receive?
2. Is this an appropriate status code? If not, what would be?
3. Do you think that this is a response that is helpful to someone working on the service?
4. Do you think that it is an appropriate response to send when the service is running in a production environment?
5. What is logged? Would that be helpful to a developer or operator of the service.

Send a `GET` request using `123456789012345678901234` as the evidence id.

1. What response do you receive?
2. Is this an appropriate status code? If not, what would be?
3. Do you think that this is a response that is helpful to someone working on the service?
4. Do you think that it is an appropriate response to send when the service is running in a production environment?
5. What is logged? Would that be helpful to a developer or operator of the service.

Let's now try the `POST` request.

Send requests that contain:
1. a body that does not contain JSON.
2. a body that contains JSON, but does not include the `base64_data` property.
3. a valid body that contains a base64 encoded value of a [virus scanning test file](https://en.wikipedia.org/wiki/EICAR_test_file).

For each scenario, answer:

1. What response do you receive?
2. Is this an appropriate status code? If not, what would be?
3. Do you think that this is a response that is helpful to someone working on the service?
4. Do you think that it is an appropriate response to send when the service is running in a production environment?
5. What is logged? Would that be helpful to a developer or operator of the service.

## Testing the service via its environmental configuration

As well as the data that the caller provides via the HTTP API, the service makes us of environmental configuration.

Open `helm/templates/nodes-services.yml` and look for the `env` stanza for the `file-handler`.

You should see that we supply the `CLAMAV_HOST` as an environment variable. We wouldn't normally do this for a solution running in Kubernetes or Docker, but it does allow us to test the behaviour of the service after we modify that setting.

Delete (or comment out) `CLAMAV_HOST` and wait for Tilt to restart the container.

Make a well-formed `POST` request to upload some content.

1. Did you receive an appropriate status code?
2. Is the response appropriate for a developer? Is it appropriate when the service is running in a production environment?
3. Are good messages logged?
4. As a developer or operator, when would you know that the environment of the service was bad? At compile time, when starting the service or when the service received a request?
5. What is the ideal time to know that the environment is bad?
6. What is the first possible time that you can know that the environment is bad?

## Wrapping up

Put the `CLAMAV_HOST` environment variable back and verify that the service is working again.

1. What are you general thoughts on the robustness of the service?
2. What are the three changes you would make to the service?