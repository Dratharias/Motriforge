export const programRoutes = () => {
  return [
    {
      path: "/api/programs",
      method: "GET",
      handler: async () => {
        // TODO: Implement program service integration
        return new Response(JSON.stringify({ message: "Program routes endpoint" }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        })
      }
    }
  ]
}