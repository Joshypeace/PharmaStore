import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    const url = request.nextUrl.searchParams.get("url")

    if (!url) {
        return NextResponse.json({ error: "URL parameter is required" }, { status: 400 })
    }

    try {
        const response = await fetch(url,{
            method: 'GET',
            redirect: 'follow',
        })

        return NextResponse.json({ resolvedUrl: response.url })
    } catch (error) {
        return NextResponse.json({ error: "Failed to resolve URL" }, { status: 500 })
    }
}