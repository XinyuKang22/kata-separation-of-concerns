# Purpose

This kata walks the student through applying the principle of "Separation of Concerns" (along with other software engineering principles) to the creation of a simple NodeJS service.

The student starts with a running - but extremely bad - implementation and refactors it, checking that the service continues to work along the way.

# Pre-requisities

1. [Docker](https://docs.docker.com/get-docker/)
2. A kubernetes cluster. You can use the one built into docker.
3. [Tilt](https://docs.tilt.dev/install.html)
4. A tool to make http requests like [httpie](https://httpie.io/), curl, [Postman](https://www.postman.com/downloads/) or [Insomnia](https://insomnia.rest/).

This repository includes a Postman collection (see `/testing`), so using Postman is probably the path of least resistance.

# Sections

[Getting Started](sections/010_getting_started.md)

[Exploratory Testing](sections/020_exploratory_testing.md)

[Service Structure](sections/030_service_structure.md)

[Refactoring 101](sections/040_extract_to_functions.md)

[Refactoring Plan](sections/045_refactoring_plan.md)

[Configuration Handling](sections/050_handle_configuration.md)

[Refactoring 201](sections/060_more_services.md)

[Observability](sections/070_better_observability.md)

[Error Handling](sections/080_error_handling.md)
