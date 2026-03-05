export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { query, mode, timeDesc, apiKey } = req.body;
  if (!query || !apiKey) return res.status(400).json({ error: 'Missing fields' });

  const modeText = {
    timeline: '产品发布、升级、迭代历史',
    feature: '功能演进与各代对比',
    market: '市场动态、融资、竞品格局',
    news: '最新新闻与动态'
  }[mode] || '产品时间线';

  const prompt = `你是科技产品研究员。请用网络搜索深入研究"${query}"在${timeDesc}内的${modeText}。

搜索完成后，用以下XML格式输出结果，每个字段严格在标签内，不要换行，不要引号：

<report>
<overview>整体概述2-3句话</overview>
<insight icon="📊" title="洞察标题1">洞察内容1-2句</insight>
<insight icon="🔍" title="洞察标题2">洞察内容1-2句</insight>
<insight icon="💡" title="洞察标题3">洞察内容1-2句</insight>
<event date="2024-03" type="launch" title="事件标题" source="来源">事件描述1-2句。功能特性：特性A、特性B</event>
<event date="2023-11" type="update" title="事件标题" source="来源">事件描述</event>
</report>

type只能是：launch / update / feature / software / discontinue / partnership / milestone
至少输出10个event，按时间倒序。只输出XML，不要其他文字。`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8000,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: data.error?.message || 'API error' });

    const text = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
    return res.status(200).json({ text });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
