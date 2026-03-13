import { NextResponse } from 'next/server'

// 高德地图 Web服务API Key
const AMAP_KEY = process.env.AMAP_KEY || 'a7ea668b59f3ec1d33f0534b63b1c76a'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const keyword = searchParams.get('keyword')
  const city = searchParams.get('city') || ''

  if (!keyword) {
    return NextResponse.json({ pois: [] }, { status: 400 })
  }

  try {
    const url = `https://restapi.amap.com/v3/place/text?keywords=${encodeURIComponent(keyword)}&city=${encodeURIComponent(city)}&offset=10&page=1&key=${AMAP_KEY}&extensions=all`
    
    const response = await fetch(url)
    const data = await response.json()

    if (data.status === '1' && data.pois) {
      const pois = data.pois.map((poi: any) => ({
        name: poi.name,
        address: poi.address,
        location: poi.location, // 经纬度，格式：lng,lat
        type: poi.type,
        cityname: poi.cityname,
        adname: poi.adname
      }))
      return NextResponse.json({ pois })
    } else {
      return NextResponse.json({ pois: [], error: data.info || '搜索失败' })
    }
  } catch (error: any) {
    console.error('POI Search Error:', error)
    return NextResponse.json({ pois: [], error: error.message }, { status: 500 })
  }
}
