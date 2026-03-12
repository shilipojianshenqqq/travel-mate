'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2 } from 'lucide-react'

type FormData = {
  city: string
  attractions: string
  time: string
  transport: string
}

type StreamData = {
  type: 'start' | 'chunk' | 'done' | 'error'
  estimatedTime?: number
  content?: string
  message?: string
}

export default function RoutePlan() {
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)
  const [estimatedTime, setEstimatedTime] = useState<number | null>(null)
  const [remainingTime, setRemainingTime] = useState<number | null>(null)
  const [progress, setProgress] = useState(0)
  const startTimeRef = useRef<number>(0)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const [formData, setFormData] = useState<FormData>({
    city: '',
    attractions: '',
    time: '1天',
    transport: '公交'
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
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
        body: JSON.stringify({ type: 'route-plan', ...formData }),
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
                setProgress(95)
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
        <Link href="/" className="inline-flex items-center text-gray-600 hover:text-green-600 mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          返回首页
        </Link>

        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h1 className="text-2xl font-bold mb-6">🗺️ 规划景点路线</h1>
          
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">目标城市 *</label>
              <input
                name="city"
                value={formData.city}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="如：北京、上海"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">想去的景点 *</label>
              <textarea
                name="attractions"
                value={formData.attractions}
                onChange={handleChange}
                required
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="用逗号分隔，如：天安门，故宫，颐和园"
              />
              <p className="text-xs text-gray-500 mt-1">多个景点用逗号分隔</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">可用时间</label>
                <select
                  name="time"
                  value={formData.time}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500"
                >
                  <option value="半天">半天</option>
                  <option value="1天">1天</option>
                  <option value="2天">2天</option>
                  <option value="3天">3天</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">出行方式</label>
                <select
                  name="transport"
                  value={formData.transport}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500"
                >
                  <option value="步行">步行</option>
                  <option value="公交">公交/地铁</option>
                  <option value="打车">打车</option>
                  <option value="自驾">自驾</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !formData.city || !formData.attractions}
              className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition flex items-center justify-center"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  AI 正在规划中...
                </>
              ) : (
                '✨ 生成路线规划'
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
                <span className="text-sm text-green-600 font-medium">
                  预计剩余 {remainingTime} 秒
                </span>
              )}
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {result && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">🗓️ 路线规划</h2>
              <button
                onClick={copyResult}
                className="text-sm text-green-600 hover:text-green-700"
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
