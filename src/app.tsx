import { Router } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { Suspense } from "solid-js";
import "./app.css";

export default function App() {
  return (
    <Router
      root={props => (
        <div class="min-h-screen bg-gray-50">
          <header class="bg-white shadow">
            <div class="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
              <h1 class="text-3xl font-bold text-gray-900">Motriforge Platform</h1>
            </div>
          </header>
          <main class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
            <Suspense fallback={<div class="text-center py-8">Loading...</div>}>
              {props.children}
            </Suspense>
          </main>
        </div>
      )}
    >
      <FileRoutes />
    </Router>
  );
}