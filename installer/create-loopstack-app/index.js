#!/usr/bin/env node
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const appName = process.argv[2];

if (!appName) {
  console.error("❌ Please provide a project name.");
  process.exit(1);
}

console.log(`📦 Creating a new LoopStack project in ${appName}...`);

const repo = "https://github.com/your-org/loopstack-template.git"; // Replace with your actual template repo
execSync(`git clone ${repo} ${appName}`, { stdio: "inherit" });

// Update package.json name
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
