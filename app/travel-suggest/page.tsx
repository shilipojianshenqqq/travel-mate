'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2, ExternalLink, MapPin } from 'lucide-react'

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

type POI = {
  name: string
  address: string
  location: string
  photos?: string[]
}

// 预设景点图片（当 API 无法获取时使用）
const DEFAULT_PHOTOS: Record<string, string[]> = {
  '北京': [
    'https://images.unsplash.com/photo-1599571234909-29ed5d1321d6?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1508804185872-d7badad00f7d?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1532630571098-79c3d7244e5e?w=400&h=300&fit=crop'
  ],
  '上海': [
    'https://images.unsplash.com/photo-1474181487882-5abf3f0ba6c2?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1548919973-5cef591cdbc9?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1553913861-c0fddf2619ee?w=400&h=300&fit=crop'
  ],
  '云南': [
    'https://images.unsplash.com/photo-1580810453078-3e8eb385a2a4?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1528181304800-259b08848526?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1585983633883-3995f9a2880f?w=400&h=300&fit=crop'
  ],
  '亚庇': [
    'https://images.unsplash.com/photo-1512100356356-de1b84283e18?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1544550581-5f7ceaf7f992?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1590559899731-a382839e5549?w=400&h=300&fit=crop'
  ],
  '沙巴': [
    'https://images.unsplash.com/photo-1512100356356-de1b84283e18?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1544550581-5f7ceaf7f992?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1590559899731-a382839e5549?w=400&h=300&fit=crop'
  ],
  '马来西亚': [
    'https://images.unsplash.com/photo-1512100356356-de1b84283e18?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1544550581-5f7ceaf7f992?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1590559899731-a382839e5549?w=400&h=300&fit=crop'
  ],
  '日本': [
    'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1524413840807-0c3cb6fa808d?w=400&h=300&fit=crop'
  ],
  '泰国': [
    'https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1528181304800-259b08848526?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=400&h=300&fit=crop'
  ],
  '三亚': [
    'https://images.unsplash.com/photo-1503131381078-75a5e0b0f67c?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1512113569142-8a60fccc7bfec?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop'
  ]
}

// 默认图片
const FALLBACK_PHOTOS = [
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=300&fit=crop'
]

export default function TravelSuggest() {
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)
  const [estimatedTime, setEstimatedTime] = useState<number | null>(null)
  const [remainingTime, setRemainingTime] = useState<number | null>(null)
  const [progress, setProgress] = useState(0)
  const [destinationPhotos, setDestinationPhotos] = useState<string[]>([])
  const [showPhotos, setShowPhotos] = useState(false)
  const startTimeRef = useRef<number>(0)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const [formData, setFormData] = useState<FormData>({
    destination: '',
    days: '',
    date: '',
    budget: '',
    people: '1'
  })

  // 获取目的地图片
  const fetchDestinationPhotos = async (destination: string) => {
    // 先尝试从预设获取
    const defaultKey = Object.keys(DEFAULT_PHOTOS).find(key => 
      destination.includes(key)
    )
    if (defaultKey) {
      setDestinationPhotos(DEFAULT_PHOTOS[defaultKey])
      return
    }

    // 使用高德 API 搜索景点
    try {
      const res = await fetch(`/api/poi/search?keyword=${encodeURIComponent(destination)}&city=${encodeURIComponent(destination)}`)
      const data = await res.json()
      if (data.pois && data.pois.length > 0) {
        // 使用默认图片，因为高德免费 API 不提供图片
        setDestinationPhotos(FALLBACK_PHOTOS)
      }
    } catch (error) {
      console.error('获取图片失败:', error)
      setDestinationPhotos(FALLBACK_PHOTOS)
    }
  }

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
    
    // 获取目的地图片
    if (formData.destination) {
      await fetchDestinationPhotos(formData.destination)
      setShowPhotos(true)
    }
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
          <div className="space-y-4">
            {/* 目的地图片展示 */}
            {showPhotos && destinationPhotos.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm p-4">
                <h3 className="text-sm font-medium text-gray-500 mb-3">📸 {formData.destination} 景点预览</h3>
                <div className="grid grid-cols-3 gap-2">
                  {destinationPhotos.map((photo, index) => (
                    <div key={index} className="aspect-video rounded-lg overflow-hidden bg-gray-100">
                      <img 
                        src={photo} 
                        alt={`${formData.destination} ${index + 1}`}
                        className="w-full h-full object-cover hover:scale-105 transition-transform"
                        loading="lazy"
                      />
                    </div>
                  ))}
                </div>
                
                {/* 小红书攻略跳转 */}
                <a
                  href={`https://www.xiaohongshu.com/search_result?keyword=${encodeURIComponent(formData.destination + '旅游攻略')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 flex items-center justify-center gap-2 w-full py-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition text-sm"
                >
                  <ExternalLink className="w-4 h-4" />
                  查看小红书真实攻略
                </a>
              </div>
            )}

            {/* 旅行建议内容 */}
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
          </div>
        )}
      </div>
    </div>
  )
}
