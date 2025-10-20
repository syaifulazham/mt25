'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Trophy, FileText, Plus, Loader2, CheckCircle } from 'lucide-react'

interface TeamRanking {
  rank: number
  attendanceTeamId: number
  team: {
    id: number
    name: string
  } | null
  contingent: {
    id: number
    name: string
    logoUrl?: string | null
  } | null
  state: {
    id: number
    name: string
  } | null
  averageScore: number
  sessionCount: number
  contestId: number
  contestName: string
  hasCertificates?: boolean
  isAddedToFinal?: boolean
}

interface Contest {
  id: number
  contestId: number
  name: string
}

export default function WinnersCertificatesPage() {
  const params = useParams()
  const router = useRouter()
  const eventId = parseInt(params.id as string)

  const [contests, setContests] = useState<Contest[]>([])
  const [selectedContest, setSelectedContest] = useState<number | null>(null)
  const [teamRankings, setTeamRankings] = useState<TeamRanking[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingRankings, setIsLoadingRankings] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [splitByState, setSplitByState] = useState(true)
  const [hasWinnerTemplates, setHasWinnerTemplates] = useState<boolean | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationResults, setGenerationResults] = useState<any>(null)
  const [showResultsModal, setShowResultsModal] = useState(false)

  // Check if winner templates exist for this event
  useEffect(() => {
    const checkWinnerTemplates = async () => {
      try {
        const response = await fetch(`/api/certificates/templates/check-winner?eventId=${eventId}`)
        if (response.ok) {
          const data = await response.json()
          setHasWinnerTemplates(data.hasTemplates)
        }
      } catch (err) {
        console.error('Failed to check winner templates:', err)
      }
    }

    checkWinnerTemplates()
  }, [eventId])

  // Fetch contests for this event
  useEffect(() => {
    const fetchContests = async () => {
      setIsLoading(true)
      try {
        const response = await fetch(`/api/judging/contests?eventId=${eventId}`)
        if (!response.ok) throw new Error('Failed to fetch contests')
        
        const data = await response.json()
        setContests(data.contests || [])
        
        // Auto-select first contest
        if (data.contests && data.contests.length > 0) {
          setSelectedContest(data.contests[0].contestId)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load contests')
      } finally {
        setIsLoading(false)
      }
    }

    fetchContests()
  }, [eventId])

  // Fetch team rankings when contest is selected
  useEffect(() => {
    if (!selectedContest) return

    const fetchRankings = async () => {
      setIsLoadingRankings(true)
      setError(null)
      
      try {
        const response = await fetch(
          `/api/events/${eventId}/judging/team-rankings?contestId=${selectedContest}`
        )
        if (!response.ok) throw new Error('Failed to fetch team rankings')
        
        const data = await response.json()
        setTeamRankings(data.rankings || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load rankings')
      } finally {
        setIsLoadingRankings(false)
      }
    }

    fetchRankings()
  }, [eventId, selectedContest])

  const handleGenerateCert = async (team: TeamRanking) => {
    if (!selectedContest) {
      alert('Please select a contest first')
      return
    }

    if (team.rank === 0) {
      alert('Cannot generate certificate for unranked team')
      return
    }

    if (!hasWinnerTemplates) {
      alert('No winner certificate templates found. Please create a template first.')
      return
    }

    const confirmed = confirm(
      `Generate winner certificates for all members of "${team.team?.name}" (Rank ${team.rank})?\n\n` +
      `Award Title: ${team.rank === 1 ? 'TEMPAT PERTAMA' : `TEMPAT KE-${team.rank}`}\n\n` +
      `Note: Existing certificates will be regenerated with updated information.`
    )

    if (!confirmed) return

    setIsGenerating(true)
    setError(null)

    try {
      const response = await fetch(`/api/events/${eventId}/judging/generate-winner-certs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attendanceTeamId: team.attendanceTeamId,
          rank: team.rank,
          contestId: selectedContest
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate certificates')
      }

      setGenerationResults(data)
      setShowResultsModal(true)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate certificates')
      alert('Error: ' + (err instanceof Error ? err.message : 'Failed to generate certificates'))
    } finally {
      setIsGenerating(false)
    }
  }

  const handleAddToFinal = async (team: TeamRanking) => {
    if (!team.team?.id) {
      alert('Invalid team data')
      return
    }

    const confirmed = confirm(
      `Add "${team.team.name}" to National Finals?\n\n` +
      `This will register the team for the national-level competition.`
    )

    if (!confirmed) return

    try {
      const response = await fetch(`/api/events/${eventId}/judging/add-to-final`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          teamId: team.team.id,
          contestId: selectedContest
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add team to finals')
      }

      // Update the team in the state to mark it as added to finals
      setTeamRankings(prevRankings => 
        prevRankings.map(t => 
          t.team?.id === team.team?.id 
            ? { ...t, isAddedToFinal: true }
            : t
        )
      )

      alert(`✓ Successfully added "${team.team.name}" to National Finals!`)
    } catch (error) {
      console.error('Failed to add team to finals:', error)
      alert(error instanceof Error ? error.message : 'Failed to add team to finals')
    }
  }

  // Group teams by state
  const groupedByState = () => {
    const groups: { [key: string]: TeamRanking[] } = {}
    
    teamRankings.forEach(team => {
      const stateName = team.state?.name || 'No State'
      if (!groups[stateName]) {
        groups[stateName] = []
      }
      groups[stateName].push(team)
    })

    // Re-rank within each state
    Object.keys(groups).forEach(stateName => {
      let stateRank = 1
      groups[stateName] = groups[stateName].map(team => ({
        ...team,
        rank: team.averageScore > 0 ? stateRank++ : 0
      }))
    })

    return groups
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8">
      {/* Header */}
      <div className="mb-6">
        <Link
          href={`/organizer/events/${eventId}/attendance`}
          className="inline-flex items-center text-blue-600 hover:underline mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Event Dashboard
        </Link>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Trophy className="h-8 w-8 text-yellow-500" />
          Winners & Certificate Management
        </h1>
        <p className="text-gray-600 mt-2">
          Generate certificates for winners and manage final results
        </p>
      </div>

      {/* Winner Templates Status */}
      {hasWinnerTemplates !== null && (
        <div className={`mb-6 p-4 rounded-lg border-l-4 ${
          hasWinnerTemplates 
            ? 'bg-green-50 border-green-500' 
            : 'bg-yellow-50 border-yellow-500'
        }`}>
          <div className="flex items-start">
            <div className="flex-shrink-0">
              {hasWinnerTemplates ? (
                <svg className="h-5 w-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="h-5 w-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <div className="ml-3">
              <h3 className={`text-sm font-medium ${
                hasWinnerTemplates ? 'text-green-800' : 'text-yellow-800'
              }`}>
                {hasWinnerTemplates 
                  ? 'Winner Certificate Templates Available' 
                  : 'No Winner Certificate Templates'
                }
              </h3>
              <p className={`mt-1 text-sm ${
                hasWinnerTemplates ? 'text-green-700' : 'text-yellow-700'
              }`}>
                {hasWinnerTemplates 
                  ? 'Certificate templates for EVENT_WINNER are configured for this event. You can generate certificates for winners.'
                  : 'No certificate templates for EVENT_WINNER found. Please create winner certificate templates before generating certificates.'
                }
              </p>
              {!hasWinnerTemplates && (
                <Link 
                  href="/organizer/certificates" 
                  className="mt-2 inline-flex items-center text-sm font-medium text-yellow-800 hover:text-yellow-900 underline"
                >
                  Create Winner Template →
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Contest Selector */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Contest
        </label>
        <select
          value={selectedContest || ''}
          onChange={(e) => setSelectedContest(parseInt(e.target.value))}
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">-- Select a contest --</option>
          {contests.map((contest) => (
            <option key={contest.contestId} value={contest.contestId}>
              {contest.name}
            </option>
          ))}
        </select>
      </div>

      {/* Team Rankings Table */}
      {selectedContest && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold">Team Rankings</h2>
                <p className="text-sm text-gray-600 mt-1">
                  {teamRankings.length} teams ranked
                </p>
              </div>
              
              {/* Split by State Toggle */}
              <button
                onClick={() => setSplitByState(!splitByState)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  splitByState
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {splitByState ? 'Show All Rankings' : 'Split by State'}
              </button>
            </div>
          </div>

          {isLoadingRankings ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : teamRankings.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No team rankings available for this contest
            </div>
          ) : splitByState ? (
            // Split by State View
            <div className="space-y-6 p-6">
              {Object.entries(groupedByState()).map(([stateName, teams]) => (
                <div key={stateName} className="border rounded-lg overflow-hidden">
                  <div className="bg-blue-50 px-6 py-3 border-b">
                    <h3 className="text-lg font-semibold text-blue-900">{stateName}</h3>
                    <p className="text-sm text-blue-700">{teams.length} teams</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Rank
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Team
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Contingent
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Avg Score
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {teams.map((team) => (
                          <tr
                            key={team.attendanceTeamId}
                            className={
                              team.rank <= 3 && team.rank > 0
                                ? team.rank === 1
                                  ? 'bg-yellow-50'
                                  : team.rank === 2
                                  ? 'bg-gray-50'
                                  : 'bg-orange-50'
                                : ''
                            }
                          >
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                {team.rank === 1 && (
                                  <Trophy className="h-5 w-5 text-yellow-500 mr-2" />
                                )}
                                {team.rank === 2 && (
                                  <Trophy className="h-5 w-5 text-gray-400 mr-2" />
                                )}
                                {team.rank === 3 && (
                                  <Trophy className="h-5 w-5 text-orange-600 mr-2" />
                                )}
                                <span className="text-lg font-bold">{team.rank || '-'}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm font-medium text-gray-900 flex items-center gap-2">
                                {team.team?.name || 'N/A'}
                                {team.hasCertificates && (
                                  <span title="Certificates generated" className="inline-flex">
                                    <CheckCircle className="h-4 w-4 text-green-600" />
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm text-gray-900">
                                {team.contingent?.name || 'N/A'}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-semibold text-blue-600">
                                {team.averageScore.toFixed(2)}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleGenerateCert(team)}
                                  className="inline-flex items-center px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded hover:bg-green-700 transition-colors"
                                >
                                  <FileText className="h-3 w-3 mr-1" />
                                  Generate Cert
                                </button>
                                {!team.isAddedToFinal && (
                                  <button
                                    onClick={() => handleAddToFinal(team)}
                                    className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 transition-colors"
                                  >
                                    <Plus className="h-3 w-3 mr-1" />
                                    Add to Final
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // All Rankings View
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rank
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Team
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contingent
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      State
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Avg Score
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {teamRankings.map((team) => (
                    <tr
                      key={team.attendanceTeamId}
                      className={
                        team.rank <= 3
                          ? team.rank === 1
                            ? 'bg-yellow-50'
                            : team.rank === 2
                            ? 'bg-gray-50'
                            : 'bg-orange-50'
                          : ''
                      }
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {team.rank === 1 && (
                            <Trophy className="h-5 w-5 text-yellow-500 mr-2" />
                          )}
                          {team.rank === 2 && (
                            <Trophy className="h-5 w-5 text-gray-400 mr-2" />
                          )}
                          {team.rank === 3 && (
                            <Trophy className="h-5 w-5 text-orange-600 mr-2" />
                          )}
                          <span className="text-lg font-bold">{team.rank}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900 flex items-center gap-2">
                          {team.team?.name || 'N/A'}
                          {team.hasCertificates && (
                            <span title="Certificates generated" className="inline-flex">
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {team.contingent?.name || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {team.state?.name || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-blue-600">
                          {team.averageScore.toFixed(2)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {team.sessionCount} sessions
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleGenerateCert(team)}
                            className="inline-flex items-center px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded hover:bg-green-700 transition-colors"
                          >
                            <FileText className="h-3 w-3 mr-1" />
                            Generate Cert
                          </button>
                          {!team.isAddedToFinal && (
                            <button
                              onClick={() => handleAddToFinal(team)}
                              className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 transition-colors"
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Add to Final
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Certificate Generation Results Modal */}
      {showResultsModal && generationResults && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <FileText className="h-6 w-6" />
              Certificate Generation Results
            </h2>
            
            <div className="mb-4 p-4 bg-blue-50 rounded-lg">
              <p className="font-semibold">{generationResults.teamName}</p>
              <p className="text-sm text-gray-600">Rank {generationResults.rank}: {generationResults.awardTitle}</p>
            </div>

            <div className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-100 p-3 rounded">
                  <p className="text-sm text-gray-600">Total Members</p>
                  <p className="text-2xl font-bold">{generationResults.results.total}</p>
                </div>
                <div className="bg-green-100 p-3 rounded">
                  <p className="text-sm text-gray-600">Generated</p>
                  <p className="text-2xl font-bold text-green-600">{generationResults.results.success.length}</p>
                </div>
                <div className="bg-red-100 p-3 rounded">
                  <p className="text-sm text-gray-600">Failed</p>
                  <p className="text-2xl font-bold text-red-600">{generationResults.results.failed.length}</p>
                </div>
              </div>

              {/* Successful Generations */}
              {generationResults.results.success.length > 0 && (
                <div>
                  <h3 className="font-semibold text-green-700 mb-2">✓ Successfully Processed</h3>
                  <div className="bg-green-50 rounded-lg p-3 max-h-48 overflow-y-auto">
                    <ul className="space-y-2">
                      {generationResults.results.success.map((result: any, index: number) => (
                        <li key={index} className="text-sm flex items-center justify-between">
                          <div>
                            <span className="font-medium">{result.member}</span>
                            <span className="text-gray-600 text-xs ml-2">({result.serialNumber})</span>
                          </div>
                          {result.action && (
                            <span className={`text-xs px-2 py-0.5 rounded ${
                              result.action === 'created' 
                                ? 'bg-blue-100 text-blue-700' 
                                : 'bg-amber-100 text-amber-700'
                            }`}>
                              {result.action === 'created' ? 'New' : 'Updated'}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Failed Generations */}
              {generationResults.results.failed.length > 0 && (
                <div>
                  <h3 className="font-semibold text-red-700 mb-2">✗ Failed</h3>
                  <div className="bg-red-50 rounded-lg p-3 max-h-48 overflow-y-auto">
                    <ul className="space-y-2">
                      {generationResults.results.failed.map((result: any, index: number) => (
                        <li key={index} className="text-sm">
                          <span className="font-medium">{result.member}</span>
                          <span className="text-red-600 text-xs ml-2">({result.reason})</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => {
                  setShowResultsModal(false)
                  setGenerationResults(null)
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {isGenerating && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 flex flex-col items-center">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600 mb-4" />
            <p className="text-lg font-semibold">Generating Certificates...</p>
            <p className="text-sm text-gray-600 mt-2">Please wait while we generate certificates for all team members</p>
          </div>
        </div>
      )}
    </div>
  )
}
