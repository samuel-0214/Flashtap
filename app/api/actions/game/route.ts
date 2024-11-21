// app/api/actions/game/route.ts
import { NextRequest } from 'next/server';
import { ACTIONS_CORS_HEADERS, createPostResponse } from "@solana/actions";
import { Transaction, PublicKey, ComputeBudgetProgram, SystemProgram } from "@solana/web3.js";

export async function GET() {
  try {
    const payload = {
      type: "action" as const,
      icon: "https://flashtap.vercel.app/flash-tap-logo.png",
      title: "FlashTap 1v1",
      label: "Start Game",
      description: "FlashTap : A 1v1 game where you bet your SOL and compete head-on in a number guessing challenge!!",
      links: {
        actions: [
          { 
            label: "0.1 SOL",
            href: `${process.env.ACTION_URL}/actions/game?bid=0.1`,
            type: "post" as const
          },
          {
            label: "0.5 SOL",
            href: `${process.env.ACTION_URL}/actions/game?bid=0.5`,
            type: "post" as const
          },
          {
            label: "1 SOL",
            href: `${process.env.ACTION_URL}/actions/game?bid=1.0`,
            type: "post" as const
          },
          {
            label: "Custom Bid",
            href: `${process.env.ACTION_URL}/actions/game?bid={amount}`,
            type: "post" as const,
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const account = new PublicKey(body.account);
    const bidAmount = parseFloat(body.selectedButton || body.bidAmount) * 1e9;

    if (isNaN(bidAmount) || bidAmount <= 0) {
      return new Response('Invalid bid amount', { status: 400 });
    }

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

    const response = await createPostResponse({
      fields: {
        type: "transaction",
        transaction,
        message: `Creating 1v1 game with ${bidAmount/1e9} SOL bid`
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