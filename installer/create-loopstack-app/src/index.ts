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

// clone starter template
const repo = "https://github.com/loopstack-ai/app-template.git";
execSync(`git clone ${repo} ${appName}`, { stdio: "inherit" });

// update package json
const packageJsonPath: string = path.join(process.cwd(), appName, "package.json");
const packageJson: any = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
packageJson.name = appName;
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

console.log("📦 Installing dependencies...");
process.chdir(appName);
execSync("npm install", { stdio: "inherit" });

console.log("\n🎉 LoopStack project created successfully!\n");

console.log("👉 Next steps to get started:");
console.log(`   1. cd ${appName}`);
console.log("   2. cp .env.example .env");
console.log("   3. docker compose up -d");
console.log("   4. npm run start:dev");

console.log("\n👉 Your app will be available at:");
console.log("   → http://localhost:3000");

console.log("\n💡 Quick tips:");
console.log("   • Edit your .env file to configure your environment");
console.log("   • Need help? Check the documentation or README.md");
console.log("─".repeat(50));
