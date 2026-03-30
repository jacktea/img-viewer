import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { execSync } from 'node:child_process';
import readline from 'node:readline';

const rootDir = process.cwd();
const packages = ['packages/core', 'packages/react', 'packages/vue'];

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function main() {
  console.log('📦 Preparing for release...');

  // 1. Get current version from one of the packages (assuming they are synced)
  const corePkgPath = resolve(rootDir, 'packages/core/package.json');
  const corePkg = JSON.parse(readFileSync(corePkgPath, 'utf-8'));
  const currentVersion = corePkg.version;

  console.log(`\nCurrent version is: ${currentVersion}`);

  // 2. Ask for new version
  const newVersion = await question(`Enter the new version (e.g. 1.0.0, default: bump minor): `);
  const versionToUse = newVersion.trim() || generateNextVersion(currentVersion);

  const confirm = await question(`Are you sure you want to release version ${versionToUse}? (y/N): `);
  if (confirm.toLowerCase() !== 'y') {
    console.log('Release cancelled.');
    process.exit(0);
  }

  // 3. Update all package.json files
  console.log(`\n⏳ Updating version to ${versionToUse} in all packages...`);
  for (const pkg of packages) {
    const pkgPath = resolve(rootDir, pkg, 'package.json');
    const pkgContent = JSON.parse(readFileSync(pkgPath, 'utf-8'));

    pkgContent.version = versionToUse;

    // Also update workspace dependency versions if they exist
    if (pkgContent.dependencies && pkgContent.dependencies['@jacktea/img-viewer']) {
      pkgContent.dependencies['@jacktea/img-viewer'] = versionToUse;
    }

    writeFileSync(pkgPath, JSON.stringify(pkgContent, null, 2) + '\n');
    console.log(`✅ Updated ${pkg}/package.json`);
  }

  // Update root package.json just in case
  const rootPkgPath = resolve(rootDir, 'package.json');
  const rootPkg = JSON.parse(readFileSync(rootPkgPath, 'utf-8'));
  rootPkg.version = versionToUse;
  writeFileSync(rootPkgPath, JSON.stringify(rootPkg, null, 2) + '\n');

  // 4. Build packages
  console.log(`\n⏳ Building core package first (for types)...`);
  try {
    execSync('pnpm --filter @jacktea/img-viewer run build', { stdio: 'inherit', cwd: rootDir });
    console.log(`⏳ Building remaining packages...`);
    execSync('pnpm --filter=!@jacktea/img-viewer --filter=!img-viewer-desktop -r run build', { stdio: 'inherit', cwd: rootDir });
    console.log('✅ Build successful.');
  } catch (error) {
    console.error('❌ Build failed. Release aborted.');
    process.exit(1);
  }

  // 5. Publish
  const publishConfirm = await question(`\nProceed to publish to npm? (y/N): `);
  if (publishConfirm.toLowerCase() === 'y') {
    try {
      // workspace publish
      execSync('pnpm publish -r --access public --no-git-checks --registry=https://registry.npmjs.org', { stdio: 'inherit', cwd: rootDir });
      console.log(`\n🎉 Successfully published version ${versionToUse}`);
    } catch (error) {
      console.error('❌ Publish failed.');
    }
  } else {
    console.log('Skipped publish.');
  }

  rl.close();
}

function generateNextVersion(current) {
  const parts = current.split('.');
  if (parts.length === 3) {
    const patch = parseInt(parts[2], 10);
    return `${parts[0]}.${parts[1]}.${patch + 1}`;
  }
  return current;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
