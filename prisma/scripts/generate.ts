import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

// Emulate __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function run(command: string, description: string) {
  try {
    console.log(`\x1b[34m${description}...\x1b[0m`);
    execSync(command, { stdio: "inherit" });
    console.log(`\x1b[32m✅ ${description} complete\x1b[0m`);
  } catch (err) {
    console.error(`\x1b[31m❌ ${description} failed\x1b[0m`);
    process.exit(1);
  }
}

console.log("\n🚀 Prisma Build Process Starting...\n");

const prismaDir = path.resolve(__dirname, "..");
process.chdir(prismaDir);

run("node scripts/merge-schema.js", "Step 1: Merging schema files");
run("npx prisma format", "Step 2: Formatting schema");
run("npx prisma generate", "Step 3: Generating Prisma client");
run("npx prisma validate", "Step 4: Validating schema");

console.log("\n\x1b[32m🎉 Prisma build process completed successfully!\x1b[0m\n");
