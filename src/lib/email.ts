import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

interface SendInvitationEmailParams {
  to: string
  organizationName: string
  inviterName: string
  inviteLink: string
}

export async function sendInvitationEmail({
  to,
  organizationName,
  inviterName,
  inviteLink
}: SendInvitationEmailParams) {
  try {
    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'Zyync <onboarding@resend.dev>',
      to: [to],
      subject: `You've been invited to join ${organizationName} on Zyync`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 28px;">Zyync</h1>
            </div>
            
            <div style="background: #ffffff; padding: 40px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
              <h2 style="color: #1f2937; margin-top: 0;">You've been invited!</h2>
              
              <p style="color: #4b5563; font-size: 16px;">
                <strong>${inviterName}</strong> has invited you to join <strong>${organizationName}</strong> on Zyync.
              </p>
              
              <p style="color: #4b5563; font-size: 16px;">
                Zyync is a modern project management tool that helps teams collaborate and get work done efficiently.
              </p>
              
              <div style="margin: 30px 0; text-align: center;">
                <a href="${inviteLink}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                  Accept Invitation
                </a>
              </div>
              
              <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                Or copy and paste this link into your browser:
              </p>
              <p style="color: #6366f1; font-size: 14px; word-break: break-all;">
                ${inviteLink}
              </p>
              
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
              
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                This invitation was sent to ${to}. If you didn't expect this invitation, you can safely ignore this email.
              </p>
            </div>
          </body>
        </html>
      `
    })

    if (error) {
      console.error('Error sending invitation email:', error)
      return { success: false, error }
    }

    console.log('Invitation email sent successfully:', data)
    return { success: true, data }
  } catch (error) {
    console.error('Failed to send invitation email:', error)
    return { success: false, error }
  }
}

interface SendMentionEmailParams {
  to: string
  toName: string
  mentionedBy: string
  taskTitle: string
  taskLink: string
  commentBody: string
}

export async function sendMentionEmail({
  to,
  toName,
  mentionedBy,
  taskTitle,
  taskLink,
  commentBody
}: SendMentionEmailParams) {
  try {
    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'Zyync <onboarding@resend.dev>',
      to: [to],
      subject: `${mentionedBy} mentioned you in "${taskTitle}"`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 28px;">Zyync</h1>
            </div>
            
            <div style="background: #ffffff; padding: 40px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
              <h2 style="color: #1f2937; margin-top: 0;">👋 You were mentioned!</h2>
              
              <p style="color: #4b5563; font-size: 16px;">
                Hi ${toName},
              </p>
              
              <p style="color: #4b5563; font-size: 16px;">
                <strong>${mentionedBy}</strong> mentioned you in a comment on <strong>"${taskTitle}"</strong>:
              </p>
              
              <div style="background: #f9fafb; border-left: 4px solid #6366f1; padding: 16px; margin: 20px 0; border-radius: 4px;">
                <p style="color: #374151; margin: 0; font-size: 15px; font-style: italic;">
                  ${commentBody}
                </p>
              </div>
              
              <div style="margin: 30px 0; text-align: center;">
                <a href="${taskLink}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                  View Task
                </a>
              </div>
              
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
              
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                This notification was sent to ${to}. You can manage your notification preferences in your Zyync settings.
              </p>
            </div>
          </body>
        </html>
      `
    })

    if (error) {
      console.error('Error sending mention email:', error)
      return { success: false, error }
    }

    console.log('Mention email sent successfully:', data)
    return { success: true, data }
  } catch (error) {
    console.error('Failed to send mention email:', error)
    return { success: false, error }
  }
}
