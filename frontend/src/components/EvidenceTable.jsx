const WEIGHT_MAP = {
  Gun: 25, Blood: 20, Knife: 18, 'Suspicious Object': 15,
  'Broken Glass': 10, Mask: 8, Gloves: 8, Vehicle: 5,
  'Mobile Phone': 3, Bag: 3, Person: 2,
}

const RISK_DOT = {
  25: 'bg-red-500', 20: 'bg-red-400', 18: 'bg-orange-500',
  15: 'bg-orange-400', 10: 'bg-yellow-500', 8: 'bg-yellow-400',
  5: 'bg-blue-400', 3: 'bg-green-400', 2: 'bg-gray-400',
}

export default function EvidenceTable({ evidence = [] }) {
  if (!evidence.length) {
    return (
      <div className="text-center py-8 text-gray-400">
        <p className="text-sm">No evidence objects detected</p>
      </div>
    )
  }

  const sorted = [...evidence].sort((a, b) => (WEIGHT_MAP[b.class_name] || 0) - (WEIGHT_MAP[a.class_name] || 0))

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Evidence Type</th>
            <th className="text-center py-2.5 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Count</th>
            <th className="text-center py-2.5 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Confidence</th>
            <th className="text-center py-2.5 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Risk Weight</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {sorted.map((item) => {
            const weight = WEIGHT_MAP[item.class_name] || 1
            const dotClass = RISK_DOT[weight] || 'bg-gray-400'
            return (
              <tr key={item.class_name} className="hover:bg-gray-50 transition-colors">
                <td className="py-2.5 px-3">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${dotClass}`} />
                    <span className="font-medium text-gray-800">{item.class_name}</span>
                  </div>
                </td>
                <td className="py-2.5 px-3 text-center font-semibold text-gray-700">{item.count}</td>
                <td className="py-2.5 px-3 text-center text-gray-600">
                  {(item.confidence * 100).toFixed(1)}%
                </td>
                <td className="py-2.5 px-3 text-center">
                  <span className="font-bold text-gray-700">{weight}</span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
