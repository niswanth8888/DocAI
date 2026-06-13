import React, { useState, useEffect } from 'react';
import { getAdminUsers, patchAdminUser, resetAdminUserPassword } from '../api/client';
import { UserProfile } from '../types/api';
import { useAuth } from '../context/AuthContext';
import { Users, ToggleLeft, ToggleRight, Edit2, X, AlertCircle, Key, RefreshCw } from 'lucide-react';

const AdminUserManagement: React.FC = () => {
  const { user: currentUser, refreshMe } = useAuth();
  
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modal toggle states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  
  // Selected user states
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  
  // Edit Form states
  const [editFullName, setEditFullName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editDepartment, setEditDepartment] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editRole, setEditRole] = useState<'user' | 'admin'>('user');
  const [editStatus, setEditStatus] = useState<'active' | 'disabled'>('active');
  const [editModalSubmitting, setEditModalSubmitting] = useState(false);
  const [editModalError, setEditModalError] = useState<string | null>(null);
  
  // Reset Password Form states
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [mustChangePassword, setMustChangePassword] = useState(true);
  const [resetModalSubmitting, setResetModalSubmitting] = useState(false);
  const [resetModalError, setResetModalError] = useState<string | null>(null);

  const departments = [
    'Engineering',
    'Human Resources',
    'Finance',
    'Sales & Marketing',
    'IT / Administration',
    'Customer Support',
    'Operations',
    'Legal / Compliance',
    'Administration'
  ];

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAdminUsers();
      setUsers(data.users);
    } catch (err: any) {
      console.error(err);
      setError('Could not download users registry list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const openEditModal = (user: UserProfile) => {
    setSelectedUser(user);
    setEditFullName(user.full_name || user.name);
    setEditUsername(user.username);
    setEditEmail(user.email || '');
    setEditDepartment(user.department);
    setEditTitle(user.title || user.designation);
    setEditRole(user.role);
    setEditStatus(user.status);
    setEditModalError(null);
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setSelectedUser(null);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    
    setEditModalSubmitting(true);
    setEditModalError(null);
    
    try {
      await patchAdminUser(selectedUser.user_id, {
        full_name: editFullName.trim(),
        name: editFullName.trim(),
        username: editUsername.trim(),
        email: editEmail.trim(),
        department: editDepartment,
        title: editTitle.trim(),
        designation: editTitle.trim(),
        role: editRole,
        status: editStatus,
        is_active: editStatus === 'active'
      });
      
      alert('User profile updated successfully.');
      
      // If updating own profile, refresh the session topbar
      if (selectedUser.user_id === currentUser?.user_id) {
        await refreshMe();
      }
      
      closeEditModal();
      await fetchUsers();
    } catch (err: any) {
      console.error(err);
      setEditModalError(err.response?.data?.detail || 'Failed to update user details.');
    } finally {
      setEditModalSubmitting(false);
    }
  };

  const openResetModal = (user: UserProfile) => {
    setSelectedUser(user);
    setNewPassword('');
    setConfirmPassword('');
    setMustChangePassword(true);
    setResetModalError(null);
    setIsResetModalOpen(true);
  };

  const closeResetModal = () => {
    setIsResetModalOpen(false);
    setSelectedUser(null);
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    
    if (newPassword.length < 6) {
      setResetModalError('Password must be at least 6 characters.');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setResetModalError('Passwords do not match.');
      return;
    }
    
    setResetModalSubmitting(true);
    setResetModalError(null);
    
    try {
      await resetAdminUserPassword(selectedUser.user_id, {
        new_password: newPassword,
        must_change_password: mustChangePassword
      });
      
      alert(`Password reset successfully for user @${selectedUser.username}.`);
      closeResetModal();
    } catch (err: any) {
      console.error(err);
      setResetModalError(err.response?.data?.detail || 'Failed to reset user password.');
    } finally {
      setResetModalSubmitting(false);
    }
  };

  const toggleUserStatusQuick = async (user: UserProfile) => {
    if (user.user_id === currentUser?.user_id) {
      alert('You cannot deactivate your own active user profile.');
      return;
    }

    const nextStatus = user.status === 'active' ? 'disabled' : 'active';
    const confirmToggle = window.confirm(`Change status of "${user.full_name || user.name}" to ${nextStatus.toUpperCase()}?`);
    if (!confirmToggle) return;

    try {
      await patchAdminUser(user.user_id, {
        status: nextStatus,
        is_active: nextStatus === 'active'
      });
      setUsers(users.map(u => u.user_id === user.user_id ? { ...u, status: nextStatus, is_active: nextStatus === 'active' } : u));
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.detail || 'Failed to modify account state.');
    }
  };

  return (
    <div className="w-full mx-auto space-y-6 text-slate-300 font-sans p-6">
      
      {/* Page Header */}
      <div className="flex justify-between items-start">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-slate-400" />
            <span>User Identity Registry</span>
          </h1>
          <p className="text-xs text-slate-400">
            Administer active company profiles: assign authorization roles, disable employee credentials, and verify identity records.
          </p>
        </div>
        <button 
          onClick={fetchUsers}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#2a2a2a] hover:bg-[#141414] hover:text-white transition-all text-xs"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-slate-500 text-xs">
          Loading users directory list...
        </div>
      ) : (
        <div className="bg-[#0d0d0d] border border-[#2A2A2A] rounded-2xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="bg-[#141414] border-b border-[#2A2A2A] text-slate-400 font-bold">
                  <th className="px-5 py-4">Full Name</th>
                  <th className="px-5 py-4">Username</th>
                  <th className="px-5 py-4">Email</th>
                  <th className="px-5 py-4">Department</th>
                  <th className="px-5 py-4">Title</th>
                  <th className="px-5 py-4">Role</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Joined Date</th>
                  <th className="px-5 py-4">Last Active</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2A2A2A]/40">
                {users.map((item) => {
                  const isSelf = item.user_id === currentUser?.user_id;
                  
                  return (
                    <tr key={item.user_id} className="hover:bg-slate-900/10 transition-colors">
                      
                      {/* Full Name */}
                      <td className="px-5 py-4.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-white text-xs shrink-0">
                            {item.avatar_initials || (item.full_name || item.name || 'US').substring(0,2).toUpperCase()}
                          </div>
                          <span className="font-bold text-white whitespace-nowrap">
                            {item.full_name || item.name}
                            {isSelf && (
                              <span className="ml-1.5 bg-[#141414] border border-[#2A2A2A] text-[9px] text-slate-400 font-semibold px-1.5 py-0.5 rounded">
                                You
                              </span>
                            )}
                          </span>
                        </div>
                      </td>

                      {/* Username */}
                      <td className="px-5 py-4.5">
                        <span className="text-slate-400 font-semibold">@{item.username}</span>
                      </td>

                      {/* Email */}
                      <td className="px-5 py-4.5 text-slate-400">
                        {item.email || '-'}
                      </td>

                      {/* Department */}
                      <td className="px-5 py-4.5 text-slate-400">
                        {item.department || '-'}
                      </td>

                      {/* Title */}
                      <td className="px-5 py-4.5 text-slate-300">
                        {item.title || item.designation || '-'}
                      </td>

                      {/* Role */}
                      <td className="px-5 py-4.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${
                          item.role === 'admin' 
                            ? 'bg-red-950/40 border-red-900/40 text-red-400' 
                            : 'bg-slate-900 border-[#2A2A2A] text-slate-400'
                        }`}>
                          {item.role}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${
                          (item.is_active !== undefined ? item.is_active : item.status === 'active')
                            ? 'bg-emerald-950/40 border-emerald-900/40 text-emerald-400' 
                            : 'bg-rose-950/40 border-rose-900/40 text-rose-400'
                        }`}>
                          {(item.is_active !== undefined ? item.is_active : item.status === 'active') ? 'Active' : 'Disabled'}
                        </span>
                      </td>

                      {/* Joined Date */}
                      <td className="px-5 py-4.5 text-slate-500">
                        {item.created_at ? new Date(item.created_at).toLocaleDateString() : '-'}
                      </td>

                      {/* Last Active */}
                      <td className="px-5 py-4.5 text-slate-500">
                        {item.last_login || item.last_login_at 
                          ? new Date(item.last_login || item.last_login_at!).toLocaleDateString() 
                          : 'Never'}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4.5 text-right">
                        <div className="flex justify-end gap-2 items-center">
                          <button
                            onClick={() => openEditModal(item)}
                            className="p-1.5 rounded border border-[#2A2A2A] hover:bg-[#141414] hover:border-slate-500 text-slate-400 hover:text-white transition-all"
                            title="Edit user details"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => openResetModal(item)}
                            className="p-1.5 rounded border border-[#2A2A2A] hover:bg-[#141414] hover:border-slate-500 text-slate-400 hover:text-white transition-all"
                            title="Reset password"
                          >
                            <Key className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => toggleUserStatusQuick(item)}
                            disabled={isSelf}
                            className={`p-1.5 rounded border border-[#2A2A2A] transition-all ${
                              isSelf 
                                ? 'opacity-30 cursor-not-allowed text-slate-600' 
                                : (item.is_active !== undefined ? item.is_active : item.status === 'active')
                                  ? 'hover:bg-rose-950/20 hover:border-rose-900/40 text-rose-400'
                                  : 'hover:bg-emerald-950/20 hover:border-emerald-900/40 text-emerald-400'
                            }`}
                            title={(item.is_active !== undefined ? item.is_active : item.status === 'active') ? 'Deactivate profile' : 'Re-enable profile'}
                          >
                            {(item.is_active !== undefined ? item.is_active : item.status === 'active') ? (
                              <ToggleRight className="w-3.5 h-3.5" />
                            ) : (
                              <ToggleLeft className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {isEditModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[#0d0d0d] border border-[#2a2a2a] rounded-2xl p-6 shadow-2xl relative overflow-hidden text-xs text-slate-300">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-[#2a2a2a]">
              <div>
                <h3 className="text-sm font-bold text-white">Edit User Profile</h3>
                <p className="text-[10px] text-slate-400">Update configuration for @{selectedUser.username}</p>
              </div>
              <button 
                onClick={closeEditModal}
                className="text-slate-500 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {editModalError && (
              <div className="p-3 mb-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{editModalError}</span>
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Full Name</label>
                <input 
                  type="text" 
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  className="w-full px-3 py-2 bg-[#141414] border border-[#2A2A2A] rounded-xl text-white outline-none focus:border-cyan-400 transition-colors"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Username</label>
                <input 
                  type="text" 
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  className="w-full px-3 py-2 bg-[#141414] border border-[#2A2A2A] rounded-xl text-white outline-none focus:border-cyan-400 transition-colors"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Email Address</label>
                <input 
                  type="email" 
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-[#141414] border border-[#2A2A2A] rounded-xl text-white outline-none focus:border-cyan-400 transition-colors"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Department</label>
                  <select 
                    value={editDepartment}
                    onChange={(e) => setEditDepartment(e.target.value)}
                    className="w-full px-3 py-2 bg-[#141414] border border-[#2A2A2A] rounded-xl text-white outline-none focus:border-cyan-400 transition-colors"
                  >
                    {departments.map((dept) => (
                      <option key={dept} value={dept} className="bg-[#0d0d0d]">{dept}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Title</label>
                  <input 
                    type="text" 
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-[#141414] border border-[#2A2A2A] rounded-xl text-white outline-none focus:border-cyan-400 transition-colors"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Role</label>
                  <select 
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value as any)}
                    className="w-full px-3 py-2 bg-[#141414] border border-[#2A2A2A] rounded-xl text-white outline-none focus:border-cyan-400 transition-colors"
                  >
                    <option value="user" className="bg-[#0d0d0d]">User</option>
                    <option value="admin" className="bg-[#0d0d0d]">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Status</label>
                  <select 
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as any)}
                    className="w-full px-3 py-2 bg-[#141414] border border-[#2A2A2A] rounded-xl text-white outline-none focus:border-cyan-400 transition-colors"
                    disabled={selectedUser.user_id === currentUser?.user_id}
                  >
                    <option value="active" className="bg-[#0d0d0d]">Active</option>
                    <option value="disabled" className="bg-[#0d0d0d]">Disabled</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#2a2a2a] mt-6">
                <button 
                  type="button" 
                  onClick={closeEditModal}
                  className="px-4 py-2 rounded-xl bg-[#141414] border border-[#2A2A2A] hover:border-slate-500 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={editModalSubmitting}
                  className="px-4 py-2 rounded-xl bg-white hover:bg-slate-200 text-black font-bold disabled:opacity-50 transition-all"
                >
                  {editModalSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {isResetModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[#0d0d0d] border border-[#2a2a2a] rounded-2xl p-6 shadow-2xl relative overflow-hidden text-xs text-slate-300">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-[#2a2a2a]">
              <div>
                <h3 className="text-sm font-bold text-white">Reset User Password</h3>
                <p className="text-[10px] text-slate-400">Generate new credentials for @{selectedUser.username}</p>
              </div>
              <button 
                onClick={closeResetModal}
                className="text-slate-500 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {resetModalError && (
              <div className="p-3 mb-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{resetModalError}</span>
              </div>
            )}

            <form onSubmit={handleResetSubmit} className="space-y-4">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">New Password</label>
                <input 
                  type="password" 
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 bg-[#141414] border border-[#2A2A2A] rounded-xl text-white outline-none focus:border-cyan-400 transition-colors"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Confirm Password</label>
                <input 
                  type="password" 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 bg-[#141414] border border-[#2A2A2A] rounded-xl text-white outline-none focus:border-cyan-400 transition-colors"
                  required
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input 
                  type="checkbox" 
                  id="mustChangePassword"
                  checked={mustChangePassword}
                  onChange={(e) => setMustChangePassword(e.target.checked)}
                  className="w-4 h-4 bg-[#141414] border border-[#2a2a2a] rounded cursor-pointer accent-cyan-500 focus:ring-0 outline-none"
                />
                <label htmlFor="mustChangePassword" className="text-slate-400 font-semibold cursor-pointer">
                  Require password change on next login
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#2a2a2a] mt-6">
                <button 
                  type="button" 
                  onClick={closeResetModal}
                  className="px-4 py-2 rounded-xl bg-[#141414] border border-[#2A2A2A] hover:border-slate-500 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={resetModalSubmitting}
                  className="px-4 py-2 rounded-xl bg-white hover:bg-slate-200 text-black font-bold disabled:opacity-50 transition-all"
                >
                  {resetModalSubmitting ? 'Resetting...' : 'Reset Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminUserManagement;
