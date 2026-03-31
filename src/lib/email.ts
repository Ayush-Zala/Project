import { Resend } from "resend";

const resend = new Resend(process.env["RESEND_API_KEY"]);

export const sendEmail = async ({
  to,
  subject,
  text,
  html,
}: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}) => {
  try {
    const { data, error } = await resend.emails.send({
      from: "Better Auth <onboarding@resend.dev>", // Replace with our verified domain in production
      to,
      subject,
      text,
      html: html || text,
    });

    if (error) {
      console.error("Error sending email:", error);
      return { error };
    }

    return { data };
  } catch (err) {
    console.error("Unexpected error sending email:", err);
    return { error: err };
  }
};
