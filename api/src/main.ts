import { APIConfig } from "@/shared/config/api.config"
import { logger } from "@/shared/utils/logger"
import { APIGateway } from "./server"

/**
 * Main entry point for the API Gateway
 */
async function main(): Promise<void> {
  try {
    const config = APIConfig.fromEnvironment()
    const gateway = new APIGateway(config)

    // Handle graceful shutdown
    process.on("SIGTERM", async () => {
      logger.info("SIGTERM received, shutting down gracefully...")
      await gateway.shutdown()
      process.exit(0)
    })

    process.on("SIGINT", async () => {
      logger.info("SIGINT received, shutting down gracefully...")
      await gateway.shutdown()
      process.exit(0)
    })

    await gateway.start()
  } catch (error) {
    logger.error("Failed to start application", { error })
    process.exit(1)
  }
}

// Start the application
main().catch((error) => {
  logger.error("Unhandled error in main", { error })
  process.exit(1)
})