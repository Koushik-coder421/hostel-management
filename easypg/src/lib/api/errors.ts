export class ApiError extends Error {
  constructor(
    message: string,
    public status = 0,
    public code = "API_UNAVAILABLE",
    public fieldErrors?: Record<string, string>,
    public requestId?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}
