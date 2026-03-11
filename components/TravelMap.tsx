"use client"

import { useEffect, useRef, useState } from "react"

interface Spot {
  name: string
  location?: { lng: number; lat: number }
}

interface MapProps {
  spots: Spot[]
  order?: number[] // 顺序索引
}

declare global {
  interface Window {
    AMap: any
  }
}

export default function TravelMap({ spots, order = [] }: MapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const [loaded, setLoaded] = useState(false)
  const [spotLocations, setSpotLocations] = useState<Spot[]>(spots)
  const [mapError, setMapError] = useState("")

  // 加载高德地图 JS API
  useEffect(() => {
    if (window.AMap) {
      setLoaded(true)
      return
    }

    const AMAP_KEY = process.env.NEXT_PUBLIC_AMAP_KEY || "a7ea668b59f3ec1d33f0534b63b1c76a"

    const script = document.createElement("script")
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${AMAP_KEY}`
    script.async = true
    script.onload = () => setLoaded(true)
    script.onerror = () => setMapError("地图加载失败")
    document.head.appendChild(script)

    return () => {
      // 清理
    }
  }, [])

  // 初始化地图
  useEffect(() => {
    if (!loaded || !mapRef.current || !window.AMap) return

    // 如果地图已存在，先销毁
    if (mapInstance.current) {
      mapInstance.current.destroy()
    }

    const map = new window.AMap.Map(mapRef.current, {
      zoom: 11,
      center: [116.397428, 39.90923], // 默认北京
      mapStyle: "amap://styles/normal"
    })

    mapInstance.current = map

    // 清除旧的 markers
    markersRef.current.forEach(m => m.remove())
    markersRef.current = []

    // 获取景点坐标并添加标记
    if (spots.length > 0) {
      updateMarkers(spots, map)
    }

    return () => {
      if (mapInstance.current) {
        mapInstance.current.destroy()
        mapInstance.current = null
      }
    }
  }, [loaded])

  // 当景点或顺序变化时更新标记
  useEffect(() => {
    if (!loaded || !mapInstance.current || !window.AMap) return
    updateMarkers(spots, mapInstance.current)
  }, [spots, order, loaded])

  const updateMarkers = async (spotList: Spot[], map: any) => {
    if (!window.AMap || !map) return

    // 清除旧标记
    markersRef.current.forEach(m => m.remove())
    markersRef.current = []

    // 获取每个景点的坐标
    const locationsWithCoords = await Promise.all(
      spotList.map(async (spot) => {
        if (spot.location) return spot
        
        // 调用高德地理编码 API
        try {
          const response = await fetch(
            `https://restapi.amap.com/v3/place/text?key=${AMAP_KEY}&keywords=${encodeURIComponent(spot.name)}&city=全国&output=json`
          )
          const data = await response.json()
          if (data.pois && data.pois.length > 0) {
            const { location } = data.pois[0]
            const [lng, lat] = location.split(",").map(Number)
            return { ...spot, location: { lng, lat } }
          }
        } catch (e) {
          console.error("地理编码失败:", e)
        }
        return spot
      })
    )

    setSpotLocations(locationsWithCoords)

    // 添加标记
    const bounds = []
    locationsWithCoords.forEach((spot, index) => {
      if (!spot.location) return

      const [lng, lat] = [spot.location.lng, spot.location.lat]
      bounds.push([lng, lat])

      // 创建带数字的标记
      const markerContent = document.createElement("div")
      markerContent.className = "amap-marker"
      markerContent.innerHTML = `
        <div style="
          background: #2563eb;
          color: white;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 14px;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          border: 2px solid white;
        ">${order[index] !== undefined ? order[index] + 1 : index + 1}</div>
      `

      const marker = new window.AMap.Marker({
        position: [lng, lat],
        content: markerContent,
        title: spot.name,
        offset: new window.AMap.Pixel(-16, -32)
      })

      // 点击显示信息窗体
      marker.on("click", () => {
        const infoWindow = new window.AMap.InfoWindow({
          content: `<div style="padding: 8px; font-size: 14px;">
            <strong>${order[index] !== undefined ? `第${order[index] + 1}站：` : ""}${spot.name}</strong>
          </div>`,
          offset: new window.AMap.Pixel(0, -30)
        })
        infoWindow.open(map, marker.getPosition())
      })

      marker.setMap(map)
      markersRef.current.push(marker)
    })

    // 调整视野以包含所有标记
    if (bounds.length > 0) {
      if (bounds.length === 1) {
        map.setCenter(bounds[0])
        map.setZoom(14)
      } else {
        map.setFitView(bounds)
      }
    }
  }

  if (mapError) {
    return (
      <div className="w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center text-gray-500">
        {mapError}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div ref={mapRef} className="w-full h-64 rounded-lg overflow-hidden" />
      {spotLocations.some(s => !s.location) && (
        <p className="text-sm text-gray-500 text-center">正在获取景点位置...</p>
      )}
    </div>
  )
}
