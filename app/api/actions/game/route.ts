import { NextRequest } from 'next/server';
import { ACTIONS_CORS_HEADERS, createPostResponse } from "@solana/actions";
import { 
  Transaction, 
  PublicKey, 
  ComputeBudgetProgram, 
  SystemProgram,
  LAMPORTS_PER_SOL
} from "@solana/web3.js";

// Configuration
const GAME_WALLET = new PublicKey("FLASHjY6iKN8iDBqxJQeVGPG3AJxqcKQkH7KGgWzbrf9"); // Replace with your wallet
const MIN_BET = 0.000001;
const MAX_BET = 100;

// Routes
export async function GET() {
  try {
    return Response.json({
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
    }, { 
      headers: ACTIONS_CORS_HEADERS 
    });
  } catch (error) {
    console.error('GET Error:', error);
    return Response.json({ error: 'Internal server error' }, { 
      status: 500, 
      headers: ACTIONS_CORS_HEADERS 
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get user's wallet and bid amount
    const { account } = await request.json();
    const userAccount = new PublicKey(account);
    const bidSOL = parseFloat(request.nextUrl.searchParams.get('bid') || '0');
    const bidLamports = Math.floor(bidSOL * LAMPORTS_PER_SOL);

    // Validate bid
    if (isNaN(bidLamports) || bidLamports <= 0 || bidSOL < MIN_BET || bidSOL > MAX_BET) {
      return Response.json({ 
        error: 'Invalid bid amount' 
      }, { 
        status: 400, 
        headers: ACTIONS_CORS_HEADERS 
      });
    }

    // Create transaction
    const transaction = new Transaction();

    // Set compute budget
    transaction.add(
      ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }),
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 300_000 })
    );

    // Add transfer instruction
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: userAccount,
        toPubkey: GAME_WALLET,
        lamports: bidLamports,
      })
    );

    // Return response
    const response = await createPostResponse({
      fields: {
        type: "transaction",
        transaction,
        message: `Starting FlashTap game with ${bidSOL} SOL bid. Good luck!`
      }
    });

    return Response.json(response, { headers: ACTIONS_CORS_HEADERS });

  } catch (error) {
    console.error('POST Error:', error);
    return Response.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { 
      status: 500, 
      headers: ACTIONS_CORS_HEADERS 
    });
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: ACTIONS_CORS_HEADERS
  });
}