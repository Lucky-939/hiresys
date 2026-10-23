export interface TestCase {
  index: number;
  input: string;
  output: string;
  explanation?: string;
  isHidden?: boolean;
}

export interface TestCaseResult {
  index: number;
  input: string;
  expected: string;
  actual: string;
  passed: boolean;
  durationMs: number;
  isHidden?: boolean;
}

export interface TestSuiteSummary {
  passedCount: number;
  totalCount: number;
  results: TestCaseResult[];
  error?: string;
}

export function detectFunctionName(code: string, signature?: string): string | null {
  // Check signature first
  if (signature) {
    const sigMatch = signature.match(/(?:function|def)\s+([a-zA-Z_]\w*)/);
    if (sigMatch) return sigMatch[1];
  }

  // Check candidate code for function definition
  const fnMatch = code.match(/function\s+([a-zA-Z_]\w*)\s*\(/);
  if (fnMatch) return fnMatch[1];

  const constFnMatch = code.match(/(?:const|let|var)\s+([a-zA-Z_]\w*)\s*=\s*(?:function|\([^)]*\)\s*=>)/);
  if (constFnMatch) return constFnMatch[1];

  const pyFnMatch = code.match(/def\s+([a-zA-Z_]\w*)\s*\(/);
  if (pyFnMatch) return pyFnMatch[1];

  return null;
}

export function buildExecutableCodeWithTests(
  userCode: string,
  language: string,
  fnName: string,
  testCases: TestCase[]
): string {
  if (!fnName || testCases.length === 0) {
    return userCode;
  }

  if (language === "javascript" || language === "typescript") {
    const jsonTests = JSON.stringify(testCases);
    return `
${userCode}

// ==========================================
// HireSys Cloud Test Suite Harness
// ==========================================
(function() {
  const __tests = ${jsonTests};
  const __fnName = "${fnName}";
  
  let __fn = null;
  try {
    __fn = eval(__fnName);
  } catch (e) {
    __fn = null;
  }

  if (typeof __fn !== "function") {
    console.log("===HIRESYS_TEST_SUITE_START===");
    console.log(JSON.stringify({
      error: "Function '" + __fnName + "' was not found. Please implement function " + __fnName + "().",
      passedCount: 0,
      totalCount: __tests.length,
      results: []
    }));
    console.log("===HIRESYS_TEST_SUITE_END===");
    return;
  }

  function __parseArgs(inputStr) {
    function tryEval(str) {
      const trimmed = str.trim();
      try {
        return Function('"use strict"; return (' + trimmed + ')')();
      } catch (e) {
        return trimmed;
      }
    }

    try {
      if (/^\\s*[a-zA-Z_]\\w*\\s*=/m.test(inputStr)) {
        const parts = inputStr.split(/,\\s*(?=[a-zA-Z_]\\w*\\s*=)/);
        return parts.map(p => {
          const valStr = p.replace(/^\\s*[a-zA-Z_]\\w*\\s*=\\s*/, "").trim();
          return tryEval(valStr);
        });
      }
      return [tryEval(inputStr)];
    } catch(e) {
      return [inputStr];
    }
  }

  function __compare(actual, expectedStr) {
    try {
      const expVal = Function('"use strict"; return (' + expectedStr + ')')();
      if (Array.isArray(expVal) && Array.isArray(actual)) {
        return JSON.stringify(actual) === JSON.stringify(expVal);
      }
      return actual === expVal || JSON.stringify(actual) === JSON.stringify(expVal);
    } catch(e) {
      return String(actual).trim() === String(expectedStr).trim();
    }
  }

  const __results = [];
  for (let i = 0; i < __tests.length; i++) {
    const tc = __tests[i];
    try {
      const args = __parseArgs(tc.input);
      const start = Date.now();
      const actual = __fn(...args);
      const durationMs = Date.now() - start;
      const passed = __compare(actual, tc.output);
      __results.push({
        index: i + 1,
        input: tc.input,
        expected: tc.output,
        actual: JSON.stringify(actual) !== undefined ? JSON.stringify(actual) : String(actual),
        passed,
        durationMs,
        isHidden: Boolean(tc.isHidden ?? i >= 2)
      });
    } catch (err) {
      __results.push({
        index: i + 1,
        input: tc.input,
        expected: tc.output,
        actual: "Runtime Error: " + err.message,
        passed: false,
        durationMs: 0,
        isHidden: Boolean(tc.isHidden ?? i >= 2)
      });
    }
  }

  const passedCount = __results.filter(r => r.passed).length;
  console.log("===HIRESYS_TEST_SUITE_START===");
  console.log(JSON.stringify({
    passedCount,
    totalCount: __results.length,
    results: __results
  }));
  console.log("===HIRESYS_TEST_SUITE_END===");
})();
`;
  }

  if (language === "python") {
    const jsonTests = JSON.stringify(testCases);
    return `
${userCode}

# ==========================================
# HireSys Cloud Test Suite Harness
# ==========================================
import json, sys, time

__tests = ${jsonTests}
__fn_name = "${fnName}"

def __run_suite():
    if __fn_name not in globals():
        print("===HIRESYS_TEST_SUITE_START===")
        print(json.dumps({
            "error": f"Function '{__fn_name}' was not found. Please implement def {__fn_name}(...).",
            "passedCount": 0,
            "totalCount": len(__tests),
            "results": []
        }))
        print("===HIRESYS_TEST_SUITE_END===")
        return

    __fn = globals()[__fn_name]
    __results = []

    def __parse_val(s):
        try:
            return eval(s)
        except:
            return s

    for i, tc in enumerate(__tests):
        inp = tc.get("input", "")
        exp = str(tc.get("output", "")).strip()
        try:
            if "=" in inp:
                parts = [p.split("=", 1)[1].strip() for p in inp.split(",") if "=" in p]
                args = [__parse_val(p) for p in parts]
            else:
                args = [__parse_val(inp)]

            t0 = time.time()
            actual = __fn(*args)
            dur = int((time.time() - t0) * 1000)

            act_str = str(actual).strip()
            passed = (act_str.lower() == exp.lower()) or (json.dumps(actual) == exp)

            __results.append({
                "index": i + 1,
                "input": tc.get("input"),
                "expected": exp,
                "actual": act_str,
                "passed": passed,
                "durationMs": dur,
                "isHidden": bool(tc.get("isHidden", i >= 2))
            })
        except Exception as e:
            __results.append({
                "index": i + 1,
                "input": tc.get("input"),
                "expected": exp,
                "actual": f"Error: {str(e)}",
                "passed": False,
                "durationMs": 0,
                "isHidden": bool(tc.get("isHidden", i >= 2))
            })

    passed_count = sum(1 for r in __results if r["passed"])
    print("===HIRESYS_TEST_SUITE_START===")
    print(json.dumps({
        "passedCount": passed_count,
        "totalCount": len(__results),
        "results": __results
    }))
    print("===HIRESYS_TEST_SUITE_END===")

__run_suite()
`;
  }

  return userCode;
}

export function parseTestExecutionOutput(rawStdout: string): {
  testSuite?: TestSuiteSummary;
  cleanStdout: string;
} {
  if (!rawStdout) {
    return { cleanStdout: "" };
  }

  const startMarker = "===HIRESYS_TEST_SUITE_START===";
  const endMarker = "===HIRESYS_TEST_SUITE_END===";

  const startIndex = rawStdout.indexOf(startMarker);
  const endIndex = rawStdout.indexOf(endMarker);

  if (startIndex === -1 || endIndex === -1) {
    return { cleanStdout: rawStdout };
  }

  const before = rawStdout.slice(0, startIndex);
  const jsonContent = rawStdout.slice(startIndex + startMarker.length, endIndex).trim();
  const after = rawStdout.slice(endIndex + endMarker.length);

  const cleanStdout = (before + after).trim();

  try {
    const parsed = JSON.parse(jsonContent) as TestSuiteSummary;
    return {
      testSuite: parsed,
      cleanStdout,
    };
  } catch (err) {
    console.error("Failed to parse test suite JSON:", err);
    return { cleanStdout: rawStdout };
  }
}
