#!/usr/bin/env node

import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

const appName: string | undefined = process.argv[2];

if (!appName) {
  console.error("❌ Please provide a project name.");
  process.exit(1);
}

console.log(`📦 Creating LoopStack app: ${appName}`);

// Get the current package version to determine template version
const currentPackageJsonPath: string = path.join(process.cwd(), "package.json");
let templateVersion = "main"; // default fallback

if (fs.existsSync(currentPackageJsonPath)) {
  const currentPackageJson: any = JSON.parse(fs.readFileSync(currentPackageJsonPath, "utf8"));
  const version = currentPackageJson.version;

  if (version) {
    const versionParts = version.split(".");
    const minorVersion = `${versionParts[0]}.${versionParts[1]}`;
    templateVersion = `v${minorVersion}`;
    console.log(`📌 Using template version: ${templateVersion}`);
  }
}

// Clone starter template
const repo = "https://github.com/loopstack-ai/app-template.git";
execSync(`git clone ${repo} ${appName}`, { stdio: "inherit" });

// Checkout the specific version tag
process.chdir(appName);
try {
  console.log(`🔄 Checking out template version ${templateVersion}...`);
  execSync(`git checkout ${templateVersion}`, { stdio: "inherit" });
} catch (error) {
  console.warn(`⚠️  Warning: Could not checkout ${templateVersion}, using default branch`);
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

// Reset git
const gitDir: string = path.join(process.cwd(), ".git");
if (fs.existsSync(gitDir)) {
  fs.rmSync(gitDir, { recursive: true, force: true });
}

console.log("📦 Installing dependencies...");
execSync("npm install", { stdio: "inherit" });

console.log("🔄 Initializing fresh git repository...");
execSync("git init", { stdio: "inherit" });
execSync("git add .", { stdio: "inherit" });
execSync(`git commit -m "Initial commit from LoopStack template"`, { stdio: "inherit" });

console.log("\n🎉 LoopStack project created successfully!\n");

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