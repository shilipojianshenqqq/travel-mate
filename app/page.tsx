import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-b from-blue-50 to-white">
      <div className="text-center mb-12">
        <h1 className="text-5xl font-bold mb-4 text-blue-600">TravelMate</h1>
        <p className="text-xl text-gray-600">你的智能旅游规划助手</p>
      </div>
      
      <div className="flex flex-col sm:flex-row gap-6">
        <Link 
          href="/travel-suggest"
          className="px-8 py-6 bg-blue-600 text-white text-lg rounded-xl hover:bg-blue-700 transition shadow-lg"
        >
          🌍 生成旅行建议
        </Link>
        <Link 
          href="/route-plan"
          className="px-8 py-6 bg-green-600 text-white text-lg rounded-xl hover:bg-green-700 transition shadow-lg"
        >
          🗺️ 规划景点路线
        </Link>
      </div>

      <p className="mt-12 text-gray-400 text-sm">
        基于 AI 的智能旅游规划
      </p>
    </main>
  )
}
