import { NextResponse } from 'next/server'

// 高德地图 Web服务API Key
const AMAP_KEY = process.env.AMAP_KEY || 'a7ea668b59f3ec1d33f0534b63b1c76a'

// 驾车路径规划
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const origin = searchParams.get('origin') // 起点经纬度 lng,lat
  const destination = searchParams.get('destination') // 终点经纬度 lng,lat
  const strategy = searchParams.get('strategy') || '0' // 路径策略

  if (!origin || !destination) {
    return NextResponse.json({ route: null, error: '缺少起点或终点' }, { status: 400 })
  }

  try {
    // 驾车规划API
    const url = `https://restapi.amap.com/v3/direction/driving?origin=${origin}&destination=${destination}&strategy=${strategy}&key=${AMAP_KEY}`
    
    const response = await fetch(url)
    const data = await response.json()

    if (data.status === '1' && data.route) {
      const path = data.route.paths?.[0]
      if (path) {
        return NextResponse.json({
          distance: path.distance, // 米
          duration: path.duration, // 秒
          steps: path.steps?.map((step: any) => ({
            instruction: step.instruction,
            distance: step.distance,
            road: step.road
          }))
        })
      }
    } else {
      return NextResponse.json({ route: null, error: data.info || '规划失败' })
    }
  } catch (error: any) {
    console.error('Route Planning Error:', error)
    return NextResponse.json({ route: null, error: error.message }, { status: 500 })
  }
}
