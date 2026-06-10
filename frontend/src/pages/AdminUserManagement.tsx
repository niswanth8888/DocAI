import React, { useState, useEffect } from 'react';
import { getAdminUsers, patchAdminUser } from '../api/client';
import { UserProfile } from '../types/api';
import { useAuth } from '../context/AuthContext';
import { Users, ToggleLeft, ToggleRight, Edit2, Check, X, AlertCircle } from 'lucide-react';

const AdminUserManagement: React.FC = () => {
  const { user: currentUser } = useAuth();
  
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit states
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState<'user' | 'admin'>('user');
  const [editStatus, setEditStatus] = useState<'active' | 'disabled'>('active');
  const [editDept, setEditDept] = useState('');
  const [editDesig, setEditDesig] = useState('');
  const [editName, setEditName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);

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

  const startEditing = (user: UserProfile) => {
    setEditingUserId(user.user_id);
    setEditRole(user.role);
    setEditStatus(user.status);
    setEditDept(user.department);
    setEditDesig(user.designation);
    setEditName(user.name);
    setEditUsername(user.username || '');
    setEditEmail(user.email || '');
  };

  const cancelEditing = () => {
    setEditingUserId(null);
  };

  const saveUserChanges = async (userId: string) => {
    if (userId === currentUser?.user_id && editRole !== 'admin') {
      const confirmSelf = window.confirm('WARNING: You are downgrading your own administrative role. You will lose access to this console. Do you want to continue?');
      if (!confirmSelf) return;
    }

    setSavingId(userId);
    try {
      await patchAdminUser(userId, {
        name: editName,
        username: editUsername,
        email: editEmail,
        role: editRole,
        status: editStatus,
        department: editDept,
        designation: editDesig
      });
      
      // Update local state
      setUsers(users.map(u => u.user_id === userId ? {
        ...u,
        name: editName,
        username: editUsername,
        email: editEmail,
        role: editRole,
        status: editStatus,
        department: editDept,
        designation: editDesig,
        updated_at: new Date().toISOString()
      } : u));
      
      setEditingUserId(null);
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.detail || 'Failed to update user config.');
    } finally {
      setSavingId(null);
    }
  };

  const toggleUserStatusQuick = async (user: UserProfile) => {
    if (user.user_id === currentUser?.user_id) {
      alert('You cannot deactivate your own active user profile.');
      return;
    }

    const nextStatus = user.status === 'active' ? 'disabled' : 'active';
    const confirmToggle = window.confirm(`Change status of "${user.name}" to ${nextStatus.toUpperCase()}?`);
    if (!confirmToggle) return;

    try {
      await patchAdminUser(user.user_id, { status: nextStatus });
      setUsers(users.map(u => u.user_id === user.user_id ? { ...u, status: nextStatus } : u));
    } catch (err: any) {
      console.error(err);
      alert('Failed to modify account state.');
    }
  };

  return (
    <div className="w-full mx-auto space-y-6 text-slate-300 font-sans p-6">
      
      {/* Page Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
          <Users className="w-5 h-5 text-slate-400" />
          <span>User Identity Registry</span>
        </h1>
        <p className="text-xs text-slate-400">
          Administer active company profiles: assign authorization roles, disable employee credentials, and verify identity records.
        </p>
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
                  <th className="px-6 py-4.5">Employee Details</th>
                  <th className="px-6 py-4.5">Department & Title</th>
                  <th className="px-6 py-4.5">Role</th>
                  <th className="px-6 py-4.5">Status</th>
                  <th className="px-6 py-4.5">Registration & Login</th>
                  <th className="px-6 py-4.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2A2A2A]/40">
                {users.map((item) => {
                  const isEditing = editingUserId === item.user_id;
                  const isSelf = item.user_id === currentUser?.user_id;
                  
                  return (
                    <tr key={item.user_id} className="hover:bg-slate-900/10 transition-colors">
                      
                      {/* Name & email */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-white text-xs shrink-0">
                            {item.avatar_initials}
                          </div>
                          {isEditing ? (
                            <div className="space-y-1.5 flex-1 min-w-0">
                              <input
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="w-full px-2 py-1 bg-[#141414] border border-[#2A2A2A] rounded text-[11px] outline-none text-white focus:border-cyan-400"
                                placeholder="Full Name"
                                required
                              />
                              <input
                                type="text"
                                value={editUsername}
                                onChange={(e) => setEditUsername(e.target.value)}
                                className="w-full px-2 py-1 bg-[#141414] border border-[#2A2A2A] rounded text-[11px] outline-none text-white focus:border-cyan-400"
                                placeholder="Username"
                                required
                              />
                              <input
                                type="email"
                                value={editEmail}
                                onChange={(e) => setEditEmail(e.target.value)}
                                className="w-full px-2 py-1 bg-[#141414] border border-[#2A2A2A] rounded text-[11px] outline-none text-white focus:border-cyan-400"
                                placeholder="Email (Optional)"
                              />
                            </div>
                          ) : (
                            <div className="min-w-0">
                              <p className="font-bold text-white flex items-center gap-1.5 truncate">
                                <span>{item.name}</span>
                                {isSelf && (
                                  <span className="bg-[#141414] border border-[#2A2A2A] text-[9px] text-slate-400 font-semibold px-1.5 py-0.5 rounded shrink-0">
                                    You
                                  </span>
                                )}
                              </p>
                              {item.username && (
                                <p className="text-[10px] text-slate-400 font-semibold">@{item.username}</p>
                              )}
                              <p className="text-[10px] text-slate-500 truncate">{item.email || 'No email'}</p>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Dept & Designation */}
                      <td className="px-6 py-4">
                        {isEditing ? (
                          <div className="space-y-1.5">
                            <input
                              type="text"
                              value={editDept}
                              onChange={(e) => setEditDept(e.target.value)}
                              className="w-full px-2 py-1 bg-[#141414] border border-[#2A2A2A] rounded text-[11px] outline-none text-white focus:border-cyan-400"
                              placeholder="Department"
                            />
                            <input
                              type="text"
                              value={editDesig}
                              onChange={(e) => setEditDesig(e.target.value)}
                              className="w-full px-2 py-1 bg-[#141414] border border-[#2A2A2A] rounded text-[11px] outline-none text-white focus:border-cyan-400"
                              placeholder="Designation"
                            />
                          </div>
                        ) : (
                          <div>
                            <p className="text-slate-300 font-medium">{item.designation}</p>
                            <p className="text-[10px] text-slate-500">{item.department}</p>
                          </div>
                        )}
                      </td>

                      {/* Role */}
                      <td className="px-6 py-4">
                        {isEditing ? (
                          <select
                            value={editRole}
                            onChange={(e) => setEditRole(e.target.value as any)}
                            className="px-2 py-1 bg-[#141414] border border-[#2A2A2A] rounded text-[11px] text-white outline-none focus:border-cyan-400"
                          >
                            <option value="user">User</option>
                            <option value="admin">Admin</option>
                          </select>
                        ) : (
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${
                            item.role === 'admin' 
                              ? 'bg-red-950/40 border-red-900/40 text-red-400' 
                              : 'bg-slate-900 border-[#2A2A2A] text-slate-400'
                          }`}>
                            {item.role}
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        {isEditing ? (
                          <select
                            value={editStatus}
                            onChange={(e) => setEditStatus(e.target.value as any)}
                            className="px-2 py-1 bg-[#141414] border border-[#2A2A2A] rounded text-[11px] text-white outline-none focus:border-cyan-400"
                          >
                            <option value="active">Active</option>
                            <option value="disabled">Disabled</option>
                          </select>
                        ) : (
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${
                            item.status === 'active' 
                              ? 'bg-emerald-950/40 border-emerald-900/40 text-emerald-400' 
                              : 'bg-rose-950/40 border-rose-900/40 text-rose-400'
                          }`}>
                            {item.status}
                          </span>
                        )}
                      </td>

                      {/* Created / Last Login */}
                      <td className="px-6 py-4 text-[10px] text-slate-500 space-y-0.5">
                        <p>Joined: {new Date(item.created_at).toLocaleDateString()}</p>
                        {item.last_login_at ? (
                          <p>Active: {new Date(item.last_login_at).toLocaleDateString()}</p>
                        ) : (
                          <p>Active: Never logged in</p>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        {isEditing ? (
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => saveUserChanges(item.user_id)}
                              disabled={savingId === item.user_id}
                              className="p-1.5 rounded bg-white hover:bg-slate-200 text-black font-bold disabled:opacity-50 transition-colors"
                              title="Save Config"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={cancelEditing}
                              className="p-1.5 rounded bg-[#141414] border border-[#2A2A2A] hover:border-slate-500 text-slate-400 hover:text-white transition-colors"
                              title="Cancel"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex justify-end gap-3 items-center">
                            <button
                              onClick={() => startEditing(item)}
                              className="p-1.5 rounded border border-[#2A2A2A] hover:bg-[#141414] hover:border-slate-500 text-slate-400 hover:text-white transition-all"
                              title="Edit config details"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => toggleUserStatusQuick(item)}
                              disabled={isSelf}
                              className={`p-1.5 rounded border border-[#2A2A2A] transition-all ${
                                isSelf 
                                  ? 'opacity-30 cursor-not-allowed text-slate-600' 
                                  : item.status === 'active'
                                    ? 'hover:bg-rose-950/20 hover:border-rose-900/40 text-rose-400'
                                    : 'hover:bg-emerald-950/20 hover:border-emerald-900/40 text-emerald-400'
                              }`}
                              title={item.status === 'active' ? 'Deactivate profile' : 'Re-enable profile'}
                            >
                              {item.status === 'active' ? (
                                <ToggleRight className="w-4 h-4" />
                              ) : (
                                <ToggleLeft className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        )}
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminUserManagement;
