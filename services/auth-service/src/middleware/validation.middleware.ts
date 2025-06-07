export function validationMiddleware() {
  return (req: any, res: any, next: () => void) => {
    // Basic validation middleware
    // Can be extended with schema validation
    next()
  }
}
