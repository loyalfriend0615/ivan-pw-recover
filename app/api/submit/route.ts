import { NextRequest, NextResponse } from 'next/server';

// Handle CORS preflight requests
export async function OPTIONS() {
    return new NextResponse(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        },
    });
}

export async function POST(request: NextRequest) {
    try {
        const contentType = request.headers.get('content-type') || '';

        let body: Record<string, unknown> = {};
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
                {
                    status: 400,
                    headers: {
                        'Access-Control-Allow-Origin': '*',
                    }
                }
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
        }, {
            headers: {
                'Access-Control-Allow-Origin': '*',
            }
        });
    } catch (error) {
        console.error('Error parsing request:', error);
        return NextResponse.json(
            { error: 'Failed to parse request' },
            {
                status: 400,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                }
            }
        );
    }
}
