import { NextRequest, NextResponse } from "next/server";

const RECAPTCHA_SECRET = process.env.RECAPTCHA_SECRET_KEY!;

// Allow CORS for your site
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

        // 🔹 Verify reCAPTCHA
        const verifyRes = await fetch("https://www.google.com/recaptcha/api/siteverify", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: `secret=${RECAPTCHA_SECRET}&response=${token}`,
        });
        const verifyData = await verifyRes.json();

        if (!verifyData.success) {
            return NextResponse.json(
                { success: false, error: "Captcha validation failed", details: verifyData },
                { status: 400, headers: corsHeaders }
            );
        }

        // 🔹 Keap endpoint
        const keapUrl =
            "https://sy659.infusionsoft.com/app/form/process/da2a32de8fba8c9c5001de20b978d852";

        const formBody = new URLSearchParams({
            inf_form_xid: "da2a32de8fba8c9c5001de20b978d852",
            inf_form_name: "Password Recovery 2025",
            infusionsoft_version: "1.70.0.849961",
            inf_field_Email: email,
            inf_custom_Honeypot: "null",
        });

        // 🔹 Send to Keap in debug mode (don’t auto-follow redirect)
        const keapRes = await fetch(keapUrl, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: formBody.toString(),
            redirect: "manual",
        });

        const keapText = await keapRes.text().catch(() => "(no body)");
        const headersObj: Record<string, string> = {};
        keapRes.headers.forEach((v, k) => (headersObj[k] = v));

        console.log("Keap DEBUG", {
            status: keapRes.status,
            headers: headersObj,
            body: keapText.slice(0, 500), // limit to 500 chars
        });

        return NextResponse.json(
            {
                success: keapRes.status >= 300 && keapRes.status < 400,
                debug: {
                    status: keapRes.status,
                    headers: headersObj,
                    body: keapText.slice(0, 500), // send first 500 chars for inspection
                },
            },
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
