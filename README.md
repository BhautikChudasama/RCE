# Remote Code Execution (RCE)
Remote Code Execution allow you to run code by send APIs.

Postman Docs: https://documenter.getpostman.com/view/14855427/Tz5tYFx2

## Run using docker-compose
Make sure you've `docker`, `docker-compose` has installed on your machine.

```bash
# Let's start
$> docker-compose up
# ~~ Hit localhost:5124 to run APIs.
```

## Installation Steps

Make sure you've `NodeJS`, and `NPM` has installed on your machine.

1. `Clone` this repository.

2. Run following command to start
```bash
# Dig into cloned repository
$> cd <PASTE_REPO_NAME>

# Install packages
$> npm install

# Make sure you have port number 5124 available and to listen
$> node server.js
```

