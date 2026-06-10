import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { patchProfile, changePassword } from '../api/client';
import { User, Shield, Key, CheckCircle2, AlertCircle, Building, Calendar, Mail } from 'lucide-react';

const ProfileSettings: React.FC = () => {
  const { user, refreshMe } = useAuth();

  // Profile Edit fields
  const [name, setName] = useState(user?.name || '');
  const [username, setUsername] = useState(user?.username || '');
  const [email, setEmail] = useState(user?.email || '');
  const [department, setDepartment] = useState(user?.department || '');
  const [designation, setDesignation] = useState(user?.designation || '');
  
  // Password change fields
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Status/Messages
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileUpdating, setProfileUpdating] = useState(false);

  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordUpdating, setPasswordUpdating] = useState(false);

  // Sync state with user profile context updates
  React.useEffect(() => {
    if (user) {
      setName(user.name || '');
      setUsername(user.username || '');
      setEmail(user.email || '');
      setDepartment(user.department || '');
      setDesignation(user.designation || '');
    }
  }, [user]);

  const departments = [
    'Engineering',
    'Human Resources',
    'Finance',
    'Sales & Marketing',
    'IT / Administration',
    'Customer Support',
    'Operations',
    'Legal / Compliance'
  ];

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSuccess(null);
    setProfileError(null);
    setProfileUpdating(true);

    try {
      await patchProfile({ name, username, email, department, designation });
      await refreshMe();
      setProfileSuccess('Profile details updated successfully.');
    } catch (err: any) {
      console.error(err);
      setProfileError(err.response?.data?.detail || 'Failed to update profile details.');
    } finally {
      setProfileUpdating(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSuccess(null);
    setPasswordError(null);

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }

    setPasswordUpdating(true);

    try {
      await changePassword({ old_password: oldPassword, new_password: newPassword });
      setPasswordSuccess('Password changed successfully.');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      console.error(err);
      setPasswordError(err.response?.data?.detail || 'Failed to update password.');
    } finally {
      setPasswordUpdating(false);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 text-slate-300 font-sans p-6">
      
      {/* Page Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
          <User className="w-5 h-5 text-slate-400" />
          <span>My Profile & Settings</span>
        </h1>
        <p className="text-xs text-slate-400">
          Manage your personal account profile, professional identity details, and update security credentials.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left Column: Profile Card summary */}
        <div className="bg-[#0d0d0d] border border-[#2A2A2A] rounded-2xl p-6 flex flex-col items-center text-center shadow-xl space-y-4">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-slate-700 flex items-center justify-center text-2xl font-black text-white shadow-inner">
            {user?.avatar_initials || 'US'}
          </div>
          <div>
            <h3 className="text-base font-bold text-white leading-snug">{user?.name}</h3>
            {user?.username && (
              <p className="text-xs text-slate-400 font-semibold mb-1">@{user.username}</p>
            )}
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">
              {user?.designation} • {user?.department}
            </span>
          </div>

          <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${
            user?.role === 'admin' 
              ? 'bg-red-950/40 border-red-900/40 text-red-400' 
              : 'bg-emerald-950/40 border-emerald-900/40 text-emerald-400'
          }`}>
            {user?.role} console
          </span>

          <div className="w-full pt-4 border-t border-[#2A2A2A] space-y-2.5 text-left text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 text-slate-600 shrink-0" />
              <span className="truncate">{user?.email}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-slate-600 shrink-0" />
              <span>Joined: {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}</span>
            </div>
            {user?.last_login_at && (
              <div className="flex items-center gap-2">
                <Shield className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                <span>Last login: {new Date(user.last_login_at).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Columns: Edit details & security tabs */}
        <div className="md:col-span-2 space-y-6">
          
          {/* Edit Details Card */}
          <div className="bg-[#0d0d0d] border border-[#2A2A2A] rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-[#2A2A2A] pb-3">
              <Building className="w-4 h-4 text-slate-500" />
              <span>Identity Details</span>
            </h3>

            {profileSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{profileSuccess}</span>
              </div>
            )}

            {profileError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{profileError}</span>
              </div>
            )}

            <form onSubmit={handleUpdateProfile} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1.5">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#141414] border border-[#2A2A2A] rounded-xl text-white outline-none focus:border-cyan-400 transition-colors"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1.5">Username</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-4 py-2.5 bg-[#141414] border border-[#2A2A2A] rounded-xl text-white outline-none focus:border-cyan-400 transition-colors"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1.5">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-2.5 bg-[#141414] border border-[#2A2A2A] rounded-xl text-white outline-none focus:border-cyan-400 transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1.5">Department</label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full px-3 py-2.5 bg-[#141414] border border-[#2A2A2A] rounded-xl text-white outline-none focus:border-cyan-400 transition-colors"
                  >
                    {departments.map((dept) => (
                      <option key={dept} value={dept} className="bg-[#0d0d0d]">{dept}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1.5">Designation</label>
                  <input
                    type="text"
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    className="w-full px-4 py-2.5 bg-[#141414] border border-[#2A2A2A] rounded-xl text-white outline-none focus:border-cyan-400 transition-colors"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={profileUpdating}
                className="px-5 py-2.5 rounded-xl bg-white hover:bg-slate-200 text-black font-bold tracking-wide transition-all shadow-md disabled:opacity-50"
              >
                {profileUpdating ? 'Saving...' : 'Update Details'}
              </button>
            </form>
          </div>

          {/* Change Password Card */}
          <div className="bg-[#0d0d0d] border border-[#2A2A2A] rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-[#2A2A2A] pb-3">
              <Key className="w-4 h-4 text-slate-500" />
              <span>Update Security Password</span>
            </h3>

            {passwordSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{passwordSuccess}</span>
              </div>
            )}

            {passwordError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1.5">Current Password</label>
                <input
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 bg-[#141414] border border-[#2A2A2A] rounded-xl text-white outline-none focus:border-cyan-400 transition-colors"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1.5">New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-2.5 bg-[#141414] border border-[#2A2A2A] rounded-xl text-white outline-none focus:border-cyan-400 transition-colors"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1.5">Confirm New Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-2.5 bg-[#141414] border border-[#2A2A2A] rounded-xl text-white outline-none focus:border-cyan-400 transition-colors"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={passwordUpdating}
                className="px-5 py-2.5 rounded-xl bg-white hover:bg-slate-200 text-black font-bold tracking-wide transition-all shadow-md disabled:opacity-50"
              >
                {passwordUpdating ? 'Updating Password...' : 'Change Password'}
              </button>
            </form>
          </div>

        </div>

      </div>

    </div>
  );
};

export default ProfileSettings;
