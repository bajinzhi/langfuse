import { TRPCClientError } from "@trpc/client";
import { translateClientMessage, type MessageKey } from "@/src/features/i18n";
import { showErrorToast } from "@/src/features/notifications/showErrorToast";

// Catch network level errors, e.g. by proxy rate-limiting

/**
 * Check if error was caused by a response parsing failure.
 * This happens when infrastructure (nginx, cloudflare, etc.) returns a non-JSON
 * response body (e.g., empty body on 431, HTML error page on 502/503/504).
 */
const isResponseParseError = (error: TRPCClientError<any>): boolean => {
  return error.cause instanceof SyntaxError;
};

const httpStatusOverride: Record<number, keyof typeof errorTitleKeyMap> = {
  429: "TOO_MANY_REQUESTS",
  524: "TIMEOUT",
};

const errorTitleKeyMap = {
  BAD_REQUEST: "errors.badRequest",
  UNAUTHORIZED: "errors.unauthorized",
  FORBIDDEN: "errors.forbidden",
  NOT_FOUND: "errors.notFound",
  TIMEOUT: "errors.timeout",
  CONFLICT: "errors.conflict",
  PRECONDITION_FAILED: "errors.preconditionFailed",
  PAYLOAD_TOO_LARGE: "errors.payloadTooLarge",
  METHOD_NOT_SUPPORTED: "errors.methodNotSupported",
  UNPROCESSABLE_CONTENT: "errors.unprocessableContent",
  TOO_MANY_REQUESTS: "errors.tooManyRequests",
  CLIENT_CLOSED_REQUEST: "errors.clientClosedRequest",
  INTERNAL_SERVER_ERROR: "errors.internalServer",
  SERVICE_UNAVAILABLE: "errors.internalServer",
} as const;

const getErrorTitleAndHttpCode = (error: TRPCClientError<any>) => {
  const httpStatus: number =
    typeof error.data?.httpStatus === "number" ? error.data.httpStatus : 500;

  if (
    httpStatus === 422 &&
    error.data?.errorName === "ClickHouseResourceError"
  ) {
    // Handle ClickHouse resource limit errors with specific messaging
    return {
      errorTitle: "Request Timed Out",
      httpStatus,
    };
  }

  if (httpStatus in httpStatusOverride) {
    return {
      errorTitle: translateClientMessage(
        errorTitleKeyMap[httpStatusOverride[httpStatus]],
      ),
      httpStatus,
    };
  }

  const errorTitleKey =
    error.data?.code in errorTitleKeyMap
      ? errorTitleKeyMap[error.data?.code as keyof typeof errorTitleKeyMap]
      : ("errors.unexpected" satisfies MessageKey);

  return { errorTitle: translateClientMessage(errorTitleKey), httpStatus };
};

const getErrorDescription = (httpStatus: number) => {
  switch (httpStatus) {
    case 429:
      return translateClientMessage("errors.rateLimit");
    case 524:
      return translateClientMessage("errors.requestTimeout");
    default:
      // Check if it's a 5xx server error
      if (httpStatus >= 500 && httpStatus < 600) {
        return translateClientMessage("errors.internalServerDescription");
      }
      return translateClientMessage("errors.internal");
  }
};

export const trpcErrorToast = (error: unknown) => {
  if (error instanceof TRPCClientError) {
    // Handle infrastructure-level errors that return non-JSON responses
    // (e.g., 431 with empty body, 502/503/504 with HTML error pages)
    if (isResponseParseError(error)) {
      showErrorToast(
        translateClientMessage("errors.unexpectedResponse"),
        translateClientMessage("errors.unexpectedResponseDescription"),
        "WARNING",
      );
      return;
    }

    const { errorTitle, httpStatus } = getErrorTitleAndHttpCode(error);

    const path = error.data?.path;
    const description = getErrorDescription(httpStatus);
    const userMessage =
      httpStatus >= 500 && httpStatus < 600
        ? description
        : (error.message ?? description);

    showErrorToast(
      errorTitle,
      userMessage,
      httpStatus >= 500 && httpStatus < 600 ? "ERROR" : "WARNING",
      path,
    );
  } else {
    showErrorToast(
      translateClientMessage("errors.unexpected"),
      translateClientMessage("errors.unexpectedDescription"),
      "ERROR",
    );
  }
};
