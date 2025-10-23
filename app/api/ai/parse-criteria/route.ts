import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * Parse user-provided criteria text into structured array
 * Uses gpt-5-nano for semantic understanding of criteria, handling:
 * - Numbers with commas (e.g., "1,000 employees")
 * - Parenthetical examples (e.g., "cloud infrastructure (AWS, Azure, GCP)")
 * - Natural language grouping
 */
export async function POST(req: NextRequest) {
  try {
    const { input } = await req.json();

    if (!input || typeof input !== 'string') {
      return NextResponse.json(
        { error: 'Invalid input. Expected string.' },
        { status: 400 }
      );
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const prompt = `Parse the following user input into a JSON array of distinct ICP criteria. Each criterion should be a single, coherent requirement.

RULES:
1. Keep numbers with their units intact (e.g., "1,000 employees" is ONE criterion)
2. Keep parenthetical examples with their parent concept (e.g., "uses cloud (AWS, Azure)" is ONE criterion)
3. Split on semantic boundaries, not just punctuation
4. Each criterion should be self-contained and make sense on its own
5. Preserve exact wording - do not rephrase or interpret

INPUT:
${input}

OUTPUT FORMAT:
Return ONLY a valid JSON array of strings, with no additional text or explanation.

EXAMPLE:
Input: "Over 1,000 employees, globally distributed workforce, uses cloud or hybrid infrastructure (e.g., AWS, Azure, GCP), has a dedicated CISO"
Output: ["Over 1,000 employees", "globally distributed workforce", "uses cloud or hybrid infrastructure (e.g., AWS, Azure, GCP)", "has a dedicated CISO"]`;

    const response = await openai.chat.completions.create({
      model: 'gpt-5-nano',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.1, // Low temperature for consistent parsing
      max_tokens: 500,
    });

    const rawOutput = response.choices[0]?.message?.content?.trim();

    if (!rawOutput) {
      throw new Error('Empty response from OpenAI');
    }

    // Parse JSON response
    let criteria: string[];
    try {
      criteria = JSON.parse(rawOutput);
    } catch (parseError) {
      console.error('[parse-criteria] Failed to parse OpenAI response as JSON:', rawOutput);
      // Fallback: try to extract JSON from response if wrapped in markdown
      const jsonMatch = rawOutput.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        criteria = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Response is not valid JSON');
      }
    }

    // Validate response structure
    if (!Array.isArray(criteria) || criteria.some(c => typeof c !== 'string')) {
      throw new Error('Invalid response format from OpenAI');
    }

    return NextResponse.json({
      criteria: criteria.filter(c => c.trim().length > 0),
      rawInput: input,
    });
  } catch (error: any) {
    console.error('[parse-criteria] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to parse criteria',
        message: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
