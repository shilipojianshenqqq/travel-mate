'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2, ExternalLink, MapPin, RefreshCw, Clock, History } from 'lucide-react'

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

type HistoryItem = {
  id: string
  destination: string
  days: string
  date: string
  budget: string
  people: string
  result: string
  createdAt: number
}

type POI = {
  name: string
  address: string
  location: string
  photos?: string[]
}

// 预设景点图片
const DEFAULT_PHOTOS: Record<string, string[]> = {
  '北京': ['https://images.unsplash.com/photo-1599571234909-29ed5d1321d6?w=400&h=300&fit=crop', 'https://images.unsplash.com/photo-1508804185872-d7badad00f7d?w=400&h=300&fit=crop', 'https://images.unsplash.com/photo-1532630571098-79c3d7244e5e?w=400&h=300&fit=crop'],
  '上海': ['https://images.unsplash.com/photo-1474181487882-5abf3f0ba6c2?w=400&h=300&fit=crop', 'https://images.unsplash.com/photo-1548919973-5cef591cdbc9?w=400&h=300&fit=crop', 'https://images.unsplash.com/photo-1553913861-c0fddf2619ee?w=400&h=300&fit=crop'],
  '云南': ['https://images.unsplash.com/photo-1580810453078-3e8eb385a2a4?w=400&h=300&fit=crop', 'https://images.unsplash.com/photo-1528181304800-259b08848526?w=400&h=300&fit=crop', 'https://images.unsplash.com/photo-1585983633883-3995f9a2880f?w=400&h=300&fit=crop'],
  '亚庇': ['https://images.unsplash.com/photo-1512100356356-de1b84283e18?w=400&h=300&fit=crop', 'https://images.unsplash.com/photo-1544550581-5f7ceaf7f992?w=400&h=300&fit=crop', 'https://images.unsplash.com/photo-1590559899731-a382839e5549?w=400&h=300&fit=crop'],
  '沙巴': ['https://images.unsplash.com/photo-1512100356356-de1b84283e18?w=400&h=300&fit=crop', 'https://images.unsplash.com/photo-1544550581-5f7ceaf7f992?w=400&h=300&fit=crop', 'https://images.unsplash.com/photo-1590559899731-a382839e5549?w=400&h=300&fit=crop'],
  '马来西亚': ['https://images.unsplash.com/photo-1512100356356-de1b84283e18?w=400&h=300&fit=crop', 'https://images.unsplash.com/photo-1544550581-5f7ceaf7f992?w=400&h=300&fit=crop', 'https://images.unsplash.com/photo-1590559899731-a382839e5549?w=400&h=300&fit=crop'],
  '日本': ['https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=400&h=300&fit=crop', 'https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=400&h=300&fit=crop', 'https://images.unsplash.com/photo-1524413840807-0c3cb6fa808d?w=400&h=300&fit=crop'],
  '泰国': ['https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?w=400&h=300&fit=crop', 'https://images.unsplash.com/photo-1528181304800-259b08848526?w=400&h=300&fit=crop', 'https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=400&h=300&fit=crop'],
  '三亚': ['https://images.unsplash.com/photo-1503131381078-75a5e0b0f67c?w=400&h=300&fit=crop', 'https://images.unsplash.com/photo-1512113569142-8a60fccc7bfec?w=400&h=300&fit=crop', 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop']
}

const FALLBACK_PHOTOS = ['https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop', 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=400&h=300&fit=crop', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=300&fit=crop']

// 骨架屏组件
function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
}

// 骨架屏
function ResultSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
      <div className="flex justify-between items-center mb-4">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-5 w-16" />
      </div>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  )
}

