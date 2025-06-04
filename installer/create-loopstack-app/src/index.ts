#!/usr/bin/env node

import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

const appName = process.argv[2];

if (!appName) {
  console.error("❌ Please provide a project name.");
  process.exit(1);
}

console.log(`📦 Creating LoopStack app: ${appName}`);

// clone starter template
const repo = "https://github.com/loopstack-ai/app-template.git";
execSync(`git clone ${repo} ${appName}`, { stdio: "inherit" });

// update package json
const packageJsonPath = path.join(process.cwd(), appName, "package.json");
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
packageJson.name = appName;
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

console.log("📦 Installing dependencies...");
process.chdir(appName);
execSync("npm install", { stdio: "inherit" });

console.log("✅ LoopStack project is ready!");
console.log(`👉 cd ${appName}`);
console.log("👉 npm run start:dev");
