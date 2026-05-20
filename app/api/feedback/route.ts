import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { Resend } from 'resend';

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  const body = await req.json();
  const { rating, message, page } = body as {
    rating: number | null;
    message: string;
    page: string;
  };

  if (!message?.trim()) {
    return NextResponse.json({ error: 'Message is required.' }, { status: 400 });
  }

  // Save to Supabase
  const { error: dbErr } = await supabase.from('feedback').insert({
    user_id: user.id,
    rating: rating || null,
    message: message.trim(),
    page,
  });

  if (dbErr) {
    return NextResponse.json({ error: 'Failed to save feedback.' }, { status: 500 });
  }

  // Send email if Resend is configured
  const resendKey = process.env.RESEND_API_KEY;
  const toEmail = process.env.FEEDBACK_EMAIL;

  if (resendKey && toEmail) {
    try {
      const resend = new Resend(resendKey);
      const stars = rating ? '★'.repeat(rating) + '☆'.repeat(5 - rating) : 'No rating';

      await resend.emails.send({
        from: 'FitTrack Feedback <feedback@fittrack.app>',
        to: toEmail,
        subject: `New feedback${rating ? ` (${rating}/5)` : ''} from FitTrack`,
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
            <h2 style="margin:0 0 16px;color:#1e293b;">New Feedback</h2>
            <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
              <tr><td style="padding:6px 0;color:#64748b;width:80px;">Rating</td><td style="color:#f59e0b;font-size:18px;">${stars}</td></tr>
              <tr><td style="padding:6px 0;color:#64748b;">Page</td><td style="color:#1e293b;">${page}</td></tr>
              <tr><td style="padding:6px 0;color:#64748b;">User</td><td style="color:#1e293b;">${user.email}</td></tr>
            </table>
            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;">
              <p style="margin:0;color:#1e293b;white-space:pre-wrap;">${message.trim()}</p>
            </div>
          </div>
        `,
      });
    } catch {
      // Email failure is non-critical — feedback is already saved to DB
    }
  }

  return NextResponse.json({ ok: true });
}
