// app/api/game/route.ts
import { NextRequest } from 'next/server';
import { 
  ActionGetResponse,
  ACTIONS_CORS_HEADERS, 
  createPostResponse,
  MEMO_PROGRAM_ID 
} from "@solana/actions";
import { 
  Transaction,
  PublicKey,
  ComputeBudgetProgram,
  SystemProgram,
  TransactionInstruction
} from "@solana/web3.js";

export async function GET(req: NextRequest) {
  try {
    const payload: ActionGetResponse = {
      type: "action",
      icon: "https://flashtap.vercel.app/flash-tap-logo.png",
      title: "FlashTap 1v1",
      label: "Start Game",
      description: "FlashTap : A 1v1 game where you bet your SOL and compete head-on in a number guessing challenge!!",
      links: {
        actions: [
          { 
            label: "0.1 SOL",
            href: `${process.env.ACTION_URL}/game?bid=0.1`,
            type: "post"
          },
          {
            label: "0.5 SOL",
            href: `${process.env.ACTION_URL}/game?bid=0.5`,
            type: "post"
          },
          {
            label: "1 SOL",
            href: `${process.env.ACTION_URL}/game?bid=1.0`,
            type: "post"
          },
          {
            label: "Custom Bid",
            href: `${process.env.ACTION_URL}/game?bid={amount}`,
            type: "post",
            parameters: [{
              name: "amount",
              label: "Enter SOL amount",
              type: "number",
              min: 0.000001,
              max: 100,
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
    console.error('Error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const account = new PublicKey(body.account);
    const bidAmount = parseFloat(body.selectedButton || body.bidAmount) * 1e9;

    if (isNaN(bidAmount) || bidAmount <= 0) {
      return new Response('Invalid bid amount', { status: 400 });
    }

    const transaction = new Transaction();

    transaction.add(
      ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }),
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 300_000 }),
      new TransactionInstruction({
        programId: new PublicKey(MEMO_PROGRAM_ID),
        data: Buffer.from(`flashtap_1v1_${Date.now()}`, "utf-8"),
        keys: []
      }),
      SystemProgram.transfer({
        fromPubkey: account,
        toPubkey: account,
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
            href: `${process.env.ACTION_URL}/game`
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

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: ACTIONS_CORS_HEADERS
  });
}