import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

interface ValidationResult {
  readonly category: string
  readonly item: string
  readonly status: "✅" | "❌" | "⚠️"
  readonly message: string
}

class SetupValidator {
  private readonly results: ValidationResult[] = []
  private readonly rootDir: string

  constructor() {
    this.rootDir = path.resolve(__dirname, "..")
  }

  validate(): void {
    console.log("🔍 Validating MōtriForge Prisma Setup...\n")

    this.validateDirectoryStructure()
    this.validateConfigFiles()
    this.validateSchemaFiles()
    this.validateScripts()
    this.validateEnvironment()
    this.validateDependencies()

    this.printResults()
  }

  private validateDirectoryStructure(): void {
    const requiredDirs = [
      "schema-parts",
      "scripts",
      "generated",
    ]

    const optionalDirs = [
      "migrations",
      "seed",
    ]

    requiredDirs.forEach(dir => {
      const dirPath = path.join(this.rootDir, dir)
      if (fs.existsSync(dirPath)) {
        this.addResult("Structure", dir, "✅", "Directory exists")
      } else {
        this.addResult("Structure", dir, "❌", "Required directory missing")
      }
    })

    optionalDirs.forEach(dir => {
      const dirPath = path.join(this.rootDir, dir)
      if (fs.existsSync(dirPath)) {
        this.addResult("Structure", dir, "✅", "Optional directory exists")
      } else {
        this.addResult("Structure", dir, "⚠️", "Optional directory missing")
      }
    })
  }

  private validateConfigFiles(): void {
    const configFiles = [
      { name: "package.json", required: true },
      { name: "tsconfig.json", required: true },
      { name: ".gitignore", required: true },
      { name: ".env", required: false },
      { name: ".env.template", required: true },
      { name: "README.md", required: true },
    ]

    configFiles.forEach(({ name, required }) => {
      const filePath = path.join(this.rootDir, name)
      if (fs.existsSync(filePath)) {
        this.addResult("Config", name, "✅", "File exists")
        
        // Validate package.json structure
        if (name === "package.json") {
          this.validatePackageJson(filePath)
        }
      } else {
        const status = required ? "❌" : "⚠️"
        const message = required ? "Required file missing" : "Optional file missing"
        this.addResult("Config", name, status, message)
      }
    })
  }

  private validateSchemaFiles(): void {
    const schemaPartsDir = path.join(this.rootDir, "schema-parts")
    const expectedFiles = [
      "00-foundation.prisma",
      "01-user.prisma",
      "02-anatomy.prisma",
      "03-equipment.prisma",
      "04-exercise.prisma",
      "05-media.prisma",
      "06-workout.prisma",
      "07-program.prisma",
      "08-tracking.prisma",
    ]

    if (!fs.existsSync(schemaPartsDir)) {
      this.addResult("Schema", "schema-parts", "❌", "Schema parts directory missing")
      return
    }

    expectedFiles.forEach(file => {
      const filePath = path.join(schemaPartsDir, file)
      if (fs.existsSync(filePath)) {
        this.addResult("Schema", file, "✅", "Schema file exists")
        this.validateSchemaFile(filePath, file)
      } else {
        this.addResult("Schema", file, "❌", "Required schema file missing")
      }
    })

    // Check for generated schema
    const generatedSchema = path.join(this.rootDir, "generated", "schema.prisma")
    if (fs.existsSync(generatedSchema)) {
      this.addResult("Schema", "generated/schema.prisma", "✅", "Generated schema exists")
    } else {
      this.addResult("Schema", "generated/schema.prisma", "⚠️", "Run 'npm run generate' to create")
    }
  }

  private validateScripts(): void {
    const scriptsDir = path.join(this.rootDir, "scripts")
    const expectedScripts = [
      "generate.ts",
      "merge-schema.js",
      "seed.ts",
      "validate-setup.ts",
    ]

    if (!fs.existsSync(scriptsDir)) {
      this.addResult("Scripts", "scripts", "❌", "Scripts directory missing")
      return
    }

    expectedScripts.forEach(script => {
      const scriptPath = path.join(scriptsDir, script)
      if (fs.existsSync(scriptPath)) {
        this.addResult("Scripts", script, "✅", "Script exists")
      } else {
        if (script === "validate-setup.ts") {
          this.addResult("Scripts", script, "⚠️", "Optional script missing")
        } else {
          this.addResult("Scripts", script, "❌", "Required script missing")
        }
      }
    })
  }

  private validateEnvironment(): void {
    const envPath = path.join(this.rootDir, ".env")
    const envTemplatePath = path.join(this.rootDir, ".env.template")

    if (fs.existsSync(envPath)) {
      this.addResult("Environment", ".env", "✅", "Environment file exists")
      this.validateEnvFile(envPath)
    } else {
      this.addResult("Environment", ".env", "⚠️", "Copy from .env.template and configure")
    }

    if (fs.existsSync(envTemplatePath)) {
      this.addResult("Environment", ".env.template", "✅", "Template exists")
    } else {
      this.addResult("Environment", ".env.template", "❌", "Environment template missing")
    }
  }

