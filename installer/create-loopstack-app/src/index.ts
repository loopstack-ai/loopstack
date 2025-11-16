#!/usr/bin/env node

import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

// Parse arguments
const args = process.argv.slice(2);
let appName: string | undefined;
let templateName: string = "app-template";
let templateVersion: string = "latest";

for (const arg of args) {
  if (arg.startsWith("--template=")) {
    templateName = arg.split("=")[1];
  } else if (arg.startsWith("--version=")) {
    templateVersion = arg.split("=")[1];
  } else if (!arg.startsWith("--")) {
    appName = arg;
  }
}

if (!appName) {
  console.error("❌ Please provide a project name.");
  console.error("\nUsage: create-loopstack-app <app-name> [options]");
  console.error("\nOptions:");
  console.error("  --template=<name>    Template to use (default: app-template)");
  console.error("  --version=<version>  Template version (default: latest)");
  console.error("\nExamples:");
  console.error("  create-loopstack-app my-app");
  console.error("  create-loopstack-app my-app --template=custom-template");
  console.error("  create-loopstack-app my-app --template=custom-template --version=1.0.0");
  process.exit(1);
}

console.log(`📦 Creating Loopstack app: ${appName}`);
console.log(`📋 Using template: ${templateName}`);
console.log(`📌 Using template version: ${templateVersion}`);

// Clone starter template
const repo = `https://github.com/loopstack-ai/${templateName}.git`;
console.log(`🔗 Cloning from: ${repo}`);

try {
  execSync(`git clone ${repo} ${appName}`, { stdio: "inherit" });
} catch (error) {
  console.error(`❌ Error: Could not clone repository ${repo}`);
  console.error("Please verify that the template name is correct.");
  process.exit(1);
}

// Checkout the specific version tag
process.chdir(appName);

if (templateVersion !== "latest") {
  const tagName = `@loopstack/${templateName}@${templateVersion}`;
  try {
    console.log(`🔄 Checking out template tag ${tagName}...`);
    execSync(`git checkout ${tagName}`, { stdio: "inherit" });
  } catch (error) {
    console.error(`❌ Error: Could not checkout tag ${tagName}`);
    console.error("Please verify that the template version exists.");
    process.exit(1);
  }
} else {
  console.log(`🔄 Using latest version from default branch...`);
}

// Update package json
const packageJsonPath: string = path.join(process.cwd(), "package.json");
const packageJson: any = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
packageJson.name = appName;
packageJson.version = "0.0.1";
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

// Copy .env.example to .env
const envExamplePath: string = path.join(process.cwd(), ".env.example");
const envPath: string = path.join(process.cwd(), ".env");

if (fs.existsSync(envExamplePath)) {
  console.log("📄 Creating .env file from .env.example...");
  fs.copyFileSync(envExamplePath, envPath);
} else {
  console.warn("⚠️  Warning: .env.example not found, skipping .env creation");
}

// Reset git repository
const gitDir: string = path.join(process.cwd(), ".git");
if (fs.existsSync(gitDir)) {
  fs.rmSync(gitDir, { recursive: true, force: true });
}

console.log("📦 Installing dependencies...");
execSync("npm install", { stdio: "inherit" });

console.log("🔄 Initializing fresh git repository...");
execSync("git init", { stdio: "inherit" });
execSync("git add .", { stdio: "inherit" });
execSync(`git commit -m "Initial commit"`, { stdio: "inherit" });

console.log("\n🎉 Loopstack project created successfully!\n");

console.log("👉 Next steps to get started:");
console.log(`   1. cd ${appName}`);
console.log("   2. docker compose up -d");
console.log("   3. npm run start:dev");

console.log("─".repeat(50));