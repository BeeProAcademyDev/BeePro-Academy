#!/usr/bin/env node

/**
 * CORS Verification Script
 *
 * Tests that:
 * 1. OPTIONS preflight requests return correct CORS headers
 * 2. Actual requests return correct CORS headers
 * 3. All required headers are present
 */

const http = require("http");

const BASE_URL = "http://localhost:5000";
const API_ENDPOINT = "/api/v1/auth/login";
const TEST_ORIGIN = "http://localhost:3000";

const REQUIRED_HEADERS = [
  "access-control-allow-origin",
  "access-control-allow-methods",
  "access-control-allow-headers",
];

function makeRequest(method, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(API_ENDPOINT, BASE_URL);

    const requestOptions = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        Origin: TEST_ORIGIN,
        "Content-Type": "application/json",
        ...options.headers,
      },
    };

    const req = http.request(requestOptions, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data,
        });
      });
    });

    req.on("error", reject);

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }

    req.end();
  });
}

async function runTests() {
  console.log("🧪 CORS Verification Test Suite\n");
  console.log(`Testing: ${BASE_URL}${API_ENDPOINT}`);
  console.log(`Origin: ${TEST_ORIGIN}\n`);

  try {
    // Test 1: OPTIONS Preflight Request
    console.log("Test 1: OPTIONS Preflight Request");
    console.log("─".repeat(50));
    const optionsResponse = await makeRequest("OPTIONS");

    console.log(`Status: ${optionsResponse.statusCode}`);
    console.log("Headers:");
    Object.keys(optionsResponse.headers).forEach((key) => {
      if (key.toLowerCase().includes("access-control") || key === "vary") {
        console.log(`  ${key}: ${optionsResponse.headers[key]}`);
      }
    });

    const optionsCheck = REQUIRED_HEADERS.every(
      (header) => optionsResponse.headers[header],
    );

    if (optionsCheck && optionsResponse.statusCode === 204) {
      console.log("✅ PASS: All CORS headers present\n");
    } else {
      console.log("❌ FAIL: Missing CORS headers\n");
    }

    // Test 2: POST Request (Actual Request)
    console.log("Test 2: POST Request (Actual Request)");
    console.log("─".repeat(50));
    const postResponse = await makeRequest("POST", {
      body: {
        email: "test@example.com",
        password: "test123",
      },
    });

    console.log(`Status: ${postResponse.statusCode}`);
    console.log("CORS Headers:");
    Object.keys(postResponse.headers).forEach((key) => {
      if (key.toLowerCase().includes("access-control")) {
        console.log(`  ${key}: ${postResponse.headers[key]}`);
      }
    });

    const postCheck =
      postResponse.headers["access-control-allow-origin"] === TEST_ORIGIN;

    if (postCheck) {
      console.log("✅ PASS: CORS header present in actual request\n");
    } else {
      console.log("❌ FAIL: CORS header missing in actual request\n");
    }

    // Summary
    console.log("─".repeat(50));
    if (optionsCheck && postCheck) {
      console.log("✅ All tests passed! CORS is working correctly.");
      process.exit(0);
    } else {
      console.log("❌ Some tests failed. Check CORS configuration.");
      process.exit(1);
    }
  } catch (error) {
    console.error("❌ Error running tests:", error.message);
    process.exit(1);
  }
}

// Run tests
runTests();
