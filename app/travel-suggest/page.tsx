'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2 } from 'lucide-react'

type FormData = {
  destination: string
  days: string
  date: string
  budget: string
  people: string
}

type StreamData = {
  type: 'start' | 'chunk' | 'done' | 'error'
  estimatedTime?: number
  content?: string
  message?: string
}

export default function TravelSuggest() {
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)
  const [estimatedTime, setEstimatedTime] = useState<number | null>(null)
  const [remainingTime, setRemainingTime] = useState<number | null>(null)
  const [progress, setProgress] = useState(0)
  const startTimeRef = useRef<number>(0)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const [formData, setFormData] = useState<FormData>({
    destination: '',
    days: '',
    date: '',
    budget: '',
    people: '1'
  })

  // 清理定时器
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [])

  // 更新剩余时间
  useEffect(() => {
    if (loading && estimatedTime && startTimeRef.current) {
      timerRef.current = setInterval(() => {
        const elapsed = (Date.now() - startTimeRef.current) / 1000
        const remaining = Math.max(0, Math.ceil(estimatedTime - elapsed))
        setRemainingTime(remaining)
        
        // 简单进度估算
        const p = Math.min(90, (elapsed / estimatedTime) * 100)
        setProgress(p)
      }, 1000)
    } else if (!loading) {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
      setRemainingTime(null)
      setProgress(0)
    }
  }, [loading, estimatedTime])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setResult('')
    setProgress(0)
    startTimeRef.current = Date.now()
    
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'travel-suggest', ...formData }),
      })

      if (!res.ok) {
        throw new Error('请求失败')
      }

      const reader = res.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error('无法读取响应')
      }

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        
        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data: StreamData = JSON.parse(line.slice(6))
              
              if (data.type === 'start' && data.estimatedTime) {
                setEstimatedTime(data.estimatedTime)
              } else if (data.type === 'chunk' && data.content) {
                setResult(prev => prev + data.content)
                setProgress(95) // 收到内容说明正在生成
              } else if (data.type === 'done') {
                setProgress(100)
              } else if (data.type === 'error') {
                setResult(`错误: ${data.message || '生成失败'}`)
              }
            } catch (e) {
              // 忽略解析错误
            }
          }
        }
      }
    } catch (error) {
      setResult('请求失败，请检查网络')
    }
    setLoading(false)
    setRemainingTime(null)
  }

  const copyResult = () => {
    navigator.clipboard.writeText(result)
    alert('已复制到剪贴板')
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto">
        <Link href="/" className="inline-flex items-center text-gray-600 hover:text-blue-600 mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          返回首页
        </Link>

        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h1 className="text-2xl font-bold mb-6">🌍 生成旅行建议</h1>
          
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">目的地 *</label>
              <input
                name="destination"
                value={formData.destination}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="如：日本东京、云南大理"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">出行天数 *</label>
                <input
                  type="number"
                  name="days"
                  value={formData.days}
                  onChange={handleChange}
                  required
                  min="1"
                  max="30"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
                  placeholder="3"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">出发日期</label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">预算范围</label>
                <select
                  name="budget"
                  value={formData.budget}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">选择预算</option>
                  <option value="2000以下">¥2000 以下</option>
                  <option value="2000-5000">¥2000-5000</option>
                  <option value="5000-10000">¥5000-10000</option>
                  <option value="10000以上">¥10000 以上</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">出行人数</label>
                <input
                  type="number"
                  name="people"
                  value={formData.people}
                  onChange={handleChange}
                  min="1"
                  max="10"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
                  placeholder="2"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !formData.destination || !formData.days}
              className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition flex items-center justify-center"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  AI 正在生成中...
                </>
              ) : (
                '✨ 生成旅行建议'
              )}
            </button>
          </form>
        </div>

        {/* 进度条和预计时间 */}
        {loading && (
          <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-600">生成进度</span>
              {remainingTime !== null && (
                <span className="text-sm text-blue-600 font-medium">
                  预计剩余 {remainingTime} 秒
                </span>
              )}
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {result && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">📋 旅行建议</h2>
              <button
                onClick={copyResult}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                复制结果
              </button>
            </div>
            <pre className="whitespace-pre-wrap text-sm text-gray-700 leading-relaxed">
              {result}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}
