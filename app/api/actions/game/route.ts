// app/api/game/route.ts
import { NextRequest } from 'next/server';
import { 
  Transaction,
  PublicKey,
  ComputeBudgetProgram,
  SystemProgram
} from "@solana/web3.js";

// Constants
const ACTIONS_CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const PRESET_BIDS = {
  LOW: 0.1,
  MEDIUM: 0.5,
  HIGH: 1.0
};

// Types
interface Game {
  id: string;
  bidAmount: number;
  creator: string;
  opponent?: string;
  status: 'waiting' | 'active' | 'completed';
}

interface ActionGetResponse {
  type: "action";
  icon: string;
  title: string;
  label: string;
  description: string;
  buttons?: Array<{
    label: string;
    value: string;
  }>;
  bidInput?: {
    type: "number";
    placeholder: string;
    min: number;
    max: number;
    step: number;
  };
}

interface ActionResponse {
  type: "transaction";
  transaction: string;
  message?: string;
  links?: {
    next?: {
      type: "post";
      href: string;
    };
  };
}

const games = new Map<string, Game>();

export async function GET(req: NextRequest) {
  try {
    const selectedBid = req.nextUrl.searchParams.get('bid');

    const payload: ActionGetResponse = {
      type: "action",
      icon: new URL("/flash-tap logo.jpg", new URL(req.url).origin).toString(),
      title: "FlashTap 1v1",
      label: "Start Game",
      description: "FlashTap : A 1v1 game where you bet your SOL and compete head-on in a number guessing challenge!!",
      buttons: [
        { label: "0.1 SOL", value: "0.1" },
        { label: "0.5 SOL", value: "0.5" },
        { label: "1 SOL", value: "1.0" }
      ]
    };

    // Add custom bid input if a preset was selected
    if (selectedBid && Object.values(PRESET_BIDS).includes(parseFloat(selectedBid))) {
      payload.bidInput = {
        type: "number",
        placeholder: "Enter custom bid amount in SOL",
        min: 0.000001, // Minimum SOL amount
        max: 100,      // Maximum SOL amount
        step: 0.1      // Step size
      };
    }

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
    
    // Handle both preset and custom bid amounts
    let bidAmount: number;
    if (body.selectedButton) {
      // Preset amount selected
      bidAmount = parseFloat(body.selectedButton) * 1e9;
    } else if (body.bidAmount) {
      // Custom amount entered
      bidAmount = parseFloat(body.bidAmount) * 1e9;
    } else {
      return new Response('No bid amount specified', { status: 400 });
    }

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
        toPubkey: account,
        lamports: bidAmount,
      })
    );

    const serializedTransaction = Buffer.from(
      transaction.serialize({
        verifySignatures: false,
        requireAllSignatures: false,
      })
    ).toString('base64');

    const response: ActionResponse = {
      type: "transaction",
      transaction: serializedTransaction,
      message: `Creating 1v1 game with ${bidAmount/1e9} SOL bid`,
      links: {
        next: {
          type: "post",
          href: `${process.env.ACTION_URL}/game?gameId=${gameId}`,
        }
      }
    };

    return Response.json(response, { headers: ACTIONS_CORS_HEADERS });
  } catch (error) {
    console.error('Error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: ACTIONS_CORS_HEADERS
  });
}