import * as readline from 'node:readline'
import { createAppConfig, saveUserConfig, ensureDir } from './config.js'
import type { UserConfig } from './config.js'
import { performOAuthFlow } from './auth/oauth.js'
import { saveApiKey, validateApiKey } from './auth/api-key.js'

function createPrompt(): readline.Interface {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })
}

function ask(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim())
    })
  })
}

function print(message: string): void {
  process.stdout.write(`${message}\n`)
}

export async function runSetup(): Promise<void> {
  const config = createAppConfig()
  const rl = createPrompt()

  print('')
  print('  🍌 Nano Banana MCP Setup')
  print('  ========================')
  print('')

  try {
    await ensureDir(config.configDir)

    print('  Authentication Method:')
    print('  (1) Google OAuth [default]')
    print('  (2) API Key')
    print('')

    const authChoice = await ask(rl, '  Select (1/2): ')
    const authMethod =
      authChoice === '2' ? ('api-key' as const) : ('oauth' as const)

    if (authMethod === 'oauth') {
      print('')
      print('  Starting Google OAuth flow...')
      print('  A browser window will open for authorization.')
      print('')

      try {
        await performOAuthFlow(config)
        print('  ✓ OAuth authentication successful!')
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown error'
        print(`  ✗ OAuth failed: ${message}`)
        print('  You can try again or use an API key instead.')
        rl.close()
        process.exit(1)
      }
    } else {
      print('')
      const apiKey = await ask(rl, '  Enter your Gemini API key: ')

      if (!apiKey) {
        print('  ✗ API key cannot be empty.')
        rl.close()
        process.exit(1)
      }

      print('  Validating API key...')
      const isValid = await validateApiKey(apiKey)

      if (!isValid) {
        print('  ⚠ Warning: API key validation failed. Saving anyway.')
      } else {
        print('  ✓ API key is valid!')
      }

      await saveApiKey(config.credentialsPath, apiKey)
    }

    print('')
    const outputDir = await ask(
      rl,
      `  Image output directory [${config.outputDir}]: `
    )
    const finalOutputDir = outputDir || config.outputDir

    await ensureDir(finalOutputDir)

    const userConfig: UserConfig = {
      authMethod,
      outputDir: finalOutputDir,
    }
    await saveUserConfig(config.configPath, userConfig)

    print('')
    print('  ✓ Setup complete!')
    print('')
    print('  Add to your MCP client config:')
    print('  {')
    print('    "mcpServers": {')
    print('      "nano-banana": {')
    print('        "command": "npx",')
    print('        "args": ["nano-banana-mcp"]')
    print('      }')
    print('    }')
    print('  }')
    print('')
  } finally {
    rl.close()
  }
}
