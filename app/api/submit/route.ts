import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const contentType = request.headers.get('content-type') || '';

        let body: any = {};
        if (contentType.includes('application/json')) {
            body = await request.json();
        } else if (contentType.includes('application/x-www-form-urlencoded')) {
            const formData = await request.formData();
            body = Object.fromEntries(formData.entries());
        }

        console.log('Received body:', body);

        if (!body || Object.keys(body).length === 0) {
            return NextResponse.json(
                { error: 'Empty form data' },
                { status: 400 }
            );
        }

        // ✅ Example: Extract email (your Elementor field name may differ)
        const email =
            body['form_fields[inf_field_Email]'] ||
            body['inf_field_Email'] ||
            body['email'];

        return NextResponse.json({
            success: true,
            email,
            raw: body,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error('Error parsing request:', error);
        return NextResponse.json(
            { error: 'Failed to parse request' },
            { status: 400 }
        );
    }
}
