// Ambient declarations for Deno runtime in Supabase Edge Functions (silences VSCode TS errors)
declare namespace Deno {
  export interface Env {
    get(key: string): string | undefined;
    set(key: string, value: string): void;
  }
  export const env: Env;
  export function serve(handler: (req: Request) => Promise<Response> | Response): void;
}

declare module "https://*" {
  const content: any;
  export default content;
  export const createClient: any;
}
