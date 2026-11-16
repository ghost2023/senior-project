declare module "pg" {
  export class Pool {
    [key: string]: any;
    constructor(config?: { connectionString?: string });
    connect(): Promise<unknown>;
    end(): Promise<void>;
  }
}
