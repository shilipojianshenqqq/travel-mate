'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2, MapPin, X, Navigation } from 'lucide-react'

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

type POI = {
  name: string
  address: string
  location: string
  cityname: string
  adname: string
}

type Attraction = {
  name: string
  location: string
}

type RouteInfo = {
  distance: number
  duration: number
}

declare global {
  interface Window {
    AMap: any
    AMapUI: any
  }
}

export default function RoutePlan() {
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)
  const [estimatedTime, setEstimatedTime] = useState<number | null>(null)
  const [remainingTime, setRemainingTime] = useState<number | null>(null)
  const [progress, setProgress] = useState(0)
  const [routing, setRouting] = useState(false)
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null)
  const startTimeRef = useRef<number>(0)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const [formData, setFormData] = useState<FormData>({
    city: '',
    attractions: '',
    time: '1天',
    transport: '公交'
  })
  
  const [poiSearch, setPoiSearch] = useState('')
  const [poiResults, setPoiResults] = useState<POI[]>([])
  const [showPoiResults, setShowPoiResults] = useState(false)
  const [selectedPOIs, setSelectedPOIs] = useState<Attraction[]>([])
  const poiSearchRef = useRef<HTMLDivElement>(null)
  
  const [mapLoaded, setMapLoaded] = useState(false)
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const polylineRef = useRef<any>(null)

  // 加载高德地图
  useEffect(() => {
    if (typeof window !== 'undefined' && !window.AMap) {
      const script = document.createElement('script')
      script.src = `https://webapi.amap.com/maps?v=2.0&key=5224aec249b193578bddee07d2025b5d`
      script.onload = () => setMapLoaded(true)
      document.head.appendChild(script)
    } else if (window.AMap) {
      setMapLoaded(true)
    }
  }, [])

  // 初始化地图
  useEffect(() => {
    if (mapLoaded && mapRef.current && !mapInstanceRef.current) {
      mapInstanceRef.current = new window.AMap.Map(mapRef.current, {
        zoom: 12,
        center: [116.397428, 39.90923],
        mapStyle: 'amap://styles/normal'
      })
    }
  }, [mapLoaded])

  // 加载AMapUI（用于简单标注）
  useEffect(() => {
    if (mapLoaded && typeof window !== 'undefined' && !window.AMapUI) {
      const script = document.createElement('script')
      script.src = 'https://webapi.amap.com/ui/1.1/main.js'
      script.onload = () => {}
      document.head.appendChild(script)
    }
  }, [mapLoaded])

  // 点击外部关闭POI搜索结果
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (poiSearchRef.current && !poiSearchRef.current.contains(e.target as Node)) {
        setShowPoiResults(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // 解析用户输入的景点并搜索经纬度
  const parseAndSearchPOIs = async (city: string, attractions: string) => {
    if (!city || !attractions) return []
    
    // 分割景点名称
    const names = attractions.split(/[,，]/).map(s => s.trim()).filter(Boolean)
    const pois: Attraction[] = []
    
    for (const name of names) {
      try {
        const res = await fetch(`/api/poi/search?keyword=${encodeURIComponent(name)}&city=${encodeURIComponent(city)}`)
        const data = await res.json()
        if (data.pois && data.pois.length > 0) {
          // 取第一个搜索结果
          const poi = data.pois[0]
          pois.push({
            name: poi.name,
            location: poi.location
          })
        }
      } catch (error) {
        console.error(`搜索 ${name} 失败:`, error)
      }
    }
    
    return pois
  }

  // 更新地图标记和路线
  useEffect(() => {
    if (!mapInstanceRef.current) return

    // 清除旧标记和路线
    markersRef.current.forEach(marker => marker.setMap(null))
    markersRef.current = []
    if (polylineRef.current) {
      polylineRef.current.setMap(null)
      polylineRef.current = null
    }

    // 如果没有景点，不处理
    if (selectedPOIs.length === 0) return

    // 添加新标记
    selectedPOIs.forEach((poi, index) => {
      if (!poi.location) return
      const [lng, lat] = poi.location.split(',').map(Number)
      
      // 创建信息窗体内容
      const infoContent = `
        <div style="padding: 8px; min-width: 120px;">
          <div style="font-weight: bold; margin-bottom: 4px;">${poi.name}</div>
          <div style="font-size: 12px; color: #666;">点击查看详情</div>
        </div>
      `
      
      const marker = new window.AMap.Marker({
        position: [lng, lat],
        title: poi.name,
        content: `
          <div style="
            width: 28px;
            height: 28px;
            background: #00C853;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: 12px;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
            border: 2px solid white;
          ">${index + 1}</div>
        `,
        offset: new window.AMap.Pixel(-14, -14)
      })
      
      marker.setMap(mapInstanceRef.current)
      markersRef.current.push(marker)

      // 点击标记显示信息窗体
      marker.on('click', () => {
        const infoWindow = new window.AMap.InfoWindow({
          content: infoContent,
          offset: new window.AMap.Pixel(0, -20)
        })
        infoWindow.open(mapInstanceRef.current, [lng, lat])
      })
    })

    // 调整视野
    if (selectedPOIs.length > 1) {
      mapInstanceRef.current.setFitView(markersRef.current.slice(0, selectedPOIs.length))
    } else if (selectedPOIs.length === 1) {
      mapInstanceRef.current.setCenter(selectedPOIs[0].location.split(','))
    }
  }, [selectedPOIs])

  // 搜索POI
  const searchPOI = async (keyword: string) => {
    if (!keyword.trim()) {
      setPoiResults([])
      return
    }
    
    try {
      const res = await fetch(`/api/poi/search?keyword=${encodeURIComponent(keyword)}&city=${encodeURIComponent(formData.city)}`)
      const data = await res.json()
      if (data.pois) {
        setPoiResults(data.pois)
        setShowPoiResults(true)
      }
    } catch (error) {
      console.error('POI search error:', error)
    }
  }

  // 选择POI
  const selectPOI = (poi: POI) => {
    const newAttraction: Attraction = {
      name: poi.name,
      location: poi.location
    }
    
    if (!selectedPOIs.find(p => p.name === poi.name)) {
      const newPOIs = [...selectedPOIs, newAttraction]
      setSelectedPOIs(newPOIs)
      setFormData({ ...formData, attractions: newPOIs.map(p => p.name).join('，') })
      
      // 如果有2个以上景点，规划路线
      if (newPOIs.length >= 2) {
        planRoute(newPOIs)
      }
    }
    
    setPoiSearch('')
    setPoiResults([])
    setShowPoiResults(false)
  }

  // 移除POI
  const removePOI = (index: number) => {
    const newPOIs = selectedPOIs.filter((_, i) => i !== index)
    setSelectedPOIs(newPOIs)
    setFormData({ ...formData, attractions: newPOIs.map(p => p.name).join('，') })
    setRouteInfo(null)
    
    // 清除路线
    if (polylineRef.current) {
      polylineRef.current.setMap(null)
      polylineRef.current = null
    }
    
    // 重新规划路线
    if (newPOIs.length >= 2) {
      planRoute(newPOIs)
    }
  }

  // 规划驾车路线
  const planRoute = async (pois: Attraction[]) => {
    if (pois.length < 2) return
    
    setRouting(true)
    setRouteInfo(null)
    
    try {
      // 使用第一和最后一个景点作为起点和终点
      const origin = pois[0].location
      const destination = pois[pois.length - 1].location
      
      // 如果有中间点，需要分段规划
      if (pois.length > 2) {
        // 简化：只显示起终点之间的路线
        // 实际应该用驾车路径规划返回的path来画线
      }
      
      const res = await fetch(`/api/poi/route?origin=${origin}&destination=${destination}`)
      const data = await res.json()
      
      if (data.route) {
        setRouteInfo({
          distance: data.distance,
          duration: data.duration
        })
        
        // 获取路径坐标并画线
        if (data.route?.paths?.[0]?.steps) {
          const pathCoordinates: [number, number][] = []
          
          // 解析每一步的路径
          for (const step of data.route.paths[0].steps) {
            const stepPath = step.polyline.split(';')
            for (const coord of stepPath) {
              const [lng, lat] = coord.split(',').map(Number)
              if (!isNaN(lng) && !isNaN(lat)) {
                pathCoordinates.push([lng, lat])
              }
            }
          }
          
          if (pathCoordinates.length > 0) {
            // 画路线
            polylineRef.current = new window.AMap.Polyline({
              path: pathCoordinates,
              strokeColor: '#00C853',
              strokeWeight: 5,
              strokeOpacity: 0.8
            })
            polylineRef.current.setMap(mapInstanceRef.current)
            mapInstanceRef.current.setFitView(polylineRef.current)
          }
        }
      }
    } catch (error) {
      console.error('Route planning error:', error)
    }
    
    setRouting(false)
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
    const value = e.target.value
    setFormData({ ...formData, [e.target.name]: value })
    
    if (e.target.name === 'city') {
      setSelectedPOIs([])
      setRouteInfo(null)
    }
  }

  const handlePOISearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setPoiSearch(value)
    searchPOI(value)
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setResult('')
    setProgress(0)
    startTimeRef.current = Date.now()
    
    // 先解析景点并搜索经纬度，在地图上显示标记
    if (formData.city && formData.attractions) {
      console.log('开始搜索POI:', formData.city, formData.attractions)
      const pois = await parseAndSearchPOIs(formData.city, formData.attractions)
      console.log('搜索到POI:', pois)
      if (pois.length > 0) {
        setSelectedPOIs(pois)
        // 如果有多个景点，规划路线
        if (pois.length >= 2) {
          planRoute(pois)
        }
      } else {
        console.warn('未搜索到POI，使用备选方案')
      }
    }
    
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
            } catch (e) {}
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

  // 格式化距离和时间
  const formatRouteInfo = (info: RouteInfo) => {
    const distance = info.distance >= 1000 
      ? `${(info.distance / 1000).toFixed(1)} 公里` 
      : `${info.distance} 米`
    const minutes = Math.ceil(info.duration / 60)
    return `${distance} / 约 ${minutes} 分钟`
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 pb-80">
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

            {/* POI搜索 */}
            <div ref={poiSearchRef} className="relative">
              <label className="block text-sm font-medium mb-1">搜索景点</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  value={poiSearch}
                  onChange={handlePOISearchChange}
                  onFocus={() => poiResults.length > 0 && setShowPoiResults(true)}
                  className="w-full border border-gray-300 rounded-lg pl-10 pr-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="搜索景点名称，自动补全"
                />
              </div>
              
              {showPoiResults && poiResults.length > 0 && (
                <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {poiResults.map((poi, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => selectPOI(poi)}
                      className="w-full text-left px-4 py-2 hover:bg-gray-50 border-b border-gray-100 last:border-0"
                    >
                      <div className="font-medium text-sm">{poi.name}</div>
                      <div className="text-xs text-gray-500">{poi.address || poi.adname}</div>
                    </button>
                  ))}
                </div>
              )}
              
              {selectedPOIs.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedPOIs.map((poi, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-sm"
                    >
                      {index + 1}. {poi.name}
                      <button
                        type="button"
                        onClick={() => removePOI(index)}
                        className="hover:text-green-900"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">想去的景点 *</label>
              <textarea
                name="attractions"
                value={formData.attractions}
                onChange={handleChange}
                required
                rows={2}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="用逗号分隔，或使用上方搜索添加"
              />
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
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
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

      {/* 地图 - 固定在底部 */}
      <div className="fixed bottom-0 left-0 right-0 h-72 bg-white border-t border-gray-200 shadow-lg z-20">
        {/* 路线信息 */}
        {routeInfo && (
          <div className="absolute top-2 left-2 z-10 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-lg shadow text-sm flex items-center gap-2">
            <Navigation className="w-4 h-4 text-green-600" />
            <span className="font-medium">{formatRouteInfo(routeInfo)}</span>
          </div>
        )}
        
        {/* 加载中 */}
        {routing && (
          <div className="absolute top-2 right-2 z-10 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-lg shadow text-sm flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>规划路线中...</span>
          </div>
        )}
        
        <div ref={mapRef} className="w-full h-full" />
      </div>
    </div>
  )
}
