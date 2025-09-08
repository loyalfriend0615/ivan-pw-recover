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
        const { email, "g-recaptcha-response": token } = body as {
            email: string;
            "g-recaptcha-response": string;
        };

        console.log("[DEBUG] Incoming body:", body);

        if (!token) {
            return NextResponse.json(
                { success: false, error: "Missing captcha token" },
                { status: 400, headers: corsHeaders }
            );
        }

        // ✅ Verify captcha
        const verifyRes = await fetch("https://www.google.com/recaptcha/api/siteverify", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: `secret=${RECAPTCHA_SECRET}&response=${token}`,
        });
        const verifyData = await verifyRes.json();

        console.log("[DEBUG] Captcha verify response:", verifyData);

        if (!verifyData.success) {
            return NextResponse.json(
                { success: false, error: "Captcha validation failed", details: verifyData },
                { status: 400, headers: corsHeaders }
            );
        }

        // ✅ Submit to Keap form
        const keapUrl =
            "https://sy659.infusionsoft.com/app/form/process/da2a32de8fba8c9c5001de20b978d852";

        const formBody = new URLSearchParams({
            inf_form_xid: "da2a32de8fba8c9c5001de20b978d852",
            inf_form_name: "Password Recovery 2025",
            infusionsoft_version: "1.70.0.849961",
            inf_field_Email: email,
            inf_custom_Honeypot: "null",
        });

        console.log("[DEBUG] Sending to Keap with body:", formBody.toString());

        const keapRes = await fetch(keapUrl, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: formBody.toString(),
            redirect: "manual",
        });

        const redirectUrl = keapRes.headers.get("location");
        const setCookies = keapRes.headers.get("set-cookie");

        console.log("[DEBUG] Keap status:", keapRes.status);
        console.log("[DEBUG] Keap location:", redirectUrl);
        console.log("[DEBUG] Keap cookies:", setCookies);

        if (keapRes.status === 308 && redirectUrl) {
            return NextResponse.json(
                { success: true, email, keapRedirect: redirectUrl },
                { headers: corsHeaders }
            );
        }

        return NextResponse.json(
            { success: false, error: "Keap did not accept submission", status: keapRes.status },
            { status: 500, headers: corsHeaders }
        );
    } catch (err) {
        console.error("[DEBUG] API error:", err);
        return NextResponse.json(
            { success: false, error: err instanceof Error ? err.message : "Unknown error" },
            { status: 500, headers: corsHeaders }
        );
    }
}
