import { ApiFoundationFacade } from './core/ApiFoundationFacade';

export class APIService {
  private static instance: APIService;
  private readonly facade: ApiFoundationFacade;

  private constructor() {
    this.facade = new ApiFoundationFacade();
  }

  public static getInstance(): APIService {
    if (!APIService.instance) {
      APIService.instance = new APIService();
    }
    return APIService.instance;
  }

  public initialize(): void {
    this.facade.setupRoutes();
  }

  public async handleRequest(request: Request): Promise<Response> {
    return await this.facade.handleRequest(request);
  }
}

// Export for SolidStart integration
export const apiService = APIService.getInstance();
