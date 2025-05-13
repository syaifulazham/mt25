'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';

type Contestant = {
  id: number;
  name: string;
  ic: string;
  email?: string | null;
  phoneNumber?: string | null;
  gender: string;
  age: number;
  edu_level: string;
  class_name?: string | null;
  class_grade?: string | null;
  hashcode: string;
  contingentId: number;
  status: string;
  createdAt: string;
  updatedAt: string;
};

type ContingentInfo = {
  id: number;
  name: string;
};

type ContestantManagerProps = {
  contingentId: number;
  contingentName: string;
  isManager: boolean;
};

export default function ContestantManager({ contingentId, contingentName, isManager }: ContestantManagerProps) {
  const { data: session } = useSession();
  const router = useRouter();
  
  const [contestants, setContestants] = useState<Contestant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    ic: '',
    email: '',
    phoneNumber: '',
    gender: 'Lelaki',
    age: '',
    edu_level: 'sekolah rendah',
    class_name: '',
    class_grade: ''
  });
  
  // Edit state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    ic: '',
    email: '',
    phoneNumber: '',
    gender: '',
    age: '',
    edu_level: '',
    class_name: '',
    class_grade: '',
    status: ''
  });

  // Load contestants
  useEffect(() => {
    if (!session || !contingentId) return;
    
    const fetchContestants = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/participants/contestants?contingentId=${contingentId}`);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch contestants');
        }
        
        const data = await response.json();
        setContestants(data);
        setError(null);
      } catch (err: any) {
        console.error('Error fetching contestants:', err);
        setError(err.message || 'Failed to load contestants');
        toast.error('Failed to load contestants');
      } finally {
        setLoading(false);
      }
    };
    
    fetchContestants();
  }, [session, contingentId]);
  
  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  // Handle edit form input changes
  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({ ...prev, [name]: value }));
  };
  
  // Start editing a contestant
  const startEditing = (contestant: Contestant) => {
    setEditingId(contestant.id);
    setEditFormData({
      name: contestant.name,
      ic: contestant.ic,
      email: contestant.email || '',
      phoneNumber: contestant.phoneNumber || '',
      gender: contestant.gender,
      age: contestant.age.toString(),
      edu_level: contestant.edu_level,
      class_name: contestant.class_name || '',
      class_grade: contestant.class_grade || '',
      status: contestant.status
    });
  };
  
  // Cancel editing
  const cancelEditing = () => {
    setEditingId(null);
  };
  
  // Submit new contestant form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isManager) {
      toast.error('You must be a manager to add contestants');
      return;
    }
    
    try {
      const response = await fetch('/api/participants/contestants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          contingentId
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add contestant');
      }
      
      const newContestant = await response.json();
      
      // Update the local state
      setContestants(prev => [...prev, newContestant]);
      
      // Reset form and hide it
      setFormData({
        name: '',
        ic: '',
        email: '',
        phoneNumber: '',
        gender: 'Lelaki',
        age: '',
        edu_level: 'sekolah rendah',
        class_name: '',
        class_grade: ''
      });
      setShowAddForm(false);
      
      toast.success('Contestant added successfully');
    } catch (err: any) {
      console.error('Error adding contestant:', err);
      toast.error(err.message || 'Failed to add contestant');
    }
  };
  
  // Submit edit form
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isManager || !editingId) {
      toast.error('You must be a manager to edit contestants');
      return;
    }
    
    try {
      const response = await fetch('/api/participants/contestants', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: editingId,
          ...editFormData
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update contestant');
      }
      
      const updatedContestant = await response.json();
      
      // Update the local state
      setContestants(prev => 
        prev.map(c => c.id === editingId ? updatedContestant : c)
      );
      
      // Reset edit state
      setEditingId(null);
      
      toast.success('Contestant updated successfully');
    } catch (err: any) {
      console.error('Error updating contestant:', err);
      toast.error(err.message || 'Failed to update contestant');
    }
  };
  
  // Delete a contestant
  const handleDelete = async (id: number) => {
    if (!isManager) {
      toast.error('You must be a manager to delete contestants');
      return;
    }
    
    if (!confirm('Are you sure you want to delete this contestant?')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/participants/contestants/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        let errorMessage = 'Failed to delete contestant';
        
        // Check if there's content to parse
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          try {
            const errorData = await response.json();
            if (errorData && errorData.error) {
              errorMessage = errorData.error;
            }
          } catch (parseError) {
            console.error('Error parsing error response:', parseError);
          }
        }
        
        throw new Error(errorMessage);
      }
      
      // Update the local state
      setContestants(prev => prev.filter(c => c.id !== id));
      
      toast.success('Contestant deleted successfully');
    } catch (err: any) {
      console.error('Error deleting contestant:', err);
      toast.error(err.message || 'Failed to delete contestant');
    }
  };
  
  if (loading) {
    return (
      <div className="p-4 bg-white rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Contestants for {contingentName}</h2>
        <div className="flex justify-center items-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="p-4 bg-white rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Contestants for {contingentName}</h2>
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p>Error: {error}</p>
          <button 
            className="mt-2 bg-red-500 hover:bg-red-600 text-white py-1 px-3 rounded"
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Contestants for {contingentName}</h2>
        {isManager && (
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded"
          >
            {showAddForm ? 'Cancel' : 'Add Contestant'}
          </button>
        )}
      </div>
      
      {/* Add Contestant Form */}
      {showAddForm && isManager && (
        <div className="mb-6 p-4 border rounded-lg bg-gray-50">
          <h3 className="text-lg font-medium mb-3">Add New Contestant</h3>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name*
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="w-full p-2 border rounded"
                  placeholder="Full name as in IC"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  IC Number*
                </label>
                <input
                  type="text"
                  name="ic"
                  value={formData.ic}
                  onChange={handleInputChange}
                  required
                  className="w-full p-2 border rounded"
                  placeholder="Without dashes"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded"
                  placeholder="Email address"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="text"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded"
                  placeholder="Phone number"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Gender*
                </label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleInputChange}
                  required
                  className="w-full p-2 border rounded"
                >
                  <option value="Lelaki">Lelaki</option>
                  <option value="Perempuan">Perempuan</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Age*
                </label>
                <input
                  type="number"
                  name="age"
                  value={formData.age}
                  onChange={handleInputChange}
                  required
                  min="5"
                  max="25"
                  className="w-full p-2 border rounded"
                  placeholder="Age in years"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Education Level*
                </label>
                <select
                  name="edu_level"
                  value={formData.edu_level}
                  onChange={handleInputChange}
                  required
                  className="w-full p-2 border rounded"
                >
                  <option value="sekolah rendah">Sekolah Rendah</option>
                  <option value="sekolah menengah">Sekolah Menengah</option>
                  <option value="belia">Belia</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Class/Grade
                </label>
                <input
                  type="text"
                  name="class_grade"
                  value={formData.class_grade}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded"
                  placeholder="e.g., 5, 6, Form 1"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Class Name
                </label>
                <input
                  type="text"
                  name="class_name"
                  value={formData.class_name}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded"
                  placeholder="e.g., Cerdik, 5A"
                />
              </div>
            </div>
            
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="mr-2 bg-gray-300 hover:bg-gray-400 text-gray-800 py-2 px-4 rounded"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded"
              >
                Add Contestant
              </button>
            </div>
          </form>
        </div>
      )}
      
      {/* Contestants List */}
      {contestants.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <p className="text-gray-500">No contestants registered yet.</p>
          {isManager && (
            <button
              onClick={() => setShowAddForm(true)}
              className="mt-4 bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded"
            >
              Register Your First Contestant
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white">
            <thead className="bg-gray-100">
              <tr>
                <th className="py-2 px-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="py-2 px-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">IC</th>
                <th className="py-2 px-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gender</th>
                <th className="py-2 px-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Age</th>
                <th className="py-2 px-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Education</th>
                <th className="py-2 px-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="py-2 px-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {contestants.map(contestant => (
                editingId === contestant.id ? (
                  <tr key={contestant.id} className="bg-blue-50">
                    <td colSpan={7} className="py-3 px-3">
                      <form onSubmit={handleEditSubmit}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Full Name*
                            </label>
                            <input
                              type="text"
                              name="name"
                              value={editFormData.name}
                              onChange={handleEditInputChange}
                              required
                              className="w-full p-2 border rounded"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              IC Number
                            </label>
                            <input
                              type="text"
                              name="ic"
                              value={editFormData.ic}
                              disabled
                              className="w-full p-2 border rounded bg-gray-100"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Email
                            </label>
                            <input
                              type="email"
                              name="email"
                              value={editFormData.email}
                              onChange={handleEditInputChange}
                              className="w-full p-2 border rounded"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Phone Number
                            </label>
                            <input
                              type="text"
                              name="phoneNumber"
                              value={editFormData.phoneNumber}
                              onChange={handleEditInputChange}
                              className="w-full p-2 border rounded"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Gender*
                            </label>
                            <select
                              name="gender"
                              value={editFormData.gender}
                              onChange={handleEditInputChange}
                              required
                              className="w-full p-2 border rounded"
                            >
                              <option value="Lelaki">Lelaki</option>
                              <option value="Perempuan">Perempuan</option>
                            </select>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Age*
                            </label>
                            <input
                              type="number"
                              name="age"
                              value={editFormData.age}
                              onChange={handleEditInputChange}
                              required
                              min="5"
                              max="25"
                              className="w-full p-2 border rounded"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Education Level*
                            </label>
                            <select
                              name="edu_level"
                              value={editFormData.edu_level}
                              onChange={handleEditInputChange}
                              required
                              className="w-full p-2 border rounded"
                            >
                              <option value="sekolah rendah">Sekolah Rendah</option>
                              <option value="sekolah menengah">Sekolah Menengah</option>
                              <option value="belia">Belia</option>
                            </select>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Status
                            </label>
                            <select
                              name="status"
                              value={editFormData.status}
                              onChange={handleEditInputChange}
                              required
                              className="w-full p-2 border rounded"
                            >
                              <option value="ACTIVE">Active</option>
                              <option value="INACTIVE">Inactive</option>
                              <option value="PENDING">Pending</option>
                            </select>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Class/Grade
                            </label>
                            <input
                              type="text"
                              name="class_grade"
                              value={editFormData.class_grade}
                              onChange={handleEditInputChange}
                              className="w-full p-2 border rounded"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Class Name
                            </label>
                            <input
                              type="text"
                              name="class_name"
                              value={editFormData.class_name}
                              onChange={handleEditInputChange}
                              className="w-full p-2 border rounded"
                            />
                          </div>
                        </div>
                        
                        <div className="mt-4 flex justify-end">
                          <button
                            type="button"
                            onClick={cancelEditing}
                            className="mr-2 bg-gray-300 hover:bg-gray-400 text-gray-800 py-1 px-3 rounded"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="bg-blue-500 hover:bg-blue-600 text-white py-1 px-3 rounded"
                          >
                            Save Changes
                          </button>
                        </div>
                      </form>
                    </td>
                  </tr>
                ) : (
                  <tr key={contestant.id}>
                    <td className="py-3 px-3">{contestant.name}</td>
                    <td className="py-3 px-3">{contestant.ic}</td>
                    <td className="py-3 px-3">{contestant.gender}</td>
                    <td className="py-3 px-3">{contestant.age}</td>
                    <td className="py-3 px-3">{contestant.edu_level}</td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-1 rounded text-xs ${
                        contestant.status === 'ACTIVE' 
                          ? 'bg-green-100 text-green-800' 
                          : contestant.status === 'PENDING'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                      }`}>
                        {contestant.status}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      {isManager && (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => startEditing(contestant)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(contestant.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
