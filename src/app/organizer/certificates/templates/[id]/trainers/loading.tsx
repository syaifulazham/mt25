export default function Loading() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
          <div className="h-4 w-32 bg-gray-200 animate-pulse rounded"></div>
          <span>/</span>
          <div className="h-4 w-40 bg-gray-200 animate-pulse rounded"></div>
        </div>
        <div className="h-8 w-64 bg-gray-200 animate-pulse rounded mb-2"></div>
        <div className="h-5 w-96 bg-gray-200 animate-pulse rounded"></div>
      </div>

      {/* Stats Cards Loading */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="h-4 w-24 bg-gray-200 animate-pulse rounded mb-2"></div>
                <div className="h-8 w-16 bg-gray-200 animate-pulse rounded"></div>
              </div>
              <div className="h-12 w-12 bg-gray-100 rounded-full animate-pulse"></div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters Loading */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <div className="flex-1">
            <div className="h-10 bg-gray-200 animate-pulse rounded"></div>
          </div>
          <div>
            <div className="h-10 w-40 bg-gray-200 animate-pulse rounded"></div>
          </div>
        </div>
        <div className="h-5 w-48 bg-gray-200 animate-pulse rounded"></div>
      </div>

      {/* Table Loading */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3">
                  <div className="h-4 w-4 bg-gray-200 animate-pulse rounded"></div>
                </th>
                <th className="px-6 py-3">
                  <div className="h-4 w-32 bg-gray-200 animate-pulse rounded"></div>
                </th>
                <th className="px-6 py-3">
                  <div className="h-4 w-24 bg-gray-200 animate-pulse rounded"></div>
                </th>
                <th className="px-6 py-3">
                  <div className="h-4 w-24 bg-gray-200 animate-pulse rounded"></div>
                </th>
                <th className="px-6 py-3">
                  <div className="h-4 w-20 bg-gray-200 animate-pulse rounded"></div>
                </th>
                <th className="px-6 py-3">
                  <div className="h-4 w-20 bg-gray-200 animate-pulse rounded"></div>
                </th>
                <th className="px-6 py-3">
                  <div className="h-4 w-24 bg-gray-200 animate-pulse rounded"></div>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="h-4 w-4 bg-gray-200 animate-pulse rounded"></div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="h-10 w-10 bg-gray-200 animate-pulse rounded-full"></div>
                      <div className="ml-4 space-y-2">
                        <div className="h-4 w-32 bg-gray-200 animate-pulse rounded"></div>
                        <div className="h-3 w-24 bg-gray-200 animate-pulse rounded"></div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-2">
                      <div className="h-4 w-40 bg-gray-200 animate-pulse rounded"></div>
                      <div className="h-4 w-32 bg-gray-200 animate-pulse rounded"></div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-2">
                      <div className="h-4 w-36 bg-gray-200 animate-pulse rounded"></div>
                      <div className="h-3 w-28 bg-gray-200 animate-pulse rounded"></div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-2">
                      <div className="h-4 w-32 bg-gray-200 animate-pulse rounded"></div>
                      <div className="h-3 w-24 bg-gray-200 animate-pulse rounded"></div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-6 w-20 bg-gray-200 animate-pulse rounded-full"></div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-4 w-24 bg-gray-200 animate-pulse rounded"></div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Loading message */}
      <div className="fixed bottom-4 right-4 bg-blue-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3">
        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span className="font-medium">Loading trainers data...</span>
      </div>
    </div>
  )
}
