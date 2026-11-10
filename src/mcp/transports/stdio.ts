/*
*      __                      __  ___
*     / /   ____  ____  ____ _/  |/  /__  ____ ___  ____  _______  __
*    / /   / __ \/ __ \/ __ `/ /|_/ / _ \/ __ `__ \/ __ \/ ___/ / / /
*   / /___/ /_/ / / / / /_/ / /  / /  __/ / / / / / /_/ / /  / /_/ /
*  /_____/\____/_/ /_/\__, /_/  /_/\___/_/ /_/ /_/\____/_/   \__, /
                     /____/                                 /____/
 *
 *  cavira oss (c) 2026  -  nullure (c) 2026
 *  ----------------------------------------------------------
 *  file  : src/mcp/transports/stdio.ts
 *  usage : implements the LongMemory stdio component
 */


import { StdioServerTransport as stdio_server_transport } from '@modelcontextprotocol/sdk/server/stdio.js';
import type { Readable, Writable } from 'node:stream';
import { create_longmemory_mcp, type mcp_server_config } from '../mcp_server.js';

export type stdio_mcp = ReturnType<typeof create_longmemory_mcp> & {
    transport: stdio_server_transport;
    start(): Promise<void>;
    close(): Promise<void>;
};

export function create_stdio_mcp(
    config: mcp_server_config = {},
    input: Readable = process.stdin,
    output: Writable = process.stdout,
): stdio_mcp {
    const mcp = create_longmemory_mcp(config);
    const transport = new stdio_server_transport(input, output);
    return {
        ...mcp,
        transport,
        start: () => mcp.server.connect(transport),
        close: async () => {
            await mcp.server.close();
            if (!config.runtime) await mcp.runtime.close();
        },
    };
}

// Grace period after the handshake so tools/list, prompts/list and resources/list are
// answered before the (synchronous, event-loop-blocking) store load starts.
const warm_up_delay_ms = 2000;

export async function run_mcp_stdio(config: mcp_server_config = {}): Promise<void> {
    const mcp = create_stdio_mcp(config);
    // The store loads lazily; warm it up in the background once the client is initialized
    // so the first tool call does not pay the full load cost.
    mcp.server.server.oninitialized = () => {
        setTimeout(() => {
            try {
                mcp.runtime.warm_up();
            } catch (error) {
                // Leave it to the first tool call to surface the error to the client.
                process.stderr.write(`longmemory: background load failed: ${error instanceof Error ? error.message : String(error)}\n`);
            }
        }, warm_up_delay_ms).unref();
    };
    await mcp.start();
    await new Promise<void>((resolve) => { mcp.transport.onclose = resolve; });
    await mcp.close();
}