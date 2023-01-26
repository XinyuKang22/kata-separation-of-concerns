# Purpose

This kata walks the student through applying the principle of "Separation of Concerns" (along with other software engineering principles) to the creation of a simple NodeJS service.

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

[Configuration Handling](sections/050_handle_configuration.md)

[Refactoring 201](sections/060_more_services.md)

[Observability](sections_070_better_observability.md)