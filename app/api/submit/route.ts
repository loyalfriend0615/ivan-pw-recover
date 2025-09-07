import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        // Parse the request body
        const body = await request.json();

        // Log the received body for debugging
        console.log('Received POST body:', body);

        // Basic validation - check if body exists
        if (!body || Object.keys(body).length === 0) {
            return NextResponse.json(
                { error: 'Request body is empty or invalid' },
                { status: 400 }
            );
        }

        // Return success response with the received data
        return NextResponse.json({
            success: true,
            message: 'POST request received successfully',
            data: body,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error processing POST request:', error);

        return NextResponse.json(
            {
                error: 'Invalid JSON in request body',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 400 }
        );
    }
}

// Optional: Handle other HTTP methods
export async function GET() {
    return NextResponse.json(
        { message: 'This endpoint only accepts POST requests' },
        { status: 405 }
    );
}
