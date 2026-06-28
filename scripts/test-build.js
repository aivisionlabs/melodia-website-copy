#!/usr/bin/env node

/**
 * Test build script
 * Runs the build command to verify the project builds successfully
 */

const { execSync } = require("child_process");
const path = require("path");

console.log("🔨 Testing build...\n");

try {
  // Run the build command
  execSync("npm run build", {
    stdio: "inherit",
    cwd: path.resolve(__dirname, ".."),
    env: { ...process.env, NODE_ENV: "production" },
  });

  console.log("\n✅ Build succeeded!");
  process.exit(0);
} catch (error) {
  console.error("\n❌ Build failed!");
  console.error("Please fix build errors before pushing to main.\n");
  process.exit(1);
}



