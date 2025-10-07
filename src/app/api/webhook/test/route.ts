import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/webhook";

// Test webhook endpoint to verify HMAC signatures
export async function POST(req: NextRequest) {
  try {
    const signature = req.headers.get('X-Signature');
    if (!signature) {
      return NextResponse.json({ error: "Missing X-Signature header" }, { status: 400 });
    }

    const body = await req.text();
    
    // Verify the webhook signature
    const isValid = verifyWebhookSignature(body, signature);
    
    if (!isValid) {
      return NextResponse.json({ error: "Invalid signature or expired timestamp" }, { status: 401 });
    }

    // Parse the payload
    let payload;
    try {
      payload = JSON.parse(body);
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    console.log('Valid webhook received:', payload);

    // Log the webhook for testing purposes
    const logEntry = {
      timestamp: new Date().toISOString(),
      signature,
      payload,
      verified: true
    };

    console.log('Webhook Log:', JSON.stringify(logEntry, null, 2));

    return NextResponse.json({
      message: "Webhook received and verified successfully",
      event: payload.event,
      issue_id: payload.issue_id,
      new_status: payload.new_status,
      updated_by: payload.updated_by,
      received_at: new Date().toISOString()
    });

  } catch (error) {
    console.error("Webhook test error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
