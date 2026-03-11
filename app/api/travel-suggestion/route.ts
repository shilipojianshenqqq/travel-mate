import { NextRequest, NextResponse } from "next/server"

const MINIMAX_API_KEY = process.env.MINIMAX_API_KEY
const MINIMAX_API_URL = "https://api.minimax.chat/v1/text/chatcompletion_v2"

export async function POST(request: NextRequest) {
  try {
    if (!MINIMAX_API_KEY) {
      return NextResponse.json(
        { error: "API Key 未配置" },
        { status: 500 }
      )
    }

    const { destination, days, budget, followUp, previousSuggestion } = await request.json()

    if (!destination || !days || !budget) {
      return NextResponse.json(
        { error: "缺少必要参数：目的地、天数、预算" },
        { status: 400 }
      )
    }

    let prompt = ""
    let systemPrompt = `你是一个专业、细致的旅行规划师，擅长制定详细、实用的旅行计划。你的回复应该：

1. 内容丰富、详尽，每个点都要展开说明
2. 使用清晰的标题和结构
3. 给出具体的建议和理由
4. 考虑季节、天气、当地文化等因素
5. 用emoji让内容更生动但不要过度使用
6. 用中文回复`

    if (followUp && previousSuggestion) {
      prompt = `基于以下之前的旅行建议，回答用户的追问：

之前的建议：
${previousSuggestion}

用户追问：${followUp}

请根据用户的追问给出详细解答，可以修改或补充之前的建议。`
    } else {
      prompt = `请为以下旅行需求制定一份详细、实用的方案：

🎯 目的地：${destination}
📅 计划天数：${days}天
💰 预算：${budget}元

请生成以下内容（每一项都要详细展开）：

## 📋 行程概览
- 整体行程思路
- 每天的详细安排（早上、下午、晚上）

## 🏞 推荐景点
- 每个景点的详细介绍
- 为什么推荐
- 门票价格参考
- 建议游览时长

## 🏨 住宿建议
- 推荐住宿区域
- 各档次酒店/民宿推荐
- 预算分配

## 🍜 美食推荐
- 当地特色美食
- 推荐餐厅（分价位）

## 🚗 交通指南
- 外部交通（飞机/火车等）
- 当地交通方式

## 💡 实用贴士
- 最佳出行季节
- 注意事项
- 必备物品清单

请尽可能详细，给出具体建议和数据。`
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
    const suggestion = data.choices?.[0]?.message?.content || "生成失败，请稍后重试"

    return NextResponse.json({ suggestion })
  } catch (error) {
    console.error("Error:", error)
    return NextResponse.json(
      { error: "服务器错误" },
      { status: 500 }
    )
  }
}
