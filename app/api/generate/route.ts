import { NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.MINIMAX_API_KEY,
  baseURL: 'https://api.minimaxi.com/v1',
})

// 流式输出接口
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { type, destination, days, budget, people, date, city, attractions, time, transport } = body

    let prompt = ''
    let estimatedTime = 10 // 基础预计时间（秒）

    if (type === 'travel-suggest') {
      // 根据天数调整预计时间
      const daysNum = parseInt(days) || 3
      estimatedTime = 5 + daysNum * 3 // 每天约 3 秒
      
      prompt = `
你是一位专业旅游规划师。请根据以下信息生成旅行建议：

【目的地】${destination}
【出行天数】${days} 天
【出发日期】${date || '待定'}
【预算范围】${budget || '不限'}
【出行人数】${people || 1} 人

要求：
1. 内容丰富实用，避免过于简短
2. 每日安排每天约 100 字左右
3. 住宿建议 2-3 个推荐，约 100 字
4. 美食推荐 3-5 个推荐，约 150 字
5. 格式用 emoji 标题分隔

请按以下格式生成（用中文）：
📍 行程概览（80-100 字）
📅 每日安排（每天约 100 字）
🏨 住宿建议（2-3 个推荐，约 100 字）
🍜 美食推荐（3-5 个推荐，约 150 字）
⚠️ 注意事项（50-80 字）
💰 预算分配（30-50 字）
`
    } else if (type === 'route-plan') {
      // 根据景点数量调整预计时间
      const attractionCount = attractions ? attractions.split(/[,，]/).length : 3
      estimatedTime = 3 + attractionCount * 2.5 // 每个景点约 2.5 秒
      
      prompt = `
你是一位城市导游。请为以下行程规划游玩路线：

【城市】${city}
【想去的景点】${attractions}
【可用时间】${time}
【出行方式】${transport}

要求：
1. 每个景点建议 30-50 字，实用详细
2. 交通建议 50-80 字
3. 时间安排表带具体时间点
4. 格式用 emoji 标题分隔

请按以下格式生成（用中文）：
🎯 推荐顺序（每个景点 30-50 字）
⏱️ 景点时间（每个 20-30 字）
🚇 交通建议（50-80 字）
📋 时间表（按时间点排列）
`
    }

    if (!prompt) {
      return NextResponse.json({ result: '无效的请求类型', estimatedTime: 0 }, { status: 400 })
    }

    // 先返回预计时间
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        // 首先发送预计时间
        controller.enqueue(encoder.encode(`data: {"type":"start","estimatedTime":${estimatedTime}}\n\n`))
        
        try {
          const completion = await openai.chat.completions.create({
            model: 'MiniMax-M2.5',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 4000,  // 增大输出限制
            temperature: 0.7,
            stream: true,  // 启用流式输出
          })

          for await (const chunk of completion) {
            const content = chunk.choices[0]?.delta?.content || ''
            if (content) {
              const data = JSON.stringify({ type: 'chunk', content })
              controller.enqueue(encoder.encode(`data: ${data}\n\n`))
            }
          }
          
          controller.enqueue(encoder.encode(`data: {"type":"done"}\n\n`))
          controller.close()
        } catch (error: any) {
          const errorData = JSON.stringify({ type: 'error', message: error.message || '生成失败' })
          controller.enqueue(encoder.encode(`data: ${errorData}\n\n`))
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error: any) {
    console.error('API Error:', error)
    return NextResponse.json({ 
      result: `生成失败: ${error.message || '请检查 API Key 是否正确'}`,
      estimatedTime: 0
    }, { status: 500 })
  }
}