export default function TravelSuggest() {
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [estimatedTime, setEstimatedTime] = useState<number | null>(null)
  const [remainingTime, setRemainingTime] = useState<number | null>(null)
  const [progress, setProgress] = useState(0)
  const [destinationPhotos, setDestinationPhotos] = useState<string[]>([])
  const [showPhotos, setShowPhotos] = useState(false)
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const startTimeRef = useRef<number>(0)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const [formData, setFormData] = useState<FormData>({ destination: '', days: '', date: '', budget: '', people: '1' })

  // 加载历史记录
  useEffect(() => {
    const saved = localStorage.getItem('travel-suggest-history')
    if (saved) {
      try {
        setHistory(JSON.parse(saved))
      } catch (e) {}
    }
  }, [])

  // 保存到历史记录
  const saveToHistory = (data: FormData, result: string) => {
    const item: HistoryItem = {
      id: Date.now().toString(),
      destination: data.destination,
      days: data.days,
      date: data.date,
      budget: data.budget,
      people: data.people,
      result,
      createdAt: Date.now()
    }
    const newHistory = [item, ...history].slice(0, 20) // 最多保留20条
    setHistory(newHistory)
    localStorage.setItem('travel-suggest-history', JSON.stringify(newHistory))
  }

  // 从历史恢复
  const restoreFromHistory = (item: HistoryItem) => {
    setFormData({
      destination: item.destination,
      days: item.days,
      date: item.date,
      budget: item.budget,
      people: item.people
    })
    setResult(item.result)
    setShowHistory(false)
  }

  // 删除历史记录
  const deleteHistory = (id: string) => {
    const newHistory = history.filter(h => h.id !== id)
    setHistory(newHistory)
    localStorage.setItem('travel-suggest-history', JSON.stringify(newHistory))
  }

  const fetchDestinationPhotos = async (destination: string) => {
    const defaultKey = Object.keys(DEFAULT_PHOTOS).find(key => destination.includes(key))
    if (defaultKey) {
      setDestinationPhotos(DEFAULT_PHOTOS[defaultKey])
      return
    }
    try {
      const res = await fetch(`/api/poi/search?keyword=${encodeURIComponent(destination)}&city=${encodeURIComponent(destination)}`)
      const data = await res.json()
      if (data.pois && data.pois.length > 0) {
        setDestinationPhotos(FALLBACK_PHOTOS)
      }
    } catch (error) {
      setDestinationPhotos(FALLBACK_PHOTOS)
    }
  }

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [])

  useEffect(() => {
    if (loading && estimatedTime && startTimeRef.current) {
      timerRef.current = setInterval(() => {
        const elapsed = (Date.now() - startTimeRef.current) / 1000
        const remaining = Math.max(0, Math.ceil(estimatedTime - elapsed))
        setRemainingTime(remaining)
        const p = Math.min(90, (elapsed / estimatedTime) * 100)
        setProgress(p)
      }, 1000)
    } else if (!loading) {
      if (timerRef.current) clearInterval(timerRef.current)
      setRemainingTime(null)
      setProgress(0)
    }
  }, [loading, estimatedTime])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const onSubmit = async (e: React.FormEvent, retry: boolean = false) => {
    e.preventDefault()
    setLoading(true)
    setResult('')
    setError(null)
    setProgress(0)
    startTimeRef.current = Date.now()

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'travel-suggest', ...formData }),
      })

      if (!res.ok) throw new Error('请求失败')

      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      if (!reader) throw new Error('无法读取响应')

      let fullResult = ''

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
                fullResult += data.content
                setResult(fullResult)
                setProgress(95)
              } else if (data.type === 'done') {
                setProgress(100)
                if (fullResult) saveToHistory(formData, fullResult)
              } else if (data.type === 'error') {
                setError(data.message || '生成失败')
              }
            } catch (e) {}
          }
        }
      }
    } catch (error: any) {
      setError(error.message || '请求失败，请检查网络')
    }
    setLoading(false)
    setRemainingTime(null)

    if (formData.destination && result) {
      await fetchDestinationPhotos(formData.destination)
      setShowPhotos(true)
    }
  }

  const copyResult = (text: string = filteredResult) => {
    navigator.clipboard.writeText(text)
    alert('已复制到剪贴板')
  }

  const filterThinking = (text: string): string => {
    return text
      .replace(/^(让我想想|让我考虑一下|让我分析一下|首先|其次|再次|最后|当然|其实|实际上|简单分析一下|我们来想想|根据|按照|基于).*?[\n，。,.]/gm, '')
      .replace(/\[?(思考|分析|推理|计算)中[^\]]*\]?/gi, '')
      .replace(/^[\s,.，,.]+/gm, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  }

  const filteredResult = filterThinking(result)

  // 格式化时间
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Link href="/" className="inline-flex items-center text-gray-600 hover:text-blue-600">
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回首页
          </Link>
          <button onClick={() => setShowHistory(!showHistory)} className="text-gray-500 hover:text-blue-600 flex items-center gap-1 text-sm">
            <History className="w-4 h-4" />
            历史记录
          </button>
        </div>

        {/* 历史记录面板 */}
        {showHistory && history.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
            <h3 className="font-medium mb-3">📜 历史记录</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {history.map(item => (
                <div key={item.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg hover:bg-gray-100">
                  <div className="flex-1 cursor-pointer" onClick={() => restoreFromHistory(item)}>
                    <div className="text-sm font-medium">{item.destination} · {item.days}天</div>
                    <div className="text-xs text-gray-500">{formatTime(item.createdAt)}</div>
                  </div>
                  <button onClick={() => deleteHistory(item.id)} className="text-gray-400 hover:text-red-500 p-1">✕</button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h1 className="text-2xl font-bold mb-6">🌍 生成旅行建议</h1>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">目的地 *</label>
              <input name="destination" value={formData.destination} onChange={handleChange} required className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="如：日本东京、云南大理" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">出行天数 *</label>
                <input type="number" name="days" value={formData.days} onChange={handleChange} required min="1" max="30" className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500" placeholder="3" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">出发日期</label>
                <input type="date" name="date" value={formData.date} onChange={handleChange} className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">预算范围</label>
                <select name="budget" value={formData.budget} onChange={handleChange} className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500">
                  <option value="">选择预算</option>
                  <option value="2000以下">¥2000 以下</option>
                  <option value="2000-5000">¥2000-5000</option>
                  <option value="5000-10000">¥5000-10000</option>
                  <option value="10000以上">¥10000 以上</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">出行人数</label>
                <input type="number" name="people" value={formData.people} onChange={handleChange} min="1" max="10" className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500" placeholder="2" />
              </div>
            </div>

            <button type="submit" disabled={loading || !formData.destination || !formData.days} className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition flex items-center justify-center">
              {loading ? (<><Loader2 className="w-5 h-5 mr-2 animate-spin" />AI 正在生成中...</>) : ('✨ 生成旅行建议')}
            </button>
          </form>
        </div>

        {/* 错误提示 + 重试按钮 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="text-red-600 text-sm">{error}</div>
              <button onClick={(e) => onSubmit(e as any, true)} className="flex items-center gap-1 text-sm text-red-600 hover:text-red-700">
                <RefreshCw className="w-4 h-4" />
                重试
              </button>
            </div>
          </div>
        )}

        {/* 进度条 */}
        {loading && (
          <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-600 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                生成进度
              </span>
              {remainingTime !== null && (
                <span className="text-sm text-blue-600 font-medium">预计剩余 {remainingTime} 秒</span>
              )}
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        {/* 骨架屏 - 加载中显示 */}
        {loading && <ResultSkeleton />}

        {result && !loading && (
          <div className="space-y-4">
            {showPhotos && destinationPhotos.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm p-4">
                <h3 className="text-sm font-medium text-gray-500 mb-3">📸 {formData.destination} 景点预览</h3>
                <div className="grid grid-cols-3 gap-2">
                  {destinationPhotos.map((photo, index) => (
                    <div key={index} className="aspect-video rounded-lg overflow-hidden bg-gray-100">
                      <img src={photo} alt={`${formData.destination} ${index + 1}`} className="w-full h-full object-cover hover:scale-105 transition-transform" loading="lazy" />
                    </div>
                  ))}
                </div>
                <a href={`https://www.xiaohongshu.com/search_result?keyword=${encodeURIComponent(formData.destination + '旅游攻略')}`} target="_blank" rel="noopener noreferrer" className="mt-3 flex items-center justify-center gap-2 w-full py-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition text-sm">
                  <ExternalLink className="w-4 h-4" />
                  查看小红书真实攻略
                </a>
              </div>
            )}

            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">📋 旅行建议</h2>
                <button onClick={() => copyResult(filteredResult)} className="text-sm text-blue-600 hover:text-blue-700">复制结果</button>
              </div>
              <pre className="whitespace-pre-wrap text-sm text-gray-700 leading-relaxed">{filteredResult}</pre>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
