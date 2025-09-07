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

        // Verify with Google
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

        // ✅ At this point captcha is verified
        console.log("Verified Email Submission:", email);

        // TODO: Call Keap API here instead of console.log

        return NextResponse.json({ success: true, email }, { headers: corsHeaders });
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
