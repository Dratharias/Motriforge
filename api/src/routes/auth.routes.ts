export const authRoutes = () => {
  return [
    {
      path: "/api/auth/login",
      method: "POST",
      handler: async () => {
        // TODO: Implement auth service integration
        return new Response(JSON.stringify({ message: "Auth login endpoint" }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        })
      }
    }
  ]
}