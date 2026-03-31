const fs = require('fs')
const path = require('path')

const packageJsonPath = path.join(process.cwd(), 'package.json')

function parseArgs(argv) {
  const args = {}

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]

    if (arg === '--version') {
      args.version = argv[i + 1]
      i += 1
      continue
    }

    if (arg === '--commit') {
      args.commit = true
      continue
    }
  }

  return args
}

function isValidSemver(version) {
  return /^\d+\.\d+\.\d+$/.test(version)
}

function bumpPatch(version) {
  const [major, minor, patch] = version.split('.').map(Number)
  return `${major}.${minor}.${patch + 1}`
}

const args = parseArgs(process.argv.slice(2))
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
const nextVersion = args.version || bumpPatch(packageJson.version)

if (!isValidSemver(nextVersion)) {
  console.error(`Invalid version: ${nextVersion}. Expected format: x.y.z`)
  process.exit(1)
}

if (args.commit) {
  packageJson.version = nextVersion
  fs.writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`)
}

process.stdout.write(nextVersion)
