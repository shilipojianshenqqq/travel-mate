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
你是一位专业旅游规划师。请直接输出内容，不要输出思考过程，不要输出任何解释，只输出旅行建议。

【目的地】${destination}
【出行天数】${days} 天
【出发日期】${date || '待定'}
【预算范围】${budget || '不限'}
【出行人数】${people || 1} 人

请按以下格式生成（用中文，不要有任何思考过程）：
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
      estimatedTime = 5 + attractionCount * 3 // 每个景点约 3 秒
      
      prompt = `
你是一位专业的城市导游兼旅行策划师。请为用户精心规划一次完美的城市一日游行程，只输出内容，不要输出这些要求说明。

【城市】${city}
【想去的景点】${attractions}
【可用时间】${time}
【出行方式】${transport}

请按以下详细格式生成（用中文，每个部分都要内容丰富）：

🎯 推荐游览顺序
请根据地理位置和最佳游览时间，为每个景点给出30-50字的推荐理由和游玩要点。

⏱️ 建议游览时长
为每个景点标注合理的游览时间（包含拍照、休息等），并给出出发和离开的合理时间点。

🚇 详细交通指南
提供从上一个景点到下一个景点的具体交通方式，包括：
- 推荐公交/地铁线路（具体站名）
- 预计耗时
- 换乘方案
- 注意事项

📋 行程时间表（精确到小时）
格式：08:00-09:00 景点名称 - 具体活动内容
确保时间衔接合理，留出用餐和休息时间。

💡 额外贴士
- 门票价格（如有）
- 最佳拍照点
- 特色美食推荐
- 天气注意事项
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
