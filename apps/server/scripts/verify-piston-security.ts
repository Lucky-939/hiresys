import path from "path";
import dotenv from "dotenv";
dotenv.config({ path: path.resolve(__dirname, "../.env") });

import { PistonClient } from "../src/config/piston";

async function runTest(name: string, payload: any) {
  console.log(`\n--- Running Test: ${name} ---`);
  try {
    const res = await PistonClient.execute(payload);
    console.log("Status: 200");
    console.log("Stdout:", JSON.stringify(res.run.stdout));
    console.log("Stderr:", JSON.stringify(res.run.stderr));
    console.log("Code:", res.run.code);
    console.log("Signal:", res.run.signal);
    if ((res.run as any).memory !== undefined) {
      console.log("Memory (bytes):", (res.run as any).memory);
    }
  } catch (err: any) {
    console.log("Request failed or timed out:", err.message);
    if (err.response) {
      console.log("Status:", err.response.status);
      console.log("Response data:", JSON.stringify(err.response.data));
    }
  }
}

async function main() {
  // Test 1: Hello World (Python)
  await runTest("Hello World (Python)", {
    language: "python",
    version: "*",
    files: [{ name: "main.py", content: "print('Hello World')" }]
  });

  // Test 2: Hello World (JavaScript)
  await runTest("Hello World (JavaScript)", {
    language: "javascript",
    version: "*",
    files: [{ name: "main.js", content: "console.log('Hello World');" }]
  });

  // Test 3: SSRF Attempt (Python)
  const ssrfCode = [
    "import socket, urllib.request",
    "targets = [",
    "    ('169.254.169.254', 80),",
    "    ('localhost', 5432),",
    "    ('localhost', 6379),",
    "    ('host.docker.internal', 5432),",
    "    ('host.docker.internal', 6379),",
    "    ('host.docker.internal', 5000),",
    "]",
    "for h, p in targets:",
    "    try:",
    "        s = socket.create_connection((h, p), timeout=2)",
    "        s.close()",
    "        print(f'{h}:{p} -> REACHABLE (VULNERABLE)')",
    "    except Exception as e:",
    "        print(f'{h}:{p} -> BLOCKED ({type(e).__name__}: {e})')",
    "try:",
    "    urllib.request.urlopen('http://169.254.169.254/latest/meta-data/', timeout=2)",
    "    print('Metadata (169.254.169.254) -> REACHABLE (VULNERABLE)')",
    "except Exception as e:",
    "    print(f'Metadata (169.254.169.254) -> BLOCKED ({type(e).__name__}: {e})')"
  ].join("\n");

  await runTest("SSRF Attempt (Python)", {
    language: "python",
    version: "*",
    files: [{ name: "main.py", content: ssrfCode }]
  });

  // Test 4: Infinite Loop (Python - Expect Kill at 3s)
  await runTest("Infinite Loop (Python - Expect Kill at 3s)", {
    language: "python",
    version: "*",
    run_timeout: 3000,
    files: [{ name: "main.py", content: "while True:\n    pass" }]
  });

  // Test 5: Fork Bomb (Python)
  await runTest("Fork Bomb (Python)", {
    language: "python",
    version: "*",
    files: [{ name: "main.py", content: "import os\nwhile True:\n    os.fork()" }]
  });

  // Test 6: Memory Exhaustion (Python - 256MB limit)
  await runTest("Memory Exhaustion (Python - 256MB limit)", {
    language: "python",
    version: "*",
    run_timeout: 3000,
    run_memory_limit: 256 * 1024 * 1024,
    files: [{ name: "main.py", content: "x = 'a' * (10**9)\nprint(len(x))" }]
  });

  // Test 7: Memory Exhaustion (JavaScript - 256MB limit)
  await runTest("Memory Exhaustion (JavaScript - 256MB limit)", {
    language: "javascript",
    version: "*",
    run_timeout: 3000,
    run_memory_limit: 256 * 1024 * 1024,
    files: [{ name: "main.js", content: "const arr = []; while(true) { arr.push(new Array(1e7).fill('a')); }" }]
  });
}

main();
