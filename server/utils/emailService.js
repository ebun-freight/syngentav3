const nodemailer = require('nodemailer')
const createError = require('http-errors')

const sendStatusEmail = async ({ user, status }) => {
  const { firstname, email } = user

  /* ── Constants & Links ──────────────────────────────────────────── */
  const LOGO_ICON =
    'https://res.cloudinary.com/dtkc90aw8/image/upload/v1772844481/ebun_logo_light_pxzxt3.png'

  const supportEmail = 'alacambradev@gmail.com'
  const appUrl = 'https://ebun-monitoring.vercel.app'
  const websiteUrl = 'https://www.yzaagri.tech/'
  const facebookUrl = 'https://www.facebook.com/profile.php?id=61581659459017'
  const supportMailto = `mailto:${supportEmail}`

  /* ── Status-specific config ─────────────────────────────────────── */
  const statusConfig = {
    active: {
      subject: 'Account Approved — Ebun Freight OPC',
      title: 'Welcome Aboard!',
      subtitle: 'Your account is ready to go.',
      greeting: `Congratulations, ${firstname}!`,
      body: "You're now part of the Ebun Freight OPC platform. Track deployments, monitor trucks, and stay connected with your team — all in one place.",
      actionMessage: 'Use your registered email and password to sign in.',
      buttonText: 'Sign In to Your Account',
      buttonLink: appUrl,
      badgeBg: '#ecfdf5',
      badgeColor: '#059669',
      badgeBorder: '#6ee7b7',
      badgeLabel: 'APPROVED',
      accentColor: '#059669',
      iconEmoji: '✓'
    },
    rejected: {
      subject: 'Account Registration Update — Ebun Freight OPC',
      title: 'Registration Not Approved',
      subtitle: 'Account status update',
      greeting: `Dear ${firstname},`,
      body: "Thank you for your interest in Ebun Freight OPC. After reviewing your registration, we're unable to approve your account at this time.",
      actionMessage: "Think there's been a mistake? Our team is happy to help.",
      buttonText: 'Contact Support',
      buttonLink: supportMailto,
      badgeBg: '#fef2f2',
      badgeColor: '#dc2626',
      badgeBorder: '#fca5a5',
      badgeLabel: 'NOT APPROVED',
      accentColor: '#dc2626',
      iconEmoji: '✕'
    },
    inactive: {
      subject: 'Account Deactivated — Ebun Freight OPC',
      title: 'Account Deactivated',
      subtitle: 'Your account has been temporarily deactivated.',
      greeting: `Dear ${firstname},`,
      body: 'Your account has been temporarily deactivated. This may be due to inactivity or a routine administrative update on your profile.',
      actionMessage:
        "Want to restore access? Reach out and we'll get you sorted.",
      buttonText: 'Contact Support',
      buttonLink: supportMailto,
      badgeBg: '#fff7ed',
      badgeColor: '#ea580c',
      badgeBorder: '#fdba74',
      badgeLabel: 'INACTIVE',
      accentColor: '#ea580c',
      iconEmoji: '⏸'
    },
    revoked: {
      subject: 'Account Access Revoked — Ebun Freight OPC',
      title: 'Access Revoked',
      subtitle: 'Your platform access has been removed.',
      greeting: `Dear ${firstname},`,
      body: 'Your access to the Ebun Freight OPC platform has been removed by an administrator. Your data remains secure.',
      actionMessage:
        "Questions or think this was an error? We're here to help.",
      buttonText: 'Contact Support',
      buttonLink: supportMailto,
      badgeBg: '#fef2f2',
      badgeColor: '#dc2626',
      badgeBorder: '#fca5a5',
      badgeLabel: 'REVOKED',
      accentColor: '#dc2626',
      iconEmoji: '⊘'
    }
  }

  const c = statusConfig[status]
  if (!c) return // status has no email template, skip silently

  const year = new Date().getFullYear()

  /* ── Email HTML ─────────────────────────────────────────────────── */
  const htmlTemplate = `
<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>${c.title}</title>
  <!--[if mso]>
  <noscript>
    <xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml>
  </noscript>
  <![endif]-->
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { margin: 0 !important; padding: 0 !important; background-color: #f1f5f9; }
    a { color: inherit; }

    @media only screen and (max-width: 620px) {
      .email-wrapper { padding: 0 !important; }
      .card         { border-radius: 0 !important; }
      .header-inner { padding: 28px 20px 24px !important; }
      .body-inner   { padding: 28px 20px !important; }
      .footer-inner { padding: 20px !important; }
      .stat-row     { gap: 12px !important; }
      .stat-block   { padding: 10px 14px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:'Poppins',Georgia,sans-serif;">

  <!-- Outer wrapper -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
         style="background-color:#f1f5f9;min-height:100vh;">
    <tr>
      <td class="email-wrapper" align="center" style="padding:32px 16px;">

        <!-- Card -->
        <table role="presentation" class="card" width="100%" cellpadding="0" cellspacing="0" border="0"
               style="max-width:580px;border-radius:20px;overflow:hidden;
                      box-shadow:0 20px 60px rgba(2,6,23,0.18),0 4px 16px rgba(0,0,0,0.08);">

          <!-- ═══ HEADER — dark navy gradient ════════════════════════ -->
          <tr>
            <td style="background:linear-gradient(155deg,#020617 0%,#001e36 55%,#0f172a 100%);
                       position:relative;overflow:hidden;">

              <div class="header-inner"
                   style="position:relative;z-index:1;padding:24px 36px 28px;text-align:center;">

                <!-- Logo block -->
                <table role="presentation" cellpadding="0" cellspacing="0" border="0"
                       align="center" style="margin:0 auto 20px;width:100%;">
                  <tr>
                    <td align="center"
                        style="padding:16px;border-bottom:1px solid rgba(255,255,255,0.1);">
                      <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center">
                        <tr>
                          <td style="vertical-align:middle;padding-right:12px;">
                            <img src="${LOGO_ICON}"
                                 alt=""
                                 width="40"
                                 style="display:block;width:40px;height:auto;" />
                          </td>
                          <td style="vertical-align:middle;">
                            <h1 style="font-family:'Poppins',sans-serif;font-size:30px;font-weight:600;
                                       letter-spacing:0.1em;color:#ffffff;text-transform:uppercase;
                                       margin:0;line-height:1.2;">
                              EBUN
                            </h1>
                            <p style="font-family:'Poppins',sans-serif;font-size:12px;font-weight:400;
                                      letter-spacing:0.1em;color:#ffffff;text-transform:uppercase;
                                      margin:-6px 0 0 2px;line-height:1;">
                              Freight OPC
                            </p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>

                <!-- Status badge -->
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center"
                       style="margin:0 auto 16px;">
                  <tr>
                    <td style="background:${c.badgeBg};
                               border:1px solid ${c.badgeBorder};
                               border-radius:999px;
                               padding:6px 18px;">
                      <span style="font-family:'Poppins',sans-serif;
                                   font-size:11px;font-weight:700;
                                   letter-spacing:0.12em;color:${c.badgeColor};
                                   text-transform:uppercase;white-space:nowrap;">
                        ${c.iconEmoji}&nbsp;&nbsp;${c.badgeLabel}
                      </span>
                    </td>
                  </tr>
                </table>

                <!-- Title -->
                <h1 style="font-family:'Poppins',sans-serif;font-size:26px;font-weight:700;
                           color:#ffffff;letter-spacing:-0.3px;margin:0 0 6px;line-height:1.2;">
                  ${c.title}
                </h1>
                <p style="font-family:'Poppins',sans-serif;font-size:13px;font-weight:400;
                          color:rgba(255,255,255,0.5);margin:0;letter-spacing:0.02em;">
                  ${c.subtitle}
                </p>

              </div>
            </td>
          </tr>

          <!-- ═══ BODY — white panel ═══════════════════════════════════ -->
          <tr>
            <td style="background:#ffffff;">
              <div class="body-inner" style="padding:36px 36px 32px;">

                <!-- Greeting -->
                <p style="font-family:'Poppins',sans-serif;font-size:15px;font-weight:600;
                          color:#111827;margin:0 0 12px;">
                  ${c.greeting}
                </p>

                <!-- Message card -->
                <div style="background:#f8fafc;border-left:3px solid ${c.accentColor};
                            border-radius:0 12px 12px 0;padding:18px 20px;margin-bottom:24px;">
                  <p style="font-family:'Poppins',sans-serif;font-size:14px;line-height:1.7;
                            color:#374151;margin:0;">
                    ${c.body}
                  </p>
                </div>

                <!-- Action note -->
                <p style="font-family:'Poppins',sans-serif;font-size:13px;line-height:1.65;
                          color:#6b7280;margin:0 0 28px;text-align:center;">
                  ${c.actionMessage}
                </p>

                <!-- CTA Button -->
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center"
                       style="margin:0 auto 32px;">
                  <tr>
                    <td style="border-radius:12px;overflow:hidden;
                               box-shadow:0 4px 14px rgba(1,30,54,0.35);">
                      <a href="${c.buttonLink}"
                         style="display:inline-block;
                                background:linear-gradient(135deg,#020617 0%,#001e36 60%,#0f172a 100%);
                                color:#ffffff;
                                font-family:'Poppins',sans-serif;
                                font-size:14px;font-weight:600;
                                letter-spacing:0.04em;
                                text-decoration:none;
                                padding:14px 36px;
                                border-radius:12px;
                                white-space:nowrap;">
                        ${c.buttonText} &nbsp;→
                      </a>
                    </td>
                  </tr>
                </table>

                <!-- Stat row -->
                <table role="presentation" class="stat-row" cellpadding="0" cellspacing="0" border="0"
                       width="100%" style="border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;
                                           margin-bottom:0;">
                  <tr>
                    <td class="stat-block" align="center"
                        style="padding:14px 18px;border-right:1px solid #e5e7eb;width:33.33%;">
                      <p style="font-family:'Poppins',sans-serif;font-size:13px;font-weight:700;
                                color:#111827;margin:0 0 2px;">Tech</p>
                      <p style="font-family:'Poppins',sans-serif;font-size:11px;color:#9ca3af;
                                margin:0;letter-spacing:0.04em;text-transform:uppercase;">
                        Driven Ops
                      </p>
                    </td>
                    <td class="stat-block" align="center"
                        style="padding:14px 18px;border-right:1px solid #e5e7eb;width:33.33%;">
                      <p style="font-family:'Poppins',sans-serif;font-size:13px;font-weight:700;
                                color:#111827;margin:0 0 2px;">24 / 7</p>
                      <p style="font-family:'Poppins',sans-serif;font-size:11px;color:#9ca3af;
                                margin:0;letter-spacing:0.04em;text-transform:uppercase;">
                        Operations
                      </p>
                    </td>
                    <td class="stat-block" align="center"
                        style="padding:14px 18px;width:33.33%;">
                      <p style="font-family:'Poppins',sans-serif;font-size:13px;font-weight:700;
                                color:#111827;margin:0 0 2px;">Est. 2026</p>
                      <p style="font-family:'Poppins',sans-serif;font-size:11px;color:#9ca3af;
                                margin:0;letter-spacing:0.04em;text-transform:uppercase;">
                        Founded
                      </p>
                    </td>
                  </tr>
                </table>

              </div>
            </td>
          </tr>

          <!-- ═══ FOOTER — dark gradient ═══════════════════════════════ -->
          <tr>
            <td style="background:linear-gradient(180deg,#0f172a 0%,#020617 100%);">
              <div class="footer-inner" style="padding:28px 36px;text-align:center;">

                <!-- Brand name -->
                <p style="font-family:'Poppins',sans-serif;font-size:13px;font-weight:700;
                          color:rgba(255,255,255,0.85);letter-spacing:0.14em;
                          text-transform:uppercase;margin:0 0 4px;">
                  EBUN
                </p>
                <p style="font-family:'Poppins',sans-serif;font-size:10px;font-weight:400;
                          color:rgba(255,255,255,0.4);letter-spacing:0.18em;
                          text-transform:uppercase;margin:0 0 20px;">
                  Freight OPC
                </p>

                <!-- Divider -->
                <div style="height:1px;background:rgba(255,255,255,0.08);margin:0 0 20px;"></div>

                <!-- Links -->
                <p style="font-family:'Poppins',sans-serif;font-size:12px;
                          color:rgba(255,255,255,0.4);margin:0 0 16px;">
                  <a href="${websiteUrl}"
                     style="color:rgba(255,255,255,0.6);text-decoration:none;
                            font-weight:500;margin:0 10px;">
                    Website
                  </a>
                  <span style="color:rgba(255,255,255,0.2);">•</span>
                  <a href="${facebookUrl}"
                     style="color:rgba(255,255,255,0.6);text-decoration:none;
                            font-weight:500;margin:0 10px;">
                    Facebook
                  </a>
                  <span style="color:rgba(255,255,255,0.2);">•</span>
                  <a href="${supportMailto}"
                     style="color:rgba(255,255,255,0.6);text-decoration:none;
                            font-weight:500;margin:0 10px;">
                    Support
                  </a>
                </p>

                <!-- Copyright -->
                <p style="font-family:'Poppins',sans-serif;font-size:11px;
                          color:rgba(255,255,255,0.25);margin:0;line-height:1.6;">
                  © ${year} Ebun Freight OPC. All rights reserved.<br />
                  This is an automated message — please do not reply directly.
                </p>

              </div>
            </td>
          </tr>

        </table>
        <!-- /Card -->

        <!-- Below-card help note -->
        <p style="font-family:'Poppins',sans-serif;font-size:12px;color:#94a3b8;
                  text-align:center;margin-top:20px;">
          Need help?&nbsp;
          <a href="${supportMailto}"
             style="color:#475569;text-decoration:underline;font-weight:500;">
            ${supportEmail}
          </a>
        </p>

      </td>
    </tr>
  </table>
  <!-- /Outer wrapper -->

</body>
</html>
`

  /* ── Nodemailer transport ────────────────────────────────────────── */
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: 587,
      secure: false,
      requireTLS: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    })

    await transporter.sendMail({
      from: `"Ebun Freight OPC" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: c.subject,
      html: htmlTemplate
    })

    console.log(`Status email sent → ${email} [status: ${status}]`)
  } catch (error) {
    console.error('Email sending error:', error)
    throw createError(500, 'Failed to send status email')
  }
}

module.exports = sendStatusEmail
