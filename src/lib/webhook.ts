import crypto from 'crypto';

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'your_webhook_secret_here_change_in_production';
const WEBHOOK_URL = process.env.WEBHOOK_URL || 'https://webhook.site/a8ace9c6-6c4a-47b0-97dd-248cd27469f0';

export interface WebhookPayload {
  event: string;
  issue_id: number;
  new_status: string;
  updated_by: string;
}

export function generateHMACSignature(payload: string, timestamp: number): string {
  const data = `${timestamp}.${payload}`;
  const signature = crypto.createHmac('sha256', WEBHOOK_SECRET).update(data).digest('hex');
  return `t=${timestamp},hmac=${signature}`;
}

export async function sendWebhook(payload: WebhookPayload): Promise<void> {
  try {
    // Skip webhook if URL is not properly configured
    if (!WEBHOOK_URL) {
    // webhook disabled
      return;
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const payloadString = JSON.stringify(payload);
    const signature = generateHMACSignature(payloadString, timestamp);

    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Signature': signature,
      },
      body: payloadString,
    });

    if (!response.ok) {
    // webhook failed
    } else {
    // webhook sent successfully
    }
  } catch (error) {
    console.error('Webhook error:', error);
    // Don't throw error to prevent breaking the main flow
  }
}

export function verifyWebhookSignature(payload: string, signature: string): boolean {
  try {
    const parts = signature.split(',');
    const timestampPart = parts.find(part => part.startsWith('t='));
    const hmacPart = parts.find(part => part.startsWith('hmac='));

    if (!timestampPart || !hmacPart) return false;

    const timestamp = parseInt(timestampPart.split('=')[1]);
    const receivedHmac = hmacPart.split('=')[1];

    // Check timestamp (max 5 minutes old)
    const currentTime = Math.floor(Date.now() / 1000);
    if (currentTime - timestamp > 300) return false;

    const expectedSignature = generateHMACSignature(payload, timestamp);
    const expectedHmac = expectedSignature.split('hmac=')[1];

    return crypto.timingSafeEqual(
      Buffer.from(receivedHmac, 'hex'),
      Buffer.from(expectedHmac, 'hex')
    );
  } catch {
    return false;
  }
}
