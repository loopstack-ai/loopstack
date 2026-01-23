const fs = require('fs');
const path = require('path');

const pkgPath = path.join(__dirname, '..', 'frontend', 'loopstack-studio', 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const version = pkg.version;

const templateDir = path.join(__dirname, '..', 'templates');
const templates = fs.readdirSync(templateDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => path.join(templateDir, dirent.name, '.env.default'))
    .filter(envPath => fs.existsSync(envPath));

templates.forEach((envPath) => {
  let env = fs.readFileSync(envPath, 'utf8');

  if (env.match(/LOOPSTACK_STUDIO_VERSION=/)) {
    env = env.replace(/LOOPSTACK_STUDIO_VERSION=.*/, `LOOPSTACK_STUDIO_VERSION=${version}`);
  } else {
    env += `\nLOOPSTACK_STUDIO_VERSION=${version}`;
  }

  fs.writeFileSync(envPath, env);
  console.log(`Updated ${path.relative(process.cwd(), envPath)} → ${version}`);
});

console.log(`\nDone! Updated ${templates.length} file(s)`);