# Caching Proxy Server

Project from [Backend Learning Path - Caching Server](https://roadmap.sh/projects/caching-server)

## Description

A command-line tool that starts a caching proxy server. It forwards requests to the actual server and caches the responses. If the same request is made again, it returns the cached response instead of forwarding the request to the server.

## Installation

```bash
# Install globally
npm install -g .

# Or run directly with
npm start
```

## Usage

Start the proxy server:

```bash
caching-proxy --port <number> --origin <url> [--ttl <seconds>]
```

Example:

```bash
caching-proxy --port 3000 --origin http://dummyjson.com --ttl 7200
```

Clear the cache:

```bash
caching-proxy --clear-cache
```

## Options

- `--port`, `-p`: Port to run the proxy server on
- `--origin`, `-o`: Origin server URL to proxy requests to
- `--ttl`, `-t`: Cache TTL in seconds (default: 3600)
- `--clear-cache`: Clear the cache and exit
- `--help`: Show help

## Response Headers

The proxy adds an `X-Cache` header to indicate cache status:

- `X-Cache: HIT` - Response served from cache
- `X-Cache: MISS` - Response from origin server

## Features

- Caches responses with configurable TTL
- Forwards all HTTP methods
- Preserves headers from origin server
- Handles binary responses
- Graceful shutdown
