import { Response } from "express";

interface StandardResponse {
  status: boolean;
  message: string;
}

// This creates a reusable type for your handlers
type TypedResponse = Response<StandardResponse>;
/**
 * A helper to send strictly typed responses
 */
export const sendJson = (
  res: Response,
  code: number,
  statusRes: boolean,
  message: string,
) => {
  return res.status(code).json({
    status: statusRes,
    message: message,
  } satisfies StandardResponse);
};
