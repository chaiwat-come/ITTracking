import crypto from 'crypto';

// Outgoing webhooks are opt-in: nothing is sent unless both WEBHOOK_URL and WEBHOOK_SECRET are set
const getWebhookUrl = () => process.env.WEBHOOK_URL || '';
const getWebhookSecret = () => process.env.WEBHOOK_SECRET || '';

export interface WebhookPayload {
  event: string;
  issue_id: number;
  new_status: string;
  updated_by: string;
}

export function generateHMACSignature(payload: string, timestamp: number): string {
  const data = `${timestamp}.${payload}`;
  const signature = crypto.createHmac('sha256', getWebhookSecret()).update(data).digest('hex');
  return `t=${timestamp},hmac=${signature}`;
}

export async function sendWebhook(payload: WebhookPayload): Promise<void> {
  const webhookUrl = getWebhookUrl();
  if (!webhookUrl) {
    // webhook disabled
    return;
  }
  if (!getWebhookSecret()) {
    console.warn('WEBHOOK_URL is set but WEBHOOK_SECRET is missing - skipping unsigned webhook');
    return;
  }

  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const payloadString = JSON.stringify(payload);
    const signature = generateHMACSignature(payloadString, timestamp);

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Signature': signature,
      },
      body: payloadString,
    });

    if (!response.ok) {
      console.warn(`Webhook responded with HTTP ${response.status}`);
    }
  } catch (error) {
    console.error('Webhook error:', error);
    // Don't throw error to prevent breaking the main flow
  }
}

export function verifyWebhookSignature(payload: string, signature: string): boolean {
  if (!getWebhookSecret()) return false;

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
