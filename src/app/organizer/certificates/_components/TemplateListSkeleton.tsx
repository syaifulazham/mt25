'use client'

export function TemplateListSkeleton() {
  return (
    <div>
      {/* Search and filter controls skeleton */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="flex-1">
          <div className="w-full h-10 bg-gray-200 animate-pulse rounded-lg"></div>
        </div>
        
        <div>
          <div className="w-40 h-10 bg-gray-200 animate-pulse rounded-lg"></div>
        </div>
      </div>

      {/* Templates table skeleton */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Template</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {[...Array(5)].map((_, index) => (
              <tr key={index}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10 bg-gray-200 animate-pulse rounded-md"></div>
                    <div className="ml-4">
                      <div className="h-4 bg-gray-200 animate-pulse rounded w-32 mb-2"></div>
                      <div className="h-3 bg-gray-200 animate-pulse rounded w-24"></div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="h-4 bg-gray-200 animate-pulse rounded w-24 mb-2"></div>
                  <div className="h-3 bg-gray-200 animate-pulse rounded w-16"></div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="h-5 bg-gray-200 animate-pulse rounded w-16"></div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex space-x-2">
                    <div className="h-4 bg-gray-200 animate-pulse rounded w-12"></div>
                    <div className="h-4 bg-gray-200 animate-pulse rounded w-12"></div>
                    <div className="h-4 bg-gray-200 animate-pulse rounded w-16"></div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination skeleton */}
      <div className="flex justify-between items-center mt-6">
        <div className="h-4 bg-gray-200 animate-pulse rounded w-40"></div>
        <div className="flex space-x-1">
          <div className="h-8 bg-gray-200 animate-pulse rounded w-20"></div>
          <div className="h-8 bg-gray-200 animate-pulse rounded w-16"></div>
        </div>
      </div>
    </div>
  )
}
