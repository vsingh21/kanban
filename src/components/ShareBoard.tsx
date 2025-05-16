import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { 
  UserPlusIcon,
  XMarkIcon,
  UserCircleIcon 
} from '@heroicons/react/24/outline'

interface User {
  id: string
  email: string
}

interface BoardMember {
  id: string
  user_id: string
  email: string
}

interface ProfileData {
  id: string
  email: string
}

interface ShareBoardProps {
  boardId: string
}

export default function ShareBoard({ boardId }: ShareBoardProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [members, setMembers] = useState<BoardMember[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      fetchUsers()
      fetchBoardMembers()
    }
  }, [isOpen, boardId])

  const fetchUsers = async () => {
    setLoading(true)
    setError(null)
    try {
      // Get current user
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (!currentUser) throw new Error('Not authenticated')

      console.log("Current user:", currentUser.id)

      // Try directly from auth.users if admin access is allowed
      try {
        // First try the profiles table
        console.log("Trying to fetch from profiles table...")
        const { data, error, count } = await supabase
          .from('profiles')
          .select('id, email', { count: 'exact' })
          .neq('id', currentUser.id)
        
        console.log("Profiles query result:", { data, error, count })
        
        if (error) throw error
        
        if (data && data.length > 0) {
          console.log("Found users in profiles:", data.length)
          setUsers(data)
        } else {
          // If no profiles found, try to get from auth directly (may require admin)
          console.log("No profiles found, trying auth.users...")
          const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()
          
          if (authError) throw authError
          
          // Filter out current user and format
          const filteredUsers = (authUsers?.users || [])
            .filter(user => user.id !== currentUser.id)
            .map(user => ({
              id: user.id,
              email: user.email || 'No email'
            }));
          
          console.log("Users from auth:", filteredUsers.length)
          setUsers(filteredUsers)
        }
      } catch (error: any) {
        console.error("Error fetching users:", error)
        
        // As a fallback, let's try a simpler approach with the auth.users table
        console.log("Trying public auth.users approach...")
        const { data, error: usersError } = await supabase
          .from('users')
          .select('id, email')
          .neq('id', currentUser.id)
          
        if (usersError) {
          console.error("All approaches failed:", usersError)
          throw usersError
        }
        
        if (data && data.length > 0) {
          console.log("Found users in users table:", data.length)
          setUsers(data)
        } else {
          setError('No other users found in the system')
        }
      }
    } catch (error: any) {
      console.error('Error in fetchUsers:', error.message || error)
      setError(`Failed to load users: ${error.message || 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  const fetchBoardMembers = async () => {
    setLoading(true)
    setError(null)
    try {
      console.log("Fetching board members for board ID:", boardId)
      
      // First get the board members
      const { data: membersData, error: membersError } = await supabase
        .from('board_members')
        .select('id, user_id')
        .eq('board_id', boardId)

      if (membersError) throw membersError
      
      console.log("Board members data:", membersData)
      
      if (!membersData || membersData.length === 0) {
        console.log("No board members found")
        setMembers([])
        setLoading(false)
        return
      }
      
      // Then get the email addresses for those users from profiles
      const userIds = membersData.map(member => member.user_id)
      console.log("Looking up user IDs:", userIds)
      
      // Try with profiles first
      try {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, email')
          .in('id', userIds)
          
        if (profilesError) throw profilesError
        
        console.log("Profile data for members:", profilesData)
        
        // Join the data
        const formattedMembers: BoardMember[] = membersData.map(member => {
          // Find the matching profile data
          const profileData = profilesData?.find(p => p.id === member.user_id) as ProfileData | undefined
          return {
            id: member.id,
            user_id: member.user_id,
            email: profileData?.email || 'Unknown email'
          }
        })
        
        setMembers(formattedMembers)
      } catch (error) {
        console.error("Error fetching from profiles, trying users table:", error)
        
        // Fallback to users table
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id, email')
          .in('id', userIds)
          
        if (userError) throw userError
        
        // Join the data
        const formattedMembers: BoardMember[] = membersData.map(member => {
          const user = userData?.find(u => u.id === member.user_id)
          return {
            id: member.id,
            user_id: member.user_id,
            email: user?.email || 'Unknown email'
          }
        })
        
        setMembers(formattedMembers)
      }
    } catch (error: any) {
      console.error('Error fetching board members:', error.message || error)
      setError(`Failed to load board members: ${error.message || 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  const shareBoard = async (userId: string) => {
    setError(null)
    console.log(`Attempting to share board ${boardId} with user ${userId}`)
    
    try {
      // First check if the user is already a member of the board
      const { data: existingMember, error: checkError } = await supabase
        .from('board_members')
        .select('*')
        .eq('board_id', boardId)
        .eq('user_id', userId)
        .single()
      
      if (checkError && checkError.code !== 'PGRST116') {
        // PGRST116 means no rows returned, which is expected
        console.error("Error checking existing membership:", checkError)
        throw checkError
      }
      
      if (existingMember) {
        console.log("User is already a member of this board")
        setError("This user already has access to the board")
        return
      }
      
      // Insert the new board member
      console.log("Adding new board member...")
      const { data, error } = await supabase
        .from('board_members')
        .insert([
          { board_id: boardId, user_id: userId }
        ])
        .select()

      if (error) {
        console.error("Error in insert:", error)
        throw error
      }
      
      console.log("Share successful, inserted data:", data)
      
      // Refresh the members list
      fetchBoardMembers()
    } catch (error: any) {
      console.error('Error sharing board:', error.message || error)
      setError(`Failed to share board: ${error.message || 'Unknown error'}`)
    }
  }

  const removeBoardMember = async (memberId: string) => {
    setError(null)
    console.log(`Attempting to remove board member ${memberId}`)
    
    try {
      const { error } = await supabase
        .from('board_members')
        .delete()
        .eq('id', memberId)

      if (error) {
        console.error("Error in delete:", error)
        throw error
      }
      
      console.log("Remove successful")
      
      // Update the local state
      setMembers(members.filter(member => member.id !== memberId))
    } catch (error: any) {
      console.error('Error removing board member:', error.message || error)
      setError(`Failed to remove board member: ${error.message || 'Unknown error'}`)
    }
  }

  const filteredUsers = users.filter(user => 
    user.email?.toLowerCase().includes(searchQuery.toLowerCase()) && 
    !members.some(member => member.user_id === user.id)
  )

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-900 transition-colors duration-200 shadow-sm"
        aria-label="Share board"
      >
        <UserPlusIcon className="h-5 w-5 mr-2" />
        Share
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 z-10 border border-gray-200 dark:border-gray-700">
          <div className="p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Share Board</h3>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-2 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-md">
                <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            <div className="mb-4">
              <label htmlFor="search-users" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Search Users
              </label>
              <input
                id="search-users"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by email"
                className="w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white text-sm"
              />
            </div>

            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Users</h4>
              {loading ? (
                <div className="py-2 text-center">
                  <div className="animate-spin inline-block h-4 w-4 border-t-2 border-b-2 border-indigo-600 rounded-full"></div>
                </div>
              ) : (
                <div className="max-h-36 overflow-y-auto">
                  {filteredUsers.length > 0 ? (
                    filteredUsers.map((user) => (
                      <div key={user.id} className="flex items-center justify-between py-2 px-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md">
                        <div className="flex items-center">
                          <UserCircleIcon className="h-5 w-5 text-gray-400 mr-2" />
                          <span className="text-sm text-gray-700 dark:text-gray-300">{user.email}</span>
                        </div>
                        <button
                          onClick={() => shareBoard(user.id)}
                          className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300"
                          title="Add user"
                        >
                          <UserPlusIcon className="h-5 w-5" />
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-2">
                      {users.length === 0 ? "No other users found in the system" : "No matching users found"}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Shared With</h4>
              {loading ? (
                <div className="py-2 text-center">
                  <div className="animate-spin inline-block h-4 w-4 border-t-2 border-b-2 border-indigo-600 rounded-full"></div>
                </div>
              ) : (
                <div className="max-h-36 overflow-y-auto">
                  {members.length > 0 ? (
                    members.map((member) => (
                      <div key={member.id} className="flex items-center justify-between py-2 px-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md">
                        <div className="flex items-center">
                          <UserCircleIcon className="h-5 w-5 text-gray-400 mr-2" />
                          <span className="text-sm text-gray-700 dark:text-gray-300">{member.email}</span>
                        </div>
                        <button
                          onClick={() => removeBoardMember(member.id)}
                          className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                          title="Remove user"
                        >
                          <XMarkIcon className="h-5 w-5" />
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-2">No members yet</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 