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
const GAME_WALLET = new PublicKey("4kdivf9rx7EzhiKjjvZAYMpKTXj4bSYmnNdeaN9V66un");
const MIN_BET = 0.000001;
const MAX_BET = 100;

// Enhanced CORS headers
const ENHANCED_HEADERS = {
  ...ACTIONS_CORS_HEADERS,
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Action-Version, X-Blockchain-Ids',
  'X-Action-Version': '1',
  'X-Blockchain-Ids': 'solana'
};

export async function GET() {
  try {
    return Response.json({
      type: "action",
      icon: "https://flashtap.xyz/flash-tap logo.jpg",
      title: "FlashTap 1v1",
      description: "FlashTap: A 1v1 game where you bet your SOL and compete head-on in a number guessing challenge!",
      label: "Place Bet", // This won't be shown since we have actions
      links: {
        actions: [
          { 
            label: "0.1 SOL",
            href: "/api/actions/game?bid=0.1",
            parameters: [] // Explicitly define empty parameters
          },
          {
            label: "0.5 SOL",
            href: "/api/actions/game?bid=0.5",
            parameters: []
          },
          {
            label: "1 SOL",
            href: "/api/actions/game?bid=1.0",
            parameters: []
          },
          {
            label: "Custom Bid",
            href: "/api/actions/game?bid={amount}",
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
      headers: ENHANCED_HEADERS
    });
  } catch (error) {
    console.error('GET Error:', error);
    return Response.json({ error: 'Internal server error' }, { 
      status: 500, 
      headers: ENHANCED_HEADERS
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Parse the request
    const body = await request.json();
    const userAccount = new PublicKey(body.account);
    
    // Get bid amount from URL params
    const bidParam = request.nextUrl.searchParams.get('bid');
    if (!bidParam) {
      throw new Error('Bid amount is required');
    }

    // Convert bid to lamports
    const bidSOL = parseFloat(bidParam);
    const bidLamports = Math.floor(bidSOL * LAMPORTS_PER_SOL);

    // Validate bid
    if (isNaN(bidLamports) || bidLamports <= 0) {
      return Response.json({ 
        error: 'Invalid bid amount' 
      }, { 
        status: 400, 
        headers: ENHANCED_HEADERS 
      });
    }

    console.log('Creating transaction:', {
      user: userAccount.toString(),
      bidSOL,
      bidLamports
    });

    // Create transaction
    const transaction = new Transaction();

    // Add compute budget instructions
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

    // Create response with the transaction
    const postResponse = await createPostResponse({
      fields: {
        type: "transaction",
        transaction,
        message: `Starting FlashTap game with ${bidSOL} SOL bid. Please approve the transaction.`
      }
    });

    return Response.json(postResponse, { 
      headers: ENHANCED_HEADERS 
    });

  } catch (error) {
    console.error('POST Error:', error);
    return Response.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { 
      status: 500, 
      headers: ENHANCED_HEADERS 
    });
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      ...ENHANCED_HEADERS,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Max-Age': '86400',
    }
  });
}