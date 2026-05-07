import React, { useState, useEffect } from "react";
import {
  getAllUsers,
  updateUserRole,
  updateUserStatus,
  createUserProfile,
  getPendingUsers,
  approveUser,
} from "../services/userService";
import { doc, deleteDoc, updateDoc, collection } from "firebase/firestore";
import { db } from "../lib/firebaseConfig";
import { useAuth } from "../contexts/AuthContext";
import {
  Users,
  Shield,
  User,
  Mail,
  Calendar,
  ToggleLeft,
  ToggleRight,
  Search,
  Filter,
  ChevronDown,
  Crown,
  UserCheck,
  UserX,
  RefreshCw,
  Edit,
  Trash2,
  X,
  Save,
  Plus,
  Check,
  Clock,
} from "lucide-react";

export default function UserManagement() {
  const { currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [updatingUserId, setUpdatingUserId] = useState(null);
  const [editingUserId, setEditingUserId] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", email: "" });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUserForm, setNewUserForm] = useState({
    name: "",
    email: "",
    role: "user",
  });
  const [pendingUsers, setPendingUsers] = useState([]);
  const [showPendingUsers, setShowPendingUsers] = useState(false);

  useEffect(() => {
    loadUsers();
    loadPendingUsers();
  }, []);

  const loadPendingUsers = async () => {
    try {
      const pending = await getPendingUsers();
      setPendingUsers(pending);
    } catch (error) {
      console.error("Error loading pending users:", error);
    }
  };

  const handleApproveUser = async (userId) => {
    try {
      setUpdatingUserId(userId);
      await approveUser(userId);

      // Update local states
      setUsers((prevUsers) =>
        prevUsers.map((user) =>
          user.id === userId
            ? { ...user, isApproved: true, isActive: true }
            : user,
        ),
      );

      setPendingUsers((prev) => prev.filter((user) => user.id !== userId));
    } catch (error) {
      console.error("Error approving user:", error);
      alert("Failed to approve user. Please try again.");
    } finally {
      setUpdatingUserId(null);
    }
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      const userList = await getAllUsers();
      setUsers(userList);
    } catch (error) {
      console.error("Error loading users:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      setUpdatingUserId(userId);
      await updateUserRole(userId, newRole);

      // Update local state
      setUsers((prevUsers) =>
        prevUsers.map((user) =>
          user.id === userId ? { ...user, role: newRole } : user,
        ),
      );
    } catch (error) {
      console.error("Error updating user role:", error);
      alert("Failed to update user role. Please try again.");
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleStatusChange = async (userId, isActive) => {
    try {
      setUpdatingUserId(userId);
      await updateUserStatus(userId, isActive);

      // Update local state
      setUsers((prevUsers) =>
        prevUsers.map((user) =>
          user.id === userId ? { ...user, isActive } : user,
        ),
      );
    } catch (error) {
      console.error("Error updating user status:", error);
      alert("Failed to update user status. Please try again.");
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleEditUser = (user) => {
    setEditingUserId(user.id);
    setEditForm({ name: user.name || "", email: user.email || "" });
  };

  const handleSaveEdit = async (userId) => {
    try {
      setUpdatingUserId(userId);

      // Update user document in Firestore
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, {
        name: editForm.name,
        email: editForm.email,
        updatedAt: new Date(),
      });

      // Update local state
      setUsers((prevUsers) =>
        prevUsers.map((user) =>
          user.id === userId
            ? { ...user, name: editForm.name, email: editForm.email }
            : user,
        ),
      );

      setEditingUserId(null);
      setEditForm({ name: "", email: "" });
    } catch (error) {
      console.error("Error updating user:", error);
      alert("Failed to update user. Please try again.");
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleCancelEdit = () => {
    setEditingUserId(null);
    setEditForm({ name: "", email: "" });
  };

  const handleDeleteUser = async (userId) => {
    try {
      setUpdatingUserId(userId);

      // Delete user document from Firestore
      const userRef = doc(db, "users", userId);
      await deleteDoc(userRef);

      // Remove from local state
      setUsers((prevUsers) => prevUsers.filter((user) => user.id !== userId));

      setShowDeleteConfirm(null);
    } catch (error) {
      console.error("Error deleting user:", error);
      alert("Failed to delete user. Please try again.");
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleCreateUser = async () => {
    try {
      if (!newUserForm.name || !newUserForm.email) {
        alert("Please fill in all fields");
        return;
      }

      setUpdatingUserId("creating");

      // Generate a unique ID for the new user
      const newUserId = doc(collection(db, "users")).id;

      // Create user profile
      await createUserProfile(newUserId, {
        name: newUserForm.name,
        email: newUserForm.email,
        role: newUserForm.role,
        isActive: true,
      });

      // Add to local state
      const newUser = {
        id: newUserId,
        name: newUserForm.name,
        email: newUserForm.email,
        role: newUserForm.role,
        isActive: true,
        createdAt: new Date(),
      };

      setUsers((prevUsers) => [newUser, ...prevUsers]);

      // Reset form
      setNewUserForm({ name: "", email: "", role: "user" });
      setShowAddUser(false);

      alert(
        "User created successfully! Note: The user will need to register with their email to set up their password.",
      );
    } catch (error) {
      console.error("Error creating user:", error);
      alert("Failed to create user. Please try again.");
    } finally {
      setUpdatingUserId(null);
    }
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === "all" || user.role === filterRole;
    const matchesStatus =
      filterStatus === "all" ||
      (filterStatus === "active" && user.isActive) ||
      (filterStatus === "inactive" && !user.isActive);

    return matchesSearch && matchesRole && matchesStatus;
  });

  const getRoleIcon = (role) => {
    return role === "admin" ? Crown : User;
  };

  const getRoleBadgeColor = (role) => {
    return role === "admin"
      ? "bg-purple-50 text-purple-700 border-purple-200"
      : "bg-blue-50 text-blue-700 border-blue-200";
  };

  const getStatusBadgeColor = (user) => {
    if (!user.isApproved) {
      return "bg-amber-50 text-amber-700 border-amber-200";
    }
    return user.isActive
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : "bg-red-50 text-red-700 border-red-200";
  };

  const getStatusIcon = (user) => {
    if (!user.isApproved) {
      return Clock;
    }
    return user.isActive ? UserCheck : UserX;
  };

  const getStatusText = (user) => {
    if (!user.isApproved) {
      return "Pending";
    }
    return user.isActive ? "Active" : "Inactive";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-900"></div>
        <span className="ml-2 text-surface-600">Loading users...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-surface-900">
            User Management
          </h2>
          <p className="text-surface-500 mt-1">Manage users and their roles</p>
        </div>
        <div className="flex items-center gap-3">
          {pendingUsers.length > 0 && (
            <button
              onClick={() => setShowPendingUsers(!showPendingUsers)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-amber-700 bg-amber-100 border border-amber-300 rounded-lg hover:bg-amber-200"
            >
              <Clock className="w-4 h-4" />
              {pendingUsers.length} Pending
            </button>
          )}
          <button
            onClick={() => setShowAddUser(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-brand-900 border border-brand-900 rounded-lg hover:bg-brand-800"
          >
            <Plus className="w-4 h-4" />
            Add User
          </button>
          <button
            onClick={() => {
              loadUsers();
              loadPendingUsers();
            }}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-surface-700 bg-white border border-surface-300 rounded-lg hover:bg-surface-50"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow p-4 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-surface-400" />
              <input
                type="text"
                placeholder="Search users by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-surface-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-surface-700 bg-white border border-surface-300 rounded-lg hover:bg-surface-50"
          >
            <Filter className="w-4 h-4" />
            Filters
            <ChevronDown
              className={`w-4 h-4 transform transition-transform ${showFilters ? "rotate-180" : ""}`}
            />
          </button>
        </div>

        {/* Filter Options */}
        {showFilters && (
          <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-surface-200">
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">
                Role
              </label>
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="w-full px-3 py-2 border border-surface-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              >
                <option value="all">All Roles</option>
                <option value="admin">Admin</option>
                <option value="user">User</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">
                Status
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 border border-surface-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Pending Users Section */}
      {showPendingUsers && pendingUsers.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-amber-900">
              Pending User Approvals
            </h3>
            <button
              onClick={() => setShowPendingUsers(false)}
              className="p-1 text-amber-600 hover:text-amber-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="space-y-3">
            {pendingUsers.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between bg-white p-3 rounded-lg border border-amber-200"
              >
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
                    <Clock className="w-4 h-4 text-amber-600" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-surface-900">
                      {user.name}
                    </p>
                    <p className="text-xs text-surface-500">{user.email}</p>
                    <p className="text-xs text-surface-400">
                      Registered:{" "}
                      {user.createdAt?.toDate
                        ? user.createdAt.toDate().toLocaleDateString()
                        : "Unknown"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-1 bg-amber-100 text-amber-800 rounded-full">
                    {user.role}
                  </span>
                  <button
                    onClick={() => handleApproveUser(user.id)}
                    disabled={updatingUserId === user.id}
                    className="flex items-center gap-1 px-3 py-1 text-xs font-medium text-white bg-emerald-600 border border-emerald-600 rounded hover:bg-emerald-700 disabled:opacity-50"
                  >
                    <Check className="w-3 h-3" />
                    {updatingUserId === user.id ? "Approving..." : "Approve"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Users List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-surface-200">
            <thead className="bg-surface-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">
                  Joined
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-surface-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-surface-200">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td
                    colSpan="5"
                    className="px-6 py-12 text-center text-surface-500"
                  >
                    <Users className="w-12 h-12 text-surface-300 mx-auto mb-4" />
                    <p className="text-lg font-medium">No users found</p>
                    <p className="text-sm mt-1">
                      Try adjusting your search or filters
                    </p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const RoleIcon = getRoleIcon(user.role);
                  const StatusIcon = getStatusIcon(user);
                  const isCurrentUser = user.id === currentUser.uid;

                  return (
                    <tr key={user.id} className="hover:bg-surface-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-brand-100 rounded-full flex items-center justify-center">
                            <User className="w-4 h-4 text-brand-600" />
                          </div>
                          <div className="ml-4">
                            {editingUserId === user.id ? (
                              <div className="space-y-2">
                                <input
                                  type="text"
                                  value={editForm.name}
                                  onChange={(e) =>
                                    setEditForm({
                                      ...editForm,
                                      name: e.target.value,
                                    })
                                  }
                                  className="block w-full px-2 py-1 text-sm border border-surface-300 rounded focus:outline-none focus:ring-1 focus:ring-brand-500"
                                  placeholder="Name"
                                />
                                <input
                                  type="email"
                                  value={editForm.email}
                                  onChange={(e) =>
                                    setEditForm({
                                      ...editForm,
                                      email: e.target.value,
                                    })
                                  }
                                  className="block w-full px-2 py-1 text-sm border border-surface-300 rounded focus:outline-none focus:ring-1 focus:ring-brand-500"
                                  placeholder="Email"
                                />
                              </div>
                            ) : (
                              <>
                                <div className="text-sm font-medium text-surface-900">
                                  {user.name}
                                  {isCurrentUser && (
                                    <span className="ml-2 text-xs text-surface-500">
                                      (You)
                                    </span>
                                  )}
                                </div>
                                <div className="text-sm text-surface-500">
                                  {user.email}
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full border ${getRoleBadgeColor(user.role)}`}
                        >
                          <RoleIcon className="w-3 h-3" />
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full border ${getStatusBadgeColor(user)}`}
                        >
                          <StatusIcon className="w-3 h-3" />
                          {getStatusText(user)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-surface-500">
                        {user.createdAt?.toDate
                          ? user.createdAt.toDate().toLocaleDateString()
                          : "Unknown"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          {editingUserId === user.id ? (
                            <>
                              {/* Save/Cancel buttons */}
                              <button
                                onClick={() => handleSaveEdit(user.id)}
                                disabled={updatingUserId === user.id}
                                className="p-1 text-emerald-600 hover:text-emerald-800 disabled:opacity-50"
                                title="Save"
                              >
                                <Save className="w-4 h-4" />
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                disabled={updatingUserId === user.id}
                                className="p-1 text-surface-400 hover:text-surface-600 disabled:opacity-50"
                                title="Cancel"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              {/* Edit button */}
                              <button
                                onClick={() => handleEditUser(user)}
                                disabled={updatingUserId === user.id}
                                className="p-1 text-blue-600 hover:text-blue-800 disabled:opacity-50"
                                title="Edit user"
                              >
                                <Edit className="w-4 h-4" />
                              </button>

                              {/* Role Toggle */}
                              {!isCurrentUser && (
                                <select
                                  value={user.role}
                                  onChange={(e) =>
                                    handleRoleChange(user.id, e.target.value)
                                  }
                                  disabled={updatingUserId === user.id}
                                  className="text-xs px-2 py-1 border border-surface-300 rounded focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:opacity-50"
                                >
                                  <option value="user">User</option>
                                  <option value="admin">Admin</option>
                                </select>
                              )}

                              {/* Status Toggle */}
                              {!isCurrentUser && user.isApproved && (
                                <button
                                  onClick={() =>
                                    handleStatusChange(user.id, !user.isActive)
                                  }
                                  disabled={updatingUserId === user.id}
                                  className="p-1 text-surface-400 hover:text-surface-600 disabled:opacity-50"
                                  title={
                                    user.isActive ? "Deactivate" : "Activate"
                                  }
                                >
                                  {user.isActive ? (
                                    <ToggleRight className="w-5 h-5 text-emerald-600" />
                                  ) : (
                                    <ToggleLeft className="w-5 h-5 text-red-600" />
                                  )}
                                </button>
                              )}

                              {/* Delete button */}
                              {!isCurrentUser && (
                                <button
                                  onClick={() => setShowDeleteConfirm(user.id)}
                                  disabled={updatingUserId === user.id}
                                  className="p-1 text-red-600 hover:text-red-800 disabled:opacity-50"
                                  title="Delete user"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <Users className="w-4 h-4 text-blue-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-surface-500">
                Total Users
              </p>
              <p className="text-lg font-semibold text-surface-900">
                {users.length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
              <Shield className="w-4 h-4 text-purple-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-surface-500">Admins</p>
              <p className="text-lg font-semibold text-surface-900">
                {users.filter((u) => u.role === "admin").length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
              <UserCheck className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-surface-500">Active</p>
              <p className="text-lg font-semibold text-surface-900">
                {users.filter((u) => u.isActive).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Add User Modal */}
      {showAddUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-brand-100 rounded-full flex items-center justify-center mr-3">
                  <Plus className="w-5 h-5 text-brand-600" />
                </div>
                <h3 className="text-lg font-semibold text-surface-900">
                  Add New User
                </h3>
              </div>
              <button
                onClick={() => setShowAddUser(false)}
                className="p-1 text-surface-400 hover:text-surface-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={newUserForm.name}
                  onChange={(e) =>
                    setNewUserForm({ ...newUserForm, name: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-surface-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  placeholder="Enter user's full name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={newUserForm.email}
                  onChange={(e) =>
                    setNewUserForm({ ...newUserForm, email: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-surface-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  placeholder="Enter user's email address"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1">
                  Role
                </label>
                <select
                  value={newUserForm.role}
                  onChange={(e) =>
                    setNewUserForm({ ...newUserForm, role: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-surface-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>

            <div className="mt-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> After creating the user, they will need
                to register with their email address to set up their password
                and access the system.
              </p>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowAddUser(false);
                  setNewUserForm({ name: "", email: "", role: "user" });
                }}
                className="px-4 py-2 text-sm font-medium text-surface-700 bg-surface-100 border border-surface-300 rounded-lg hover:bg-surface-200"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateUser}
                disabled={
                  updatingUserId === "creating" ||
                  !newUserForm.name ||
                  !newUserForm.email
                }
                className="px-4 py-2 text-sm font-medium text-white bg-brand-900 border border-brand-900 rounded-lg hover:bg-brand-800 disabled:opacity-50"
              >
                {updatingUserId === "creating" ? "Creating..." : "Create User"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mr-3">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-surface-900">
                Delete User
              </h3>
            </div>

            <p className="text-surface-600 mb-6">
              Are you sure you want to delete this user? This action cannot be
              undone.
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 text-sm font-medium text-surface-700 bg-surface-100 border border-surface-300 rounded-lg hover:bg-surface-200"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteUser(showDeleteConfirm)}
                disabled={updatingUserId === showDeleteConfirm}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {updatingUserId === showDeleteConfirm
                  ? "Deleting..."
                  : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
