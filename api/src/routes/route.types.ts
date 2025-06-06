import { MiddlewareContext, Middleware } from "../middleware/types"

export type RouteHandler = (context: MiddlewareContext) => Promise<Response>;

export interface Route {
  readonly path: string;
  readonly method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  readonly handler: RouteHandler;
  readonly middleware?: readonly Middleware[];
  readonly description?: string;
}

export interface RouteGroup {
  readonly prefix: string;
  readonly routes: readonly Route[];
  readonly middleware?: readonly Middleware[];
}