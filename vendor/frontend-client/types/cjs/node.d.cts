import { type LocalConnection } from './contracts/index.cjs';
import { LocalCoreClient } from './index.cjs';
export declare function readLocalConnection(file: string): Promise<LocalConnection>;
export declare function connectLocalCore(file: string): Promise<LocalCoreClient>;
