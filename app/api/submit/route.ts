import { NextRequest } from "next/server";

// 🔑 Make sure you set this in Vercel Environment Variables
// e.g. RECAPTCHA_SECRET_KEY=your-google-secret-key
const RECAPTCHA_SECRET = process.env.RECAPTCHA_SECRET_KEY!;

// Reusable CORS headers
const corsHeaders = {
    "Access-Control-Allow-Origin": "https://mikeweinberg.com", // <-- WP site
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// Handle OPTIONS (CORS preflight)
export async function OPTIONS() {
    return new Response(null, { status: 204, headers: corsHeaders });
}

// Handle POST
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const email = body.email;
        const token = body["g-recaptcha-response"];

        if (!email) {
            return new Response(
                JSON.stringify({ success: false, error: "Missing email" }),
                { status: 400, headers: corsHeaders }
            );
        }

        if (!token) {
            return new Response(
                JSON.stringify({ success: false, error: "Missing captcha token" }),
                { status: 400, headers: corsHeaders }
            );
        }

        // 🔍 Verify token with Google
        const verifyRes = await fetch("https://www.google.com/recaptcha/api/siteverify", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: `secret=${RECAPTCHA_SECRET}&response=${token}`,
        });

        const verifyData = await verifyRes.json();

        if (!verifyData.success) {
            return new Response(
                JSON.stringify({
                    success: false,
                    error: "Captcha validation failed",
                    details: verifyData,
                }),
                { status: 400, headers: corsHeaders }
            );
        }

        // ✅ At this point, captcha is verified.
        // TODO: Forward `email` to Keap API here.
        console.log("Verified Email Submission:", email);

        return new Response(
            JSON.stringify({ success: true, message: "Captcha passed", email }),
            { status: 200, headers: corsHeaders }
        );
    } catch (err: any) {
        console.error("API error:", err);
        return new Response(
            JSON.stringify({ success: false, error: err.message || "Unknown error" }),
            { status: 500, headers: corsHeaders }
        );
    }
}
