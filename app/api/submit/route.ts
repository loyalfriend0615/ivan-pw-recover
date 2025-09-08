import { NextRequest, NextResponse } from "next/server";

const RECAPTCHA_SECRET = process.env.RECAPTCHA_SECRET_KEY!;

// Allow CORS for mikeweinberg.com
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

        // 1. Verify captcha with Google
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
            console.error("Captcha failed:", verifyData);
            return NextResponse.json(
                { success: false, error: "Captcha validation failed", details: verifyData },
                { status: 400, headers: corsHeaders }
            );
        }

        // 2. Prepare Keap form data
        const keapBody = new URLSearchParams({
            inf_form_xid: "da2a32de8fba8c9c5001de20b978d852",
            inf_form_name: "Password Recovery 2025",
            infusionsoft_version: "1.70.0.849961",
            inf_field_Email: email,
            inf_custom_Honeypot: "null",
        });

        console.log("Submitting to Keap with body:", keapBody.toString());

        // 3. Post to Keap without following redirects automatically
        const keapRes = await fetch(
            "https://sy659.infusionsoft.com/app/form/process/da2a32de8fba8c9c5001de20b978d852",
            {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: keapBody.toString(),
                redirect: "manual",
            }
        );

        console.log("Keap initial status:", keapRes.status);
        const redirectUrl = keapRes.headers.get("location");
        console.log("Keap location header:", redirectUrl);

        // 4. Follow redirect once manually (Keap needs this to finalize submission)
        if (
            (keapRes.status === 308 || keapRes.status === 302) &&
            redirectUrl
        ) {
            const followRes = await fetch(redirectUrl, { method: "GET" });
            console.log("Followed redirect status:", followRes.status);

            if (followRes.ok) {
                return NextResponse.json(
                    { success: true, email },
                    { headers: corsHeaders }
                );
            }
        }

        // 5. Fallback if no success
        return NextResponse.json(
            { success: false, error: "Keap submission failed", status: keapRes.status },
            { status: 500, headers: corsHeaders }
        );
    } catch (err) {
        console.error("API error:", err);
        return NextResponse.json(
            {
                success: false,
                error: err instanceof Error ? err.message : "Unknown error",
            },
            { status: 500, headers: corsHeaders }
        );
    }
}
