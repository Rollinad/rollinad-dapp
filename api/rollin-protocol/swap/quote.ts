import type { NextApiRequest, NextApiResponse } from "next";
import {
  SwapRequestBody,
  setCorsHeaders,
  handleOptionsRequest,
  zeroXHeaders,
} from "../../../src/utils/api";
import { ErrorMessage } from "../../../src/types/staking";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return handleOptionsRequest(res);
  }

  // Set CORS headers for all responses
  setCorsHeaders(res);

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const data = req.body as SwapRequestBody;

    const params = new URLSearchParams({
      sellToken: data.sellToken,
      buyToken: data.buyToken,
      sellAmount: data.sellAmount,
      taker: data.takerAddress,
      chainId: data.chainId
    });

    const response = await fetch(
      `https://api.0x.org/swap/permit2/quote?${params}`,
      { headers: zeroXHeaders }
    );

    const quote = await response.json();

    if (!response.ok) {
      throw new Error(`response ${JSON.stringify(response)}, ${response.status}`);
    }

    return res.status(200).json(quote);
  } catch (err) {
    const error = err as ErrorMessage;
    return res.status(400).json({ error: error.message });
  }
}

export const config = {
  api: {
    bodyParser: true,
  },
};