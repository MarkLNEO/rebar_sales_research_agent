import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function buildMemoryBlock(userId: string, agent = 'company_research'): Promise<string> {
  if (!SUPABASE_URL || !SERVICE_KEY) return '';
  
  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const [{ data: knowledge }, { data: implicit }] = await Promise.all([
      supabase
        .from('knowledge_entries')
        .select('title, content')
        .eq('user_id', userId)
        .eq('agent', agent)
        .eq('enabled', true)
        .order('created_at', { ascending: false })
        .limit(8),
      supabase
        .from('implicit_preferences')
        .select('key, value_json')
        .eq('user_id', userId)
        .eq('agent', agent)
        .order('updated_at', { ascending: false })
        .limit(24)
    ]);

    const confirmed = (knowledge || [])
      .map(e => e.content || e.title)
      .filter(Boolean)
      .map(text => `- ${text}`)
      .slice(0, 8);

    const tendencies = (implicit || [])
      .map(row => {
        const val = row.value_json;
        if (!val || typeof val !== 'object') return null;
        const conf = val.confidence || val.conf;
        if (typeof conf === 'number' && conf < 0.6) return null;
        
        if (typeof val.value === 'number') {
          return `${row.key}: ${val.value.toFixed(2)}${conf ? ` (conf ${conf.toFixed(2)})` : ''}`;
        }
        if (typeof val.choice === 'string') {
          return `${row.key}: ${val.choice}${conf ? ` (conf ${conf.toFixed(2)})` : ''}`;
        }
        return null;
      })
      .filter(Boolean)
      .slice(0, 12);

    if (confirmed.length === 0 && tendencies.length === 0) return '';

    let block = `<<memory v=1 agent=${agent}>\n`;
    if (confirmed.length > 0) {
      block += '# confirmed knowledge\n' + confirmed.join('\n') + '\n';
    }
    if (tendencies.length > 0) {
      if (confirmed.length > 0) block += '\n';
      block += '# implicit tendencies\n' + tendencies.join('\n') + '\n';
    }
    block += '</memory>';

    return Buffer.byteLength(block, 'utf8') <= 1800 ? block : '';
  } catch (error) {
    console.error('[memory] build failed', error);
    return '';
  }
}
