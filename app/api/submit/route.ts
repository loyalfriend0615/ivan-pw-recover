import { NextRequest, NextResponse } from "next/server";

const RECAPTCHA_SECRET = process.env.RECAPTCHA_SECRET_KEY!;

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
        const { email, "g-recaptcha-response": token } = body;

        if (!token) {
            return NextResponse.json(
                { success: false, error: "Missing captcha token" },
                { status: 400, headers: corsHeaders }
            );
        }

        // 1. Verify captcha
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

        // 2. Prepare Keap form body
        const keapBody = new URLSearchParams({
            inf_form_xid: "da2a32de8fba8c9c5001de20b978d852",
            inf_form_name: "Password Recovery 2025",
            infusionsoft_version: "1.70.0.849961",
            inf_field_Email: email,
            inf_custom_Honeypot: "null",
        });

        // 3. Post to Keap with redirect following
        const keapRes = await fetch(
            "https://sy659.infusionsoft.com/app/form/process/da2a32de8fba8c9c5001de20b978d852",
            {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: keapBody.toString(),
                redirect: "follow",   // <-- important: follow the 308 to thank-you page
            }
        );

        console.log("Final Keap URL:", keapRes.url);
        console.log("Final Keap status:", keapRes.status);

        if (keapRes.ok) {
            return NextResponse.json({ success: true, email }, { headers: corsHeaders });
        } else {
            return NextResponse.json(
                { success: false, error: "Keap submission failed", status: keapRes.status },
                { status: 500, headers: corsHeaders }
            );
        }
    } catch (err) {
        console.error("API error:", err);
        return NextResponse.json(
            { success: false, error: err instanceof Error ? err.message : "Unknown error" },
            { status: 500, headers: corsHeaders }
        );
    }
}
