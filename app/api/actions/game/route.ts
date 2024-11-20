// app/api/game/route.ts
import { NextRequest } from 'next/server';
import { 
  ActionGetResponse, 
  ACTIONS_CORS_HEADERS, 
  createPostResponse 
} from "@solana/actions";
import { 
  Transaction,
  PublicKey,
  ComputeBudgetProgram,
  SystemProgram
} from "@solana/web3.js";

// Simple in-memory game storage
interface Game {
  id: string;
  bidAmount: number;
  creator: string;
  opponent?: string;
  status: 'waiting' | 'active' | 'completed';
}

const games = new Map<string, Game>();

export async function GET(req: NextRequest) {
  try {
    const payload: ActionGetResponse = {
      type: "action",
      icon: new URL("/flash-tap logo.jpg",new URL(req.url).origin).toString(),
      title: "FlashTap 1v1",
      label: "Start Game",
      description: "Create a new 1v1 game\nEnter bid amount to start"
    };

    return Response.json(payload, {
      headers: ACTIONS_CORS_HEADERS
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const account = new PublicKey(body.account);
    const bidAmount = parseFloat(body.bidAmount) * 1e9; // Convert SOL to lamports

    // Validate bid amount
    if (isNaN(bidAmount) || bidAmount <= 0) {
      return new Response('Invalid bid amount', { status: 400 });
    }

    // Create new game
    const gameId = Math.random().toString(36).substring(2, 12);
    const game: Game = {
      id: gameId,
      bidAmount,
      creator: account.toString(),
      status: 'waiting'
    };

    games.set(gameId, game);

    // Create transaction
    const transaction = new Transaction();

    transaction.add(
      ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }),
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 300_000 }),
      SystemProgram.transfer({
        fromPubkey: account,
        toPubkey: account, // For now sending to self, implement escrow later
        lamports: bidAmount,
      })
    );

    const response = await createPostResponse({
      fields: {
        type: "transaction",
        transaction,
        message: `Creating 1v1 game with ${bidAmount/1e9} SOL bid`,
        links: {
          next: {
            type: "post",
            href: `${process.env.ACTION_URL}/game?gameId=${gameId}`,
          }
        }
      }
    });

    return Response.json(response, { headers: ACTIONS_CORS_HEADERS });
  } catch (error) {
    console.error('Error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}

// Optional: Handle OPTIONS request for CORS
export async function OPTIONS(req: NextRequest) {
  return new Response(null, {
    status: 204,
    headers: ACTIONS_CORS_HEADERS
  });
}