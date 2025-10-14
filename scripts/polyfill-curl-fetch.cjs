const { spawn } = require('child_process');
const { URL } = require('url');
const { Buffer } = require('buffer');
const fs = require('fs');
const path = require('path');

const { Request, Response, Headers } = globalThis;
const originalFetch = globalThis.fetch;

const PROJECT_ROOT = process.cwd();
const LOCAL_SQLITE_PLUGIN = path.join(PROJECT_ROOT, '.playground', 'sqlite-database-integration.zip');

function normalizeHeaders(headers = {}) {
        if (headers instanceof Headers) {
                const normalized = {};
                headers.forEach((value, key) => {
                        normalized[key] = value;
                });
                return normalized;
        }
        return { ...headers };
}

function isSqliteIntegrationRequest(url) {
        if (!url) {
                return false;
        }
        const host = url.hostname.toLowerCase();
        const pathname = url.pathname.toLowerCase();
        if (host === 'github.com') {
                return pathname.includes('/wordpress/sqlite-database-integration');
        }
        if (host === 'downloads.wordpress.org' || host === 'downloads.w.org') {
                return pathname.includes('sqlite-database-integration');
        }
        return false;
}

function tryServeLocalSqlitePlugin(url) {
        if (!isSqliteIntegrationRequest(url)) {
                return null;
        }
        if (!fs.existsSync(LOCAL_SQLITE_PLUGIN)) {
                return null;
        }
        const fileBuffer = fs.readFileSync(LOCAL_SQLITE_PLUGIN);
        return new Response(fileBuffer, {
                status: 200,
                headers: { 'content-type': 'application/zip' },
        });
}

async function curlFetch(input, init = {}) {
        const request = new Request(input, init);
        const method = request.method || 'GET';
        const supportedMethods = new Set(['GET']);
        if (!supportedMethods.has(method.toUpperCase())) {
                if (typeof originalFetch === 'function') {
                        return originalFetch(request, init);
                }
                throw new Error(`curlFetch only supports GET requests. Received: ${method}`);
        }

        const url = new URL(request.url);

        const localPluginResponse = tryServeLocalSqlitePlugin(url);
        if (localPluginResponse) {
                return localPluginResponse;
        }

        const curlArgs = ['-fsSL'];

        const headers = normalizeHeaders(request.headers);
        for (const [key, value] of Object.entries(headers)) {
                if (typeof value === 'undefined') {
                        continue;
                }
                curlArgs.push('-H', `${key}: ${value}`);
        }

        curlArgs.push(url.toString());

        return new Promise((resolve, reject) => {
                const chunks = [];
                let stderr = '';
                const curl = spawn('curl', curlArgs);

                curl.stdout.on('data', (chunk) => {
                        chunks.push(chunk);
                });

                curl.stderr.on('data', (chunk) => {
                        stderr += chunk;
                });

                curl.on('error', (error) => {
                        reject(error);
                });

                curl.on('close', (code) => {
                        if (code !== 0) {
                                const error = new Error(
                                        `curl exited with status ${code} while fetching ${url.toString()}${stderr ? `: ${stderr.trim()}` : ''}`
                                );
                                reject(error);
                                return;
                        }
                        const bodyBuffer = Buffer.concat(chunks);
                        resolve(
                                new Response(bodyBuffer, {
                                        status: 200,
                                })
                        );
                });
        });
}

globalThis.fetch = curlFetch;
