import React, { useState, useEffect } from "react";
import { getAllVersions, COMMERCIAL_VERSIONS_COLLECTION, VERSIONS_COLLECTION } from "../services/versionService";
import {
  History,
  Calendar,
  User,
  FileText,
  Plus,
  Edit,
  Trash2,
  Search,
  Filter,
  ChevronDown,
  RefreshCw,
  ArrowRight,
} from "lucide-react";
import { Timestamp } from "firebase/firestore";

export default function VersionHistory({ propertyType = "residential" }) {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterAction, setFilterAction] = useState("all");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadVersions();
  }, [propertyType]);

  const loadVersions = async () => {
    try {
      setLoading(true);
      const versionsCol = propertyType === "commercial"
        ? COMMERCIAL_VERSIONS_COLLECTION
        : VERSIONS_COLLECTION;
      const versionList = await getAllVersions(versionsCol);
      setVersions(versionList);
    } catch (error) {
      console.error("Error loading versions:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return "Unknown";

    // Handle Firebase Timestamp
    if (timestamp instanceof Timestamp) {
      return timestamp.toDate().toLocaleString();
    }

    // Handle JavaScript Date
    if (timestamp instanceof Date) {
      return timestamp.toLocaleString();
    }

    // Handle Firestore timestamp with toDate method
    if (timestamp.toDate && typeof timestamp.toDate === "function") {
      return timestamp.toDate().toLocaleString();
    }

    // Handle string or number timestamps
    const date = new Date(timestamp);
    if (!isNaN(date.getTime())) {
      return date.toLocaleString();
    }

    return "Unknown";
  };

  const filteredVersions = versions.filter((version) => {
    const matchesSearch =
      version.userInfo?.name
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      version.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      version.projectId?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAction =
      filterAction === "all" || version.action === filterAction;

    return matchesSearch && matchesAction;
  });

  const getActionIcon = (action) => {
    switch (action) {
      case "create":
        return Plus;
      case "update":
        return Edit;
      case "delete":
        return Trash2;
      default:
        return FileText;
    }
  };

  const getActionColor = (action) => {
    switch (action) {
      case "create":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "update":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "delete":
        return "bg-red-50 text-red-700 border-red-200";
      default:
        return "bg-surface-50 text-surface-700 border-surface-200";
    }
  };

  const formatChanges = (changes) => {
    if (!changes) return "No details available";

    if (changes.before && changes.after) {
      // Update action
      const changedFields = Object.keys(changes);
      return (
        <div className="space-y-2">
          {changedFields.map((field) => {
            // Skip complex nested objects and timestamps for cleaner display
            if (
              field === "updatedAt" ||
              field === "createdAt" ||
              (typeof changes.before[field] === "object" &&
                changes.before[field] !== null) ||
              (typeof changes.after[field] === "object" &&
                changes.after[field] !== null)
            ) {
              return null;
            }

            const beforeValue = changes.before[field];
            const afterValue = changes.after[field];

            // Skip if values are the same
            if (JSON.stringify(beforeValue) === JSON.stringify(afterValue)) {
              return null;
            }

            return (
              <div key={field} className="text-sm">
                <span className="font-medium text-surface-700 capitalize">
                  {field.replace(/([A-Z])/g, " $1").trim()}:
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-surface-500 line-through max-w-xs truncate">
                    {beforeValue !== undefined && beforeValue !== null
                      ? String(beforeValue)
                      : "Empty"}
                  </span>
                  <ArrowRight className="w-3 h-3 text-surface-400 flex-shrink-0" />
                  <span className="text-surface-900 max-w-xs truncate">
                    {afterValue !== undefined && afterValue !== null
                      ? String(afterValue)
                      : "Empty"}
                  </span>
                </div>
              </div>
            );
          })}
          {/* Show summary of complex changes */}
          {changedFields.some(
            (field) =>
              field === "files" ||
              field === "updatedAt" ||
              (typeof changes.before[field] === "object" &&
                changes.before[field] !== null) ||
              (typeof changes.after[field] === "object" &&
                changes.after[field] !== null),
          ) && (
            <div className="text-sm text-surface-500 italic">
              Additional changes made to files, timestamps, and other complex
              data
            </div>
          )}
        </div>
      );
    } else if (changes.after) {
      // Create action - show key fields only
      const keyFields = [
        "projectName",
        "proposalNumber",
        "acres",
        "projectConsistsOf",
      ];
      const displayFields = {};

      keyFields.forEach((field) => {
        if (
          changes.after[field] !== undefined &&
          changes.after[field] !== null
        ) {
          displayFields[field] = changes.after[field];
        }
      });

      return (
        <div className="text-sm">
          <span className="font-medium text-surface-700">Created:</span>
          <div className="mt-1 text-surface-900 space-y-1">
            {Object.keys(displayFields).map((field) => (
              <div key={field}>
                <span className="font-medium capitalize">
                  {field.replace(/([A-Z])/g, " $1").trim()}:
                </span>{" "}
                {String(displayFields[field])}
              </div>
            ))}
            {Object.keys(changes.after).length > keyFields.length && (
              <div className="text-surface-500 text-xs">
                +{Object.keys(changes.after).length - keyFields.length} more
                fields
              </div>
            )}
          </div>
        </div>
      );
    } else if (changes.before) {
      // Delete action - show project name if available
      const projectName = changes.before.projectName || "Unknown Project";
      return (
        <div className="text-sm">
          <span className="font-medium text-surface-700">Deleted:</span>
          <div className="mt-1 text-surface-900">
            Project: {String(projectName)}
          </div>
        </div>
      );
    }

    return <div className="text-sm text-surface-600">Changes recorded</div>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-900"></div>
        <span className="ml-2 text-surface-600">
          Loading version history...
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-surface-900">
            Version History
          </h2>
          <p className="text-surface-500 mt-1">
            View all project changes and modifications
          </p>
        </div>
        <button
          onClick={loadVersions}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-surface-700 bg-white border border-surface-300 rounded-lg hover:bg-surface-50"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
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
                placeholder="Search by user, description, or project ID..."
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
          <div className="pt-4 border-t border-surface-200">
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">
                Action Type
              </label>
              <select
                value={filterAction}
                onChange={(e) => setFilterAction(e.target.value)}
                className="w-full px-3 py-2 border border-surface-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              >
                <option value="all">All Actions</option>
                <option value="create">Create</option>
                <option value="update">Update</option>
                <option value="delete">Delete</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Versions List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-surface-200">
            <thead className="bg-surface-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">
                  Action
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">
                  Project
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">
                  Changes
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-surface-200">
              {filteredVersions.length === 0 ? (
                <tr>
                  <td
                    colSpan="6"
                    className="px-6 py-12 text-center text-surface-500"
                  >
                    <History className="w-12 h-12 text-surface-300 mx-auto mb-4" />
                    <p className="text-lg font-medium">
                      No version history found
                    </p>
                    <p className="text-sm mt-1">
                      Try adjusting your search or filters
                    </p>
                  </td>
                </tr>
              ) : (
                filteredVersions.map((version) => {
                  const ActionIcon = getActionIcon(version.action);

                  return (
                    <tr key={version.id} className="hover:bg-surface-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full border ${getActionColor(version.action)}`}
                        >
                          <ActionIcon className="w-3 h-3" />
                          {version.action}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-surface-900 max-w-xs truncate">
                          {version.description}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-6 h-6 bg-surface-100 rounded-full flex items-center justify-center">
                            <User className="w-3 h-3 text-surface-600" />
                          </div>
                          <div className="ml-2">
                            <div className="text-sm text-surface-900">
                              {version.userInfo?.name || "Unknown"}
                            </div>
                            <div className="text-xs text-surface-500">
                              {version.userInfo?.email || "No email"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm">
                          <div className="text-surface-900 font-medium">
                            {version.description?.split(":")[0] ||
                              "Unknown Project"}
                          </div>
                          <div className="text-surface-500 text-xs font-mono">
                            ID: {version.projectId?.slice(0, 8)}...
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-surface-500">
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 mr-1" />
                          {formatTimestamp(version.timestamp)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="max-w-xs">
                          {formatChanges(version.changes)}
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
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-surface-100 rounded-full flex items-center justify-center">
              <History className="w-4 h-4 text-surface-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-surface-500">
                Total Changes
              </p>
              <p className="text-lg font-semibold text-surface-900">
                {versions.length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
              <Plus className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-surface-500">Created</p>
              <p className="text-lg font-semibold text-surface-900">
                {versions.filter((v) => v.action === "create").length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <Edit className="w-4 h-4 text-blue-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-surface-500">Updated</p>
              <p className="text-lg font-semibold text-surface-900">
                {versions.filter((v) => v.action === "update").length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
              <Trash2 className="w-4 h-4 text-red-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-surface-500">Deleted</p>
              <p className="text-lg font-semibold text-surface-900">
                {versions.filter((v) => v.action === "delete").length}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
