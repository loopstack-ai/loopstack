#!/usr/bin/env node

import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

const appName: string | undefined = process.argv[2];
const templateVersion: string = process.argv[3] || "latest";

if (!appName) {
  console.error("❌ Please provide a project name.");
  console.error("Usage: create-loopstack-app <app-name> [template-version]");
  console.error("Example: create-loopstack-app my-app");
  process.exit(1);
}

console.log(`📦 Creating Loopstack app: ${appName}`);
console.log(`📌 Using template version: ${templateVersion}`);

// Clone starter template
const repo = "https://github.com/loopstack-ai/app-template.git";
execSync(`git clone ${repo} ${appName}`, { stdio: "inherit" });

// Checkout the specific version tag
process.chdir(appName);

if (templateVersion !== "latest") {
  const tagName = `@loopstack/app-template@${templateVersion}`;
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

console.log("\n👉 Your app will be available at:");
console.log("   → http://localhost:3000");

console.log("\n💡 Quick tips:");
console.log("   • Edit your .env file to configure your environment");
console.log("   • Need help? Check the documentation or README.md");
console.log("─".repeat(50));