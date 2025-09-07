import { NextRequest, NextResponse } from "next/server";

const RECAPTCHA_SECRET = process.env.RECAPTCHA_SECRET!; // add to Vercel env vars

export async function POST(req: NextRequest) {
    const corsHeaders = {
        "Access-Control-Allow-Origin": "https://mikeweinberg.com",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
    };

    try {
        const body = await req.formData(); // form POST from HTML
        const email = body.get("email") as string;
        const token = body.get("g-recaptcha-response") as string;

        if (!token) {
            return NextResponse.json({ error: "Missing captcha token" }, { status: 400, headers: corsHeaders });
        }

        // Verify with Google
        const verifyRes = await fetch(
            `https://www.google.com/recaptcha/api/siteverify`,
            {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: `secret=${RECAPTCHA_SECRET}&response=${token}`,
            }
        );
        const verifyJson = await verifyRes.json();

        if (!verifyJson.success) {
            return NextResponse.json(
                { error: "Captcha verification failed", details: verifyJson },
                { status: 400, headers: corsHeaders }
            );
        }

        // ✅ Captcha is valid, now proceed (example: forward to Keap API)
        // For now, just return success:
        return NextResponse.json(
            { success: true, email, message: "Captcha validated, proceed with Keap logic here" },
            { status: 200, headers: corsHeaders }
        );
    } catch (err) {
        return NextResponse.json(
            { error: "Server error", details: (err as Error).message },
            { status: 500, headers: corsHeaders }
        );
    }
}

export async function OPTIONS() {
    return NextResponse.json({}, {
        status: 200, headers: {
            "Access-Control-Allow-Origin": "https://mikeweinberg.com",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
        }
    });
}
