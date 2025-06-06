export const workoutRoutes = () => {
  return [
    {
      path: "/api/workouts",
      method: "GET",
      handler: async () => {
        // TODO: Implement workout service integration
        return new Response(JSON.stringify({ message: "Workout routes endpoint" }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        })
      }
    }
  ]
}