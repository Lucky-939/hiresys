import axios from "axios";

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const backendMessage = error.response?.data?.message;

    // Use backend message if it's clean and safe, but prefer our mapped messages for common statuses
    switch (status) {
      case 401:
        return "Session expired. Please sign in again.";
      case 403:
        return "You do not have permission to perform this action.";
      case 404:
        return "The requested resource could not be found.";
      case 409:
        return "This action cannot be completed because the resource has already been finalized.";
      case 429:
        return "Too many requests. Please wait and try again.";
      case 500:
      case 502:
      case 503:
      case 504:
        return "Something went wrong. Please try again later.";
      default:
        return backendMessage || "An unexpected error occurred.";
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "An unexpected error occurred.";
}
