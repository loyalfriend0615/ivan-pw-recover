import { NextRequest, NextResponse } from "next/server";

const RECAPTCHA_SECRET = process.env.RECAPTCHA_SECRET_KEY!;
const KEAP_FORM_ACTION =
    "https://sy659.infusionsoft.com/app/form/process/da2a32de8fba8c9c5001de20b978d852";

const corsHeaders = {
    "Access-Control-Allow-Origin": "https://mikeweinberg.com",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
    return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { email, "g-recaptcha-response": token } = body as {
            email: string;
            "g-recaptcha-response": string;
        };

        if (!token) {
            return NextResponse.json(
                { success: false, error: "Missing captcha token" },
                { status: 400, headers: corsHeaders }
            );
        }

        // 🔐 Verify reCAPTCHA
        const verifyRes = await fetch(
            "https://www.google.com/recaptcha/api/siteverify",
            {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: `secret=${RECAPTCHA_SECRET}&response=${token}`,
            }
        );
        const verifyData = await verifyRes.json();

        if (!verifyData.success) {
            return NextResponse.json(
                { success: false, error: "Captcha validation failed", details: verifyData },
                { status: 400, headers: corsHeaders }
            );
        }

        // 🚀 Forward into Keap
        console.log("Submitting to Keap with body:", new URLSearchParams({
            inf_form_xid: "da2a32de8fba8c9c5001de20b978d852",
            inf_form_name: "Password Recovery 2025",
            infusionsoft_version: "1.70.0.849961",
            inf_field_Email: email,
            inf_custom_Honeypot: "null",
        }).toString());

        const keapRes = await fetch(
            "https://sy659.infusionsoft.com/app/form/process/da2a32de8fba8c9c5001de20b978d852",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                body: new URLSearchParams({
                    inf_form_xid: "da2a32de8fba8c9c5001de20b978d852",
                    inf_form_name: "Password Recovery 2025",
                    infusionsoft_version: "1.70.0.849961",
                    inf_field_Email: email,
                    inf_custom_Honeypot: "null",
                }).toString(),
                redirect: "follow",   // 👈 let fetch follow redirects
            }
        );


        console.log("Final Keap URL:", keapRes.url);
        console.log("Final status:", keapRes.status);
        const keapText = await keapRes.text();
        console.log("Keap final response snippet:", keapText.slice(0, 300));


        // If Keap redirects, consider it success (Keap usually redirects to thank-you page)
        if (keapRes.status === 302 || keapRes.status === 303) {
            return NextResponse.json(
                { success: true, message: "Keap accepted the submission", email },
                { headers: corsHeaders }
            );
        }

        // Otherwise check body
        return NextResponse.json(
            { success: true, message: "Keap responded", details: keapText.slice(0, 200) },
            { headers: corsHeaders }
        );
    } catch (err) {
        console.error("API error:", err);
        return NextResponse.json(
            { success: false, error: err instanceof Error ? err.message : "Unknown error" },
            { status: 500, headers: corsHeaders }
        );
    }
}
