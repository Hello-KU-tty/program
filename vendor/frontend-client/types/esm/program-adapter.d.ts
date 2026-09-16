import type { LocalCoreClient } from './index.js';
/** Structural compatibility with Hello-KU-tty/program c639a59 AgentAdapter. */
export type ProgramAgentId = 'builder' | 'helper';
export type ProgramEvent = {
    kind: 'started';
    turnId: string;
} | {
    kind: 'message_chunk';
    text: string;
} | {
    kind: 'work_item';
    item: {
        id: string;
        seq: number;
        itemType: 'tool_call' | 'file_change' | 'command' | 'test';
        title: string;
        detail: string;
        lineCount: number;
        status: 'running' | 'succeeded' | 'failed';
        expanded: boolean;
    };
} | {
    kind: 'work_item_result';
    itemId: string;
    failed: boolean;
} | {
    kind: 'completed';
} | {
    kind: 'failed';
    error: {
        code: 'start_timeout' | 'stream_error' | 'stalled' | 'unavailable' | 'unknown';
        message: string;
    };
};
export declare class LocalProgramAdapter {
    readonly client: LocalCoreClient;
    readonly getProjectId: () => string;
    constructor(client: LocalCoreClient, getProjectId: () => string);
    isAvailable(agent: ProgramAgentId): Promise<boolean>;
    startTurn(request: {
        agent: ProgramAgentId;
        text: string;
        allowWorkStream: boolean;
    }, onEvent: (event: ProgramEvent) => void): Promise<{
        readonly turnId: string;
        cancel(): void;
    }>;
}
