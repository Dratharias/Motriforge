import { Title } from "@solidjs/meta";

export default function Home() {
  return (
    <main class="px-4 py-8">
      <Title>Motriforge Platform</Title>
      <div class="max-w-4xl mx-auto">
        <div class="text-center mb-8">
          <h1 class="text-4xl font-bold text-gray-900 mb-4">
            Welcome to Motriforge Platform
          </h1>
          <p class="text-xl text-gray-600 mb-8">
            Comprehensive fitness platform with observability infrastructure
          </p>
        </div>

        <div class="grid md:grid-cols-2 gap-6">
          <div class="bg-white p-6 rounded-lg shadow">
            <h2 class="text-xl font-semibold mb-4">🔍 Observability System</h2>
            <ul class="space-y-2 text-gray-600">
              <li>• Unified severity classification</li>
              <li>• Actor.Action.Scope.Target pattern</li>
              <li>• Event logging and tracking</li>
              <li>• Audit trail and compliance</li>
            </ul>
          </div>

          <div class="bg-white p-6 rounded-lg shadow">
            <h2 class="text-xl font-semibold mb-4">🏗️ Architecture</h2>
            <ul class="space-y-2 text-gray-600">
              <li>• SolidStart with TypeScript</li>
              <li>• PostgreSQL with Drizzle ORM</li>
              <li>• Microservice-based design</li>
              <li>• Docker containerization</li>
            </ul>
          </div>

          <div class="bg-white p-6 rounded-lg shadow">
            <h2 class="text-xl font-semibold mb-4">🛠️ Development Tools</h2>
            <ul class="space-y-2 text-gray-600">
              <li>• <a href="/api/health" class="text-blue-600 hover:underline">Health Check API</a></li>
              <li>• Database Studio (npm run db:studio)</li>
              <li>• Automated testing suite</li>
              <li>• ESLint + Prettier</li>
            </ul>
          </div>

          <div class="bg-white p-6 rounded-lg shadow">
            <h2 class="text-xl font-semibold mb-4">📚 Quick Links</h2>
            <ul class="space-y-2 text-gray-600">
              <li>• <a href="/api/health" class="text-blue-600 hover:underline">API Health Status</a></li>
              <li>• README.md for setup guide</li>
              <li>• QuickStart.md for getting started</li>
              <li>• Documentation in /docs</li>
            </ul>
          </div>
        </div>

        <div class="mt-8 text-center">
          <div class="bg-green-50 border border-green-200 rounded-lg p-4">
            <p class="text-green-800">
              🎉 Platform is successfully set up and running!
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}