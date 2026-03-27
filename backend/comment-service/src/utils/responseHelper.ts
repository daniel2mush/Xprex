import { Response } from "express";

// ==================== HELPER: STANDARD RESPONSE ====================
interface StandardResponse {
  success: boolean;
  message?: string;
  data?: unknown;
}

/**
 * Industry-standard response helper
 * - Always returns consistent envelope
 * - Supports success + data or error
 */

export const sendJson = (
  res: Response,
  code: number,
  success: boolean,
  message?: string,
  data?: unknown,
) => {
  const payload: StandardResponse = { success };

  if (message) payload.message = message;
  if (data !== undefined) payload.data = data;

  return res.status(code).json(payload);
};
