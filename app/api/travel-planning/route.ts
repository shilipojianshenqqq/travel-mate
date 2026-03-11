import { NextRequest, NextResponse } from "next/server"

const MINIMAX_API_KEY = process.env.MINIMAX_API_KEY
const MINIMAX_API_URL = "https://api.minimax.chat/v1/text/chatcompletion_v2"
const AMAP_KEY = process.env.AMAP_KEY

export async function POST(request: NextRequest) {
  try {
    if (!MINIMAX_API_KEY) {
      return NextResponse.json(
        { error: "API Key 未配置" },
        { status: 500 }
      )
    }

    const { spots, followUp, previousPlan } = await request.json()

    if (!spots || !Array.isArray(spots) || spots.length < 2) {
      return NextResponse.json(
        { error: "请至少提供2个景点" },
        { status: 400 }
      )
    }

    let prompt = ""
    let systemPrompt = `你是一个专业的旅行路线规划师，擅长优化景点游览顺序，提供高效、合理的旅行方案。你的回复应该：

1. 给出清晰的路线顺序和逻辑解释
2. 为每个景点标注建议停留时间
3. 考虑景点之间的距离和交通
4. 提供实用的游览贴士
5. 用emoji让内容更生动
6. 用中文回复，格式清晰
7. 内容要详尽，每项都要展开说明`

    if (followUp && previousPlan) {
      prompt = `基于以下之前的路线规划，回答用户的追问：

之前的规划：
${previousPlan}

用户追问：${followUp}

请根据用户的追问给出详细解答，可以调整路线或补充信息。`
    } else {
      const spotsList = spots.join("、")

      prompt = `请根据以下景点列表，规划一条合理、高效的游览路线：

🎯 景点列表：${spotsList}

请生成以下内容（每一项都要详细展开）：

## 🗺️ 推荐路线
- 路线顺序（从第1站到最后一站）
- 为什么要这样安排（逻辑说明）

## ⏱️ 各景点停留时间
- 每个景点的建议游览时长
- 为什么需要这么长时间

## 🚇 交通指南
- 景点之间的交通方式
- 预计耗时
- 交通费用参考

## 💡 游览贴士
- 各景点的开放时间
- 门票信息
- 最佳游览时段
- 避坑提示

## 📅 建议行程安排
- 如果时间有限，如何取舍
- 如果需要压缩/延长，如何调整

请尽可能详细，给出具体数据和建议。`
    }

    const response = await fetch(MINIMAX_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${MINIMAX_API_KEY}`
      },
      body: JSON.stringify({
        model: "MiniMax-M2.5",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 4000
      })
    })

    if (!response.ok) {
      const error = await response.text()
      console.error("MiniMax API error:", error)
      return NextResponse.json(
        { error: "API 调用失败" },
        { status: 500 }
      )
    }

    const data = await response.json()
    const plan = data.choices?.[0]?.message?.content || "规划失败，请稍后重试"

    return NextResponse.json({ plan })
  } catch (error) {
    console.error("Error:", error)
    return NextResponse.json(
      { error: "服务器错误" },
      { status: 500 }
    )
  }
}
