"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { MapPin, Calendar, Wallet, Route, Lightbulb, Send, Loader2, Plus, Trash2, MessageCircle } from "lucide-react"
import dynamic from "next/dynamic"

type Tab = "suggestion" | "planning"

// 动态加载地图组件（避免 SSR 问题）
const TravelMap = dynamic(() => import("@/components/TravelMap"), { 
  ssr: false,
  loading: () => <div className="w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center text-gray-500">地图加载中...</div>
})

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("suggestion")

  // 旅游建议
  const [destination, setDestination] = useState("")
  const [days, setDays] = useState("")
  const [budget, setBudget] = useState("")
  const [suggestion, setSuggestion] = useState("")
  const [suggestionLoading, setSuggestionLoading] = useState(false)
  const [followUpQuestion, setFollowUpQuestion] = useState("")
  const [followUpLoading, setFollowUpLoading] = useState(false)

  // 旅游规划 - 动态景点列表
  const [spots, setSpots] = useState<string[]>([""])
  const [plan, setPlan] = useState("")
  const [planLoading, setPlanLoading] = useState(false)
  const [planFollowUp, setPlanFollowUp] = useState("")
  const [planFollowUpLoading, setPlanFollowUpLoading] = useState(false)
  const [showMap, setShowMap] = useState(false)

  // 添加景点
  const addSpot = () => {
    setSpots([...spots, ""])
  }

  // 删除景点
  const removeSpot = (index: number) => {
    if (spots.length > 1) {
      setSpots(spots.filter((_, i) => i !== index))
    }
  }

  // 更新景点
  const updateSpot = (index: number, value: string) => {
    const newSpots = [...spots]
    newSpots[index] = value
    setSpots(newSpots)
  }

  // 提取路线顺序（从 plan 中解析）
  const extractOrder = (planText: string): number[] => {
    // 简单的解析逻辑：按数字顺序或"第X站"来确定顺序
    const lines = planText.split("\n")
    const order: number[] = []
    const spotNames = spots.filter(s => s.trim())
    
    // 如果无法确定顺序，保持原输入顺序
    return spotNames.map((_, i) => i)
  }

  // 生成旅游建议
  const generateSuggestion = async () => {
    if (!destination || !days || !budget) return

    setSuggestionLoading(true)
    setSuggestion("")

    try {
      const response = await fetch("/api/travel-suggestion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ destination, days, budget })
      })

      const data = await response.json()
      if (data.suggestion) {
        setSuggestion(data.suggestion)
      } else {
        setSuggestion("生成失败，请稍后重试")
      }
    } catch (error) {
      setSuggestion("请求失败，请检查网络")
    } finally {
      setSuggestionLoading(false)
    }
  }

  // 追问旅游建议
  const askFollowUp = async () => {
    if (!followUpQuestion.trim() || !suggestion) return

    setFollowUpLoading(true)

    try {
      const response = await fetch("/api/travel-suggestion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destination,
          days,
          budget,
          followUp: followUpQuestion,
          previousSuggestion: suggestion
        })
      })

      const data = await response.json()
      if (data.suggestion) {
        setSuggestion(data.suggestion)
        setFollowUpQuestion("")
      }
    } catch (error) {
      console.error(error)
    } finally {
      setFollowUpLoading(false)
    }
  }

  // 规划旅游路线
  const generatePlan = async () => {
    const validSpots = spots.filter(s => s.trim())
    if (validSpots.length < 2) {
      setPlan("请至少输入2个景点")
      return
    }

    setPlanLoading(true)
    setPlan("")
    setShowMap(false)

    try {
      const response = await fetch("/api/travel-planning", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spots: validSpots })
      })

      const data = await response.json()
      if (data.plan) {
        setPlan(data.plan)
        // 生成路线后显示地图
        setTimeout(() => setShowMap(true), 500)
      } else {
        setPlan("规划失败，请稍后重试")
      }
    } catch (error) {
      setPlan("请求失败，请检查网络")
    } finally {
      setPlanLoading(false)
    }
  }

  // 追问路线规划
  const askPlanFollowUp = async () => {
    if (!planFollowUp.trim() || !plan) return

    setPlanFollowUpLoading(true)

    try {
      const response = await fetch("/api/travel-planning", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          spots: spots.filter(s => s.trim()),
          followUp: planFollowUp,
          previousPlan: plan
        })
      })

      const data = await response.json()
      if (data.plan) {
        setPlan(data.plan)
        setPlanFollowUp("")
      }
    } catch (error) {
      console.error(error)
    } finally {
      setPlanFollowUpLoading(false)
    }
  }

  const validSpots = spots.filter(s => s.trim())
  const spotList = validSpots.map(name => ({ name }))

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* 标题 */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Travel Mate</h1>
          <p className="text-gray-600">你的智能旅行规划助手</p>
        </div>

        {/* Tab 切换 */}
        <div className="flex gap-2 mb-8 justify-center">
          <Button
            variant={activeTab === "suggestion" ? "default" : "outline"}
            onClick={() => setActiveTab("suggestion")}
            className="gap-2"
          >
            <Lightbulb className="w-4 h-4" />
            旅游建议
          </Button>
          <Button
            variant={activeTab === "planning" ? "default" : "outline"}
            onClick={() => setActiveTab("planning")}
            className="gap-2"
          >
            <Route className="w-4 h-4" />
            路线规划
          </Button>
        </div>

        {/* 旅游建议 */}
        {activeTab === "suggestion" && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>生成旅游建议</CardTitle>
                <CardDescription>
                  输入目的地、出行天数和预算，获取个性化旅行建议
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    目的地
                  </label>
                  <Input
                    placeholder="例如：日本东京"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      计划天数
                    </label>
                    <Input
                      type="number"
                      placeholder="例如：5"
                      value={days}
                      onChange={(e) => setDays(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <Wallet className="w-4 h-4" />
                      预算（元）
                    </label>
                    <Input
                      type="number"
                      placeholder="例如：10000"
                      value={budget}
                      onChange={(e) => setBudget(e.target.value)}
                    />
                  </div>
                </div>

                <Button
                  className="w-full gap-2"
                  disabled={!destination || !days || !budget || suggestionLoading}
                  onClick={generateSuggestion}
                >
                  {suggestionLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  生成建议
                </Button>
              </CardContent>
            </Card>

            {/* 建议结果 */}
            {suggestion && (
              <Card className="bg-yellow-50 border-yellow-200">
                <CardContent className="pt-6 whitespace-pre-wrap text-gray-800">{suggestion}</CardContent>
                
                {/* 追问功能 */}
                <CardContent className="pt-0 space-y-2">
                  <div className="flex gap-2">
                    <Input
                      placeholder="继续追问，例如：'帮我增加美食推荐'"
                      value={followUpQuestion}
                      onChange={(e) => setFollowUpQuestion(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && askFollowUp()}
                    />
                    <Button 
                      variant="outline" 
                      onClick={askFollowUp}
                      disabled={!followUpQuestion.trim() || followUpLoading}
                    >
                      {followUpLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageCircle className="w-4 h-4" />}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* 路线规划 */}
        {activeTab === "planning" && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>规划旅游路线</CardTitle>
                <CardDescription>
                  添加景点，自动为你规划合理路线
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 动态景点列表 */}
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    景点列表
                  </label>
                  {spots.map((spot, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        placeholder={`景点 ${index + 1}，例如：天安门广场`}
                        value={spot}
                        onChange={(e) => updateSpot(index, e.target.value)}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeSpot(index)}
                        disabled={spots.length === 1}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  <Button variant="outline" onClick={addSpot} className="w-full gap-2">
                    <Plus className="w-4 h-4" />
                    添加景点
                  </Button>
                </div>

                <Button
                  className="w-full gap-2"
                  disabled={validSpots.length < 2 || planLoading}
                  onClick={generatePlan}
                >
                  {planLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Route className="w-4 h-4" />
                  )}
                  规划路线
                </Button>
              </CardContent>
            </Card>

            {/* 规划结果 */}
            {plan && (
              <Card className="bg-green-50 border-green-200">
                <CardContent className="pt-6 whitespace-pre-wrap text-gray-800">{plan}</CardContent>
                
                {/* 追问功能 */}
                <CardContent className="pt-0 space-y-2">
                  <div className="flex gap-2">
                    <Input
                      placeholder="继续追问，例如：'调整成三天行程'"
                      value={planFollowUp}
                      onChange={(e) => setPlanFollowUp(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && askPlanFollowUp()}
                    />
                    <Button 
                      variant="outline" 
                      onClick={askPlanFollowUp}
                      disabled={!planFollowUp.trim() || planFollowUpLoading}
                    >
                      {planFollowUpLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageCircle className="w-4 h-4" />}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 地图展示 */}
            {showMap && validSpots.length >= 2 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    景点地图
                  </CardTitle>
                  <CardDescription>
                    蓝色数字表示游览顺序，点击标记查看详情
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <TravelMap spots={spotList} order={extractOrder(plan)} />
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* 底部说明 */}
        <p className="text-center text-sm text-gray-500 mt-8">
          🗺️ 路线规划包含景点地图展示
        </p>
      </div>
    </div>
  )
}
