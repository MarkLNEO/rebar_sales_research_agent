import { NextRequest, NextResponse } from 'next/server';
import { parseCriteriaInput } from '@/src/utils/criteriaParser';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const { input } = await req.json();

    if (!input || typeof input !== 'string' || input.trim().length === 0) {
      return NextResponse.json(
        { error: 'Invalid input. Expected non-empty string.' },
        { status: 400 }
      );
    }

    const criteria = parseCriteriaInput(input);

    return NextResponse.json({
      criteria: criteria.filter(c => c.trim().length > 0),
      rawInput: input,
    });
  } catch (error: any) {
    console.error('[parse-criteria] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to parse criteria',
        message: error?.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
