import { NextRequest } from 'next/server';
import { authenticateRequest } from '../../lib/auth';
import { buildMemoryBlock } from '../../lib/memory';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const { user } = await authenticateRequest(authHeader);
    
    const { searchParams } = new URL(req.url);
    const agent = searchParams.get('agent') || 'company_research';

    const memoryBlock = await buildMemoryBlock(user.id, agent);

    return Response.json({
      success: true,
      memory_block: memoryBlock,
      agent
    });

  } catch (error: any) {
    console.error('[memory/block] error:', error);
    return Response.json({ error: error.message }, { 
      status: error.message.includes('authorization') ? 401 : 500 
    });
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 200 });
}
