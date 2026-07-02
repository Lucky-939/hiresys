import axios from "axios";

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const backendMessage = error.response?.data?.message;

    const backendErrors = error.response?.data?.errors;

    // Use backend message if it's clean and safe, but prefer our mapped messages for common statuses
    switch (status) {
      case 400:
        if (Array.isArray(backendErrors) && backendErrors.length > 0) {
          return backendErrors.join(", ");
        }
        return backendMessage || "Bad Request";
      case 401:
        return "Session expired. Please sign in again.";
      case 403:
        return "You do not have permission to perform this action.";
      case 404:
        return "The requested resource could not be found.";
      case 409:
        return backendMessage || "Conflict";
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
