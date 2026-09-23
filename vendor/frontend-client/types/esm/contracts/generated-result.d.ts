import { z } from 'zod';
export declare const GENERATED_RESULT_MANIFEST_PATH: '.vibe-helper/result.json';
export declare const generatedResultManifestSchema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    kind: z.ZodLiteral<"WEB">;
    entry: z.ZodString;
    healthPath: z.ZodString;
    openPath: z.ZodDefault<z.ZodString>;
}, z.core.$strict>;
export type GeneratedResultManifest = z.infer<typeof generatedResultManifestSchema>;
