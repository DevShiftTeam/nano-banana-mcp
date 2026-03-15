#!/usr/bin/env node

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { createAppConfig, loadUserConfig } from './config.js'
import { createServer } from './server.js'

async function main(): Promise<void> {
  if (process.argv[2] === 'setup') {
    const { runSetup } = await import('./cli.js')
    await runSetup()
    return
  }

  const baseConfig = createAppConfig()
  const userConfig = await loadUserConfig(baseConfig.configPath)

  const config = {
    ...baseConfig,
    outputDir: userConfig.outputDir,
  }

  const server = createServer(config)
  const transport = new StdioServerTransport()
  await server.connect(transport)
}

main().catch((error) => {
  process.stderr.write(`Fatal error: ${error instanceof Error ? error.message : String(error)}\n`)
  process.exit(1)
})
