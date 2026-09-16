import { type LocalConnection } from './contracts/index.js';
import { LocalCoreClient } from './index.js';
export declare function readLocalConnection(file: string): Promise<LocalConnection>;
export declare function connectLocalCore(file: string): Promise<LocalCoreClient>;
