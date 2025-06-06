export const userRoutes = () => {
  return [
    {
      path: "/api/users/:id",
      method: "GET",
      handler: async () => {
        // TODO: Implement user service integration
        return new Response(JSON.stringify({ message: "User routes endpoint" }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        })
      }
    }
  ]
}