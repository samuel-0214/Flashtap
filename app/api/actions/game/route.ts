import { NextRequest } from 'next/server';
import { ACTIONS_CORS_HEADERS, createPostResponse } from "@solana/actions";
import { 
  Transaction, 
  PublicKey, 
  ComputeBudgetProgram, 
  SystemProgram,
  LAMPORTS_PER_SOL
} from "@solana/web3.js";

// Game configuration
// Replace this with your actual wallet address that will receive the bets
const GAME_WALLET = new PublicKey("4kdivf9rx7EzhiKjjvZAYMpKTXj4bSYmnNdeaN9V66un"); 

const MIN_BET = 0.000001;
const MAX_BET = 100;
const COMPUTE_UNIT_LIMIT = 400_000;
const COMPUTE_UNIT_PRICE = 300_000;

// Error messages
const ERRORS = {
  INVALID_BID: 'Invalid bid amount',
  INTERNAL_ERROR: 'Internal server error',
  BID_TOO_LOW: `Minimum bet is ${MIN_BET} SOL`,
  BID_TOO_HIGH: `Maximum bet is ${MAX_BET} SOL`,
};

// Validate bid amount
function validateBid(amount: number): { valid: boolean; error?: string } {
  if (isNaN(amount) || amount <= 0) {
    return { valid: false, error: ERRORS.INVALID_BID };
  }
  if (amount < MIN_BET) {
    return { valid: false, error: ERRORS.BID_TOO_LOW };
  }
  if (amount > MAX_BET) {
    return { valid: false, error: ERRORS.BID_TOO_HIGH };
  }
  return { valid: true };
}

export async function GET() {
  try {
    const payload = {
      type: "action" as const,
      icon: "https://flashtap.xyz/flash-tap logo.jpg",
      title: "FlashTap 1v1",
      label: "Start Game",
      description: "FlashTap: A 1v1 game where you bet your SOL and compete head-on in a number guessing challenge!",
      links: {
        actions: [
          { 
            label: "0.1 SOL",
            href: "/api/actions/game?bid=0.1",
            type: "post" as const
          },
          {
            label: "0.5 SOL",
            href: "/api/actions/game?bid=0.5",
            type: "post" as const
          },
          {
            label: "1 SOL",
            href: "/api/actions/game?bid=1.0",
            type: "post" as const
          },
          {
            label: "Custom Bid",
            href: "/api/actions/game?bid={amount}",
            type: "post" as const,
            parameters: [{
              name: "amount",
              label: "Enter SOL amount",
              type: "number",
              min: MIN_BET,
              max: MAX_BET,
              required: true,
              pattern: "^[0-9]*(\\.[0-9]+)?$",
              patternDescription: "Enter a valid SOL amount (e.g. 0.5)"
            }]
          }
        ]
      }
    };

    return Response.json(payload, { headers: ACTIONS_CORS_HEADERS });
  } catch (error) {
    console.error('GET Error:', error);
    return new Response(
      JSON.stringify({ error: ERRORS.INTERNAL_ERROR }), 
      { status: 500, headers: ACTIONS_CORS_HEADERS }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Parse request body for user account
    const body = await request.json();
    const userAccount = new PublicKey(body.account);
    
    // Get and validate bid amount
    const bidSOL = parseFloat(request.nextUrl.searchParams.get('bid') || '0');
    const validation = validateBid(bidSOL);
    
    if (!validation.valid) {
      return new Response(
        JSON.stringify({ error: validation.error }), 
        { status: 400, headers: ACTIONS_CORS_HEADERS }
      );
    }

    // Convert SOL to lamports
    const bidLamports = Math.floor(bidSOL * LAMPORTS_PER_SOL);

    // Create transaction
    const transaction = new Transaction();

    // Add compute budget instructions
    transaction.add(
      ComputeBudgetProgram.setComputeUnitLimit({ 
        units: COMPUTE_UNIT_LIMIT 
      }),
      ComputeBudgetProgram.setComputeUnitPrice({ 
        microLamports: COMPUTE_UNIT_PRICE 
      })
    );

    // Add transfer instruction
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: userAccount,
        toPubkey: GAME_WALLET,
        lamports: bidLamports,
      })
    );

    // Create and return response
    const response = await createPostResponse({
      fields: {
        type: "transaction",
        transaction,
        message: `Starting FlashTap game with ${bidSOL} SOL bid. Good luck!`,
      }
    });

    return Response.json(response, { headers: ACTIONS_CORS_HEADERS });

  } catch (error) {
    console.error('POST Error:', error);
    return new Response(
      JSON.stringify({ error: ERRORS.INTERNAL_ERROR }), 
      { status: 500, headers: ACTIONS_CORS_HEADERS }
    );
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: ACTIONS_CORS_HEADERS
  });
}