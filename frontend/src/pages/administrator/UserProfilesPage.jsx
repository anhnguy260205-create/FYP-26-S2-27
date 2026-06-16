import { useState } from "react";
import { Eye, Edit, Ban, Search, ArrowLeft, Trash2 } from "lucide-react";
import AdminPage from "../../layout/AdminPage.jsx";

const profiles = [
  {
    profile_type: "Expert",
    access_level: "Limited Access",
    status: "Active",
    description:
      "Can provide investment guidance, manage advice articles, and support investors.",
  },
  {
    profile_type: "Investor",
    access_level: "Basic Access",
    status: "Active",
    description:
      "Can view stock information, manage watchlist, and access investment services.",
  },
];

function UserProfilesPage() {
  const [keyword, setKeyword] = useState("");
  const [selectedProfile, setSelectedProfile] = useState(null);

  const filteredProfiles = profiles.filter((profile) =>
    profile.profile_type.toLowerCase().includes(keyword.toLowerCase())
  );

  const handleSuspendProfile = async (role) => {
    if (!window.confirm(`Suspend all ${role} accounts?`)) return;

    const res = await fetch(
      `http://127.0.0.1:8000/admin/profiles/${role}/suspend`,
      { method: "PUT" }
    );

    const data = await res.json();
    alert(data.message || "Done");
  };

  const handleDeleteProfile = async (role) => {
    if (!window.confirm(`Delete all ${role} accounts?`)) return;

    const res = await fetch(
      `http://127.0.0.1:8000/admin/profiles/${role}`,
      { method: "DELETE" }
    );

    const data = await res.json();
    alert(data.message || "Done");
  };

  if (selectedProfile) {
    return (
      <AdminPage
        title="Profile Details"
        subtitle="View detailed information about user profile type"
      >
        <button
          onClick={() => setSelectedProfile(null)}
          className="mb-6 bg-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2"
        >
          <ArrowLeft size={16} /> Back to User Profiles
        </button>

        <div className="bg-white rounded-lg p-8 max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold">
              {selectedProfile.profile_type}
            </h1>

            <span className="bg-green-100 text-green-600 px-3 py-1 rounded text-xs font-semibold">
              {selectedProfile.status}
            </span>
          </div>

          <hr className="mb-8" />

          <div className="grid grid-cols-2 gap-10 mb-8">
            <div>
              <p className="text-xs font-bold text-slate-400 mb-2">
                PROFILE TYPE
              </p>
              <p className="text-lg">{selectedProfile.profile_type}</p>
            </div>

            <div>
              <p className="text-xs font-bold text-slate-400 mb-2">
                ACCESS LEVEL
              </p>
              <span className="bg-purple-100 text-purple-600 px-2 py-1 rounded text-xs font-semibold">
                {selectedProfile.access_level}
              </span>
            </div>

            <div>
              <p className="text-xs font-bold text-slate-400 mb-2">
                STATUS
              </p>
              <p className="text-lg">{selectedProfile.status}</p>
            </div>
          </div>

          <div>
            <p className="text-xs font-bold text-slate-400 mb-2">
              DESCRIPTION
            </p>
            <p className="text-slate-600 text-lg leading-relaxed">
              {selectedProfile.description}
            </p>
          </div>
        </div>
      </AdminPage>
    );
  }

  return (
    <AdminPage title="User Profiles" subtitle="View and manage user profile types">
      <div className="bg-white rounded-lg p-6 mb-6">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-3 top-3 text-slate-400" />
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Search by profile type, access level or description..."
              className="w-full border rounded-lg pl-10 pr-4 py-3 text-sm"
            />
          </div>

          <button className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-semibold">
            Search
          </button>
        </div>

        <p className="text-sm text-slate-600 mt-4">
          Showing {filteredProfiles.length} profile type(s)
        </p>
      </div>

      <div className="space-y-5">
        {filteredProfiles.map((profile) => (
          <div key={profile.profile_type} className="bg-white rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <h3 className="font-bold text-lg">{profile.profile_type}</h3>
              <span className="bg-green-100 text-green-600 px-2 py-1 rounded text-xs font-semibold">
                {profile.status}
              </span>
            </div>

            <p className="text-slate-600 mb-4">{profile.description}</p>

            <div className="flex gap-3">
              <button
                onClick={() => setSelectedProfile(profile)}
                className="flex items-center gap-1 border border-blue-500 text-blue-600 px-3 py-2 rounded text-sm"
              >
                <Eye size={14} /> View
              </button>

              <button className="flex items-center gap-1 border border-orange-500 text-orange-600 px-3 py-2 rounded text-sm">
                <Edit size={14} /> Update
              </button>

              <button
                onClick={() => handleSuspendProfile(profile.profile_type)}
                className="flex items-center gap-1 bg-red-600 text-white px-3 py-2 rounded text-sm"
              >
                <Ban size={14} /> Suspend
              </button>

              <button
                onClick={() => handleDeleteProfile(profile.profile_type)}
                className="flex items-center gap-1 bg-red-700 text-white px-3 py-2 rounded text-sm"
              >
                <Trash2 size={14} /> Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </AdminPage>
  );
}

export default UserProfilesPage;