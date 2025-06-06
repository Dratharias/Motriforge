export const exerciseRoutes = () => {
  return [
    {
      path: "/api/exercises",
      method: "GET",
      handler: async () => {
        // TODO: Implement exercise service integration
        return new Response(JSON.stringify({ message: "Exercise routes endpoint" }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        })
      }
    }
  ]
}