  private validateDependencies(): void {
    const packageJsonPath = path.join(this.rootDir, "package.json")
    
    if (!fs.existsSync(packageJsonPath)) {
      this.addResult("Dependencies", "package.json", "❌", "Package.json missing")
      return
    }

    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"))
      const requiredDeps = ["@prisma/client"]
      const requiredDevDeps = ["prisma", "@types/node", "tsx"]

      requiredDeps.forEach(dep => {
        if (packageJson.dependencies?.[dep]) {
          this.addResult("Dependencies", dep, "✅", "Dependency installed")
        } else {
          this.addResult("Dependencies", dep, "❌", "Required dependency missing")
        }
      })

      requiredDevDeps.forEach(dep => {
        if (packageJson.devDependencies?.[dep]) {
          this.addResult("Dependencies", dep, "✅", "Dev dependency installed")
        } else {
          this.addResult("Dependencies", dep, "❌", "Required dev dependency missing")
        }
      })

    } catch (error) {
      this.addResult("Dependencies", "package.json", "❌", "Invalid package.json format")
    }
  }

  private validatePackageJson(filePath: string): void {
    try {
      const packageJson = JSON.parse(fs.readFileSync(filePath, "utf8"))
      
      const requiredScripts = [
        "merge", "generate", "migrate", "seed", "format", "validate"
      ]

      requiredScripts.forEach(script => {
        if (packageJson.scripts?.[script]) {
          this.addResult("Scripts", `npm run ${script}`, "✅", "Script configured")
        } else {
          this.addResult("Scripts", `npm run ${script}`, "❌", "Required script missing")
        }
      })

    } catch (error) {
      this.addResult("Config", "package.json", "❌", "Invalid JSON format")
    }
  }

  private validateSchemaFile(filePath: string, fileName: string): void {
    try {
      const content = fs.readFileSync(filePath, "utf8")
      
      // Basic validation checks
      if (content.trim().length === 0) {
        this.addResult("Schema", fileName, "❌", "Empty schema file")
        return
      }

      // Check for common schema elements
      if (fileName === "00-foundation.prisma") {
        if (!content.includes("generator client")) {
          this.addResult("Schema", `${fileName} generator`, "❌", "Missing generator block")
        }
        if (!content.includes("datasource db")) {
          this.addResult("Schema", `${fileName} datasource`, "❌", "Missing datasource block")
        }
      }

      // Check for model definitions
      const modelCount = (content.match(/^model\s+\w+/gm) || []).length
      if (modelCount === 0 && !fileName.includes("foundation")) {
        this.addResult("Schema", fileName, "⚠️", "No models defined")
      }

    } catch (error) {
      this.addResult("Schema", fileName, "❌", "Cannot read schema file")
    }
  }

  private validateEnvFile(filePath: string): void {
    try {
      const content = fs.readFileSync(filePath, "utf8")
      
      if (content.includes("DATABASE_URL")) {
        this.addResult("Environment", "DATABASE_URL", "✅", "Database URL configured")
      } else {
        this.addResult("Environment", "DATABASE_URL", "❌", "DATABASE_URL missing")
      }

      // Check for placeholder values
      if (content.includes("username:password@localhost")) {
        this.addResult("Environment", "DATABASE_URL", "⚠️", "Using template values - update with real credentials")
      }

    } catch (error) {
      this.addResult("Environment", ".env", "❌", "Cannot read environment file")
    }
  }

  private addResult(category: string, item: string, status: "✅" | "❌" | "⚠️", message: string): void {
    this.results.push({ category, item, status, message })
  }

  private printResults(): void {
    const categories = [...new Set(this.results.map(r => r.category))]
    
    categories.forEach(category => {
      console.log(`\n📋 ${category}:`)
      const categoryResults = this.results.filter(r => r.category === category)
      
      categoryResults.forEach(result => {
        console.log(`  ${result.status} ${result.item.padEnd(25)} ${result.message}`)
      })
    })

    const errorCount = this.results.filter(r => r.status === "❌").length
    const warningCount = this.results.filter(r => r.status === "⚠️").length
    const successCount = this.results.filter(r => r.status === "✅").length

    console.log(`\n📊 Summary:`)
    console.log(`  ✅ Success: ${successCount}`)
    console.log(`  ⚠️  Warnings: ${warningCount}`)
    console.log(`  ❌ Errors: ${errorCount}`)

    if (errorCount > 0) {
      console.log(`\n❌ Setup validation failed. Please fix the errors above.`)
      process.exit(1)
    } else if (warningCount > 0) {
      console.log(`\n⚠️  Setup validation passed with warnings. Consider addressing them.`)
    } else {
      console.log(`\n🎉 Setup validation passed! Your Prisma configuration is ready.`)
    }
  }
}

// Execute validation
const validator = new SetupValidator()
validator.validate()