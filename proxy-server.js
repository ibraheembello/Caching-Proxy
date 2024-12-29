#!/usr/bin/env node

// proxy-server.js


import express from 'express';
import NodeCache from 'node-cache';
import axios from 'axios';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { fileURLToPath } from 'url';
import path from 'path';

// Parse command line arguments
const argv = yargs(hideBin(process.argv))
    .option('port', {
        alias: 'p',
        description: 'Port to run the proxy server on',
        type: 'number'
    })
    .option('origin', {
        alias: 'o',
        description: 'Origin server URL',
        type: 'string'
    })
    .option('ttl', {
        alias: 't',
        description: 'Cache TTL in seconds',
        type: 'number',
        default: 3600
    })
    .option('clear-cache', {
        description: 'Clear the cache and exit',
        type: 'boolean'
    })
    .help()
    .argv;

// Initialize cache with configured TTL
const cache = new NodeCache({ stdTTL: argv.ttl });

const app = express();

// Handle cache clearing
if (argv['clear-cache']) {
    cache.flushAll();
    console.log('Cache cleared successfully');
    process.exit(0);
}

// Validate required arguments
if (!argv.port || !argv.origin) {
    console.error('Error: Both --port and --origin are required when not using --clear-cache');
    process.exit(1);
}

// Remove trailing slash from origin if present
const origin = argv.origin.replace(/\/$/, '');

// Add body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.raw({ type: '*/*' }));

// Middleware to handle all requests
app.use(async (req, res) => {
    const targetUrl = `${origin}${req.url}`;
    const cacheKey = `${req.method}:${targetUrl}`;

    try {
        // Check if response is cached
        const cachedResponse = cache.get(cacheKey);
        
        if (cachedResponse) {
            console.log(`Cache HIT: ${req.method} ${targetUrl}`);
            // Return cached response
            res.set('X-Cache', 'HIT');
            Object.entries(cachedResponse.headers).forEach(([key, value]) => {
                // Skip certain headers
                if (!['transfer-encoding', 'connection'].includes(key.toLowerCase())) {
                    res.set(key, value);
                }
            });
            return res.status(cachedResponse.status).send(cachedResponse.data);
        }

        // Forward request to origin server
        const response = await axios({
            method: req.method,
            url: targetUrl,
            headers: {
                ...req.headers,
                host: new URL(origin).host
            },
            data: req.body,
            responseType: 'arraybuffer',
            validateStatus: false // Don't throw error on non-2xx status codes
        });

        console.log(`Cache MISS: ${req.method} ${targetUrl}`);
        
        // Cache the response
        cache.set(cacheKey, {
            data: response.data,
            status: response.status,
            headers: response.headers
        });

        // Set response headers
        res.set('X-Cache', 'MISS');
        Object.entries(response.headers).forEach(([key, value]) => {
            if (!['transfer-encoding', 'connection'].includes(key.toLowerCase())) {
                res.set(key, value);
            }
        });

        // Send response
        res.status(response.status).send(response.data);

    } catch (error) {
        console.error(`Proxy error for ${req.method} ${targetUrl}:`, error.message);
        res.status(502).json({
            error: 'Bad Gateway',
            message: error.message || 'Error forwarding request to origin server'
        });
    }
});

// Start server
const server = app.listen(argv.port, () => {
    console.log(`Proxy server running on port ${argv.port}`);
    console.log(`Forwarding requests to ${origin}`);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down server...');
    server.close(() => {
        console.log('Server stopped');
        process.exit(0);
    });
});