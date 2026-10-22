/**
 * ============================================================================
 * PISTON CODE EXECUTION CLIENT
 * ============================================================================
 * Security guarantees (SSRF blocks, infinite loop kills at 3s, and fork bomb
 * limits) have been verified against the provisioned Piston sandbox engine.
 *
 * NOTE: For portfolio demonstration purposes, code execution runs on a developer machine
 * through a tunnel. A production deployment would use a dedicated isolated VM.
 * ============================================================================
 */
import axios from "axios";

const PISTON_URL = process.env.PISTON_API_URL;

if (!PISTON_URL) {
  console.warn("WARNING: PISTON_API_URL is not set. Code execution will fail until configured.");
}

export type ExecuteRequest = {
  language: string;
  version: string;
  files: { name: string; content: string }[];
  stdin?: string;
  args?: string[];
  compile_timeout?: number;
  run_timeout?: number;
  compile_memory_limit?: number;
  run_memory_limit?: number;
};

export type ExecuteResponse = {
  language: string;
  version: string;
  run: {
    stdout: string;
    stderr: string;
    output: string;
    code: number | null;
    signal: string | null;
  };
  compile?: {
    stdout: string;
    stderr: string;
    output: string;
    code: number | null;
    signal: string | null;
  };
};

export class PistonClient {
  static async execute(req: ExecuteRequest): Promise<ExecuteResponse> {
    const url = process.env.PISTON_API_URL || PISTON_URL;
    const response = await axios.post<ExecuteResponse>(`${url}/execute`, req, {
      headers: {
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true",
      },
    });
    return response.data;
  }
}